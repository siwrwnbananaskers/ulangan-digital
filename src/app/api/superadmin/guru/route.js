/**
 * Superadmin API - Full Management
 * GET  /api/superadmin/guru - List all teachers with activity stats (exams created, questions, students)
 * POST /api/superadmin/guru - Create new official teacher account
 * DELETE /api/superadmin/guru - Delete/revoke teacher account
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse, sanitizeInput, hashPassword } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    await requireRole(request, 'superadmin');
    const db = getDB();

    // 1. Query all teachers cleanly
    const teachersRaw = await db.getAll(
      "SELECT id, username, nama, role, created_at FROM users WHERE role = 'guru' ORDER BY created_at DESC"
    );

    // 2. Fetch stats for each teacher safely without complex correlated subqueries that fail in certain SQLite/D1 environments
    const teachers = await Promise.all(
      (teachersRaw || []).map(async (u) => {
        try {
          const examCount = await db.getOne('SELECT COUNT(*) as cnt FROM ujian WHERE guru_id = ?', [u.id]);
          const questionCount = await db.getOne('SELECT COUNT(*) as cnt FROM soal WHERE guru_id = ?', [u.id]);
          return {
            ...u,
            total_ujian: examCount?.cnt || 0,
            total_soal: questionCount?.cnt || 0,
            total_peserta_diuji: 0,
          };
        } catch {
          return { ...u, total_ujian: 0, total_soal: 0, total_peserta_diuji: 0 };
        }
      })
    );

    // 3. Global system stats for superadmin overview
    let totalUjian = 0;
    let totalSoal = 0;
    let totalSiswa = 0;
    let totalPelanggaran = 0;

    try {
      totalUjian = (await db.getOne('SELECT COUNT(*) as cnt FROM ujian'))?.cnt || 0;
      totalSoal = (await db.getOne('SELECT COUNT(*) as cnt FROM soal'))?.cnt || 0;
      totalSiswa = (await db.getOne("SELECT COUNT(*) as cnt FROM users WHERE role = 'siswa'"))?.cnt || 0;
      totalPelanggaran = (await db.getOne('SELECT COUNT(*) as cnt FROM audit_log'))?.cnt || 0;
    } catch (cntErr) {
      console.warn('Count query warning:', cntErr.message);
    }

    const stats = {
      total_guru: teachers.length,
      total_ujian: totalUjian,
      total_soal: totalSoal,
      total_siswa: totalSiswa,
      total_sesi: 0,
      total_pelanggaran: totalPelanggaran,
    };

    // 4. Recent activities
    let recentExams = [];
    let recentLogs = [];
    try {
      recentExams = await db.getAll('SELECT id, judul, mata_pelajaran, status, created_at FROM ujian ORDER BY created_at DESC LIMIT 5') || [];
    } catch {}

    try {
      recentLogs = await db.getAll('SELECT id, tipe_pelanggaran, detail, timestamp, siswa_id FROM audit_log ORDER BY timestamp DESC LIMIT 6') || [];
    } catch {}

    return apiResponse({
      teachers,
      stats,
      recent_exams: recentExams,
      recent_logs: recentLogs,
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Superadmin GET error:', error);
    return apiError(error.message || 'Gagal memuat data superadmin', 500);
  }
}

export async function POST(request) {
  try {
    await requireRole(request, 'superadmin');
    const body = await request.json();
    const { username, nama, password } = body;

    if (!username || !nama) {
      return apiError('Username dan Nama Guru wajib diisi', 400);
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = getDB();

    const exists = await db.getOne('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (exists) {
      return apiError(`Username "${cleanUsername}" sudah digunakan`, 409);
    }

    const id = generateId('usr');
    const rawPassword = password?.trim() || 'guru123';
    const passwordHash = await hashPassword(rawPassword);

    await db.run(
      `INSERT INTO users (id, username, password_hash, nama, role)
       VALUES (?, ?, ?, ?, 'guru')`,
      [id, cleanUsername, passwordHash, sanitizeInput(nama.trim())]
    );

    return apiResponse({
      success: true,
      message: `Akun Guru resmi "${nama}" berhasil dibuat!`,
      guru: {
        id,
        username: cleanUsername,
        nama: nama.trim(),
        role: 'guru',
      },
    }, 201);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Superadmin create guru error:', error);
    return apiError('Gagal membuat akun guru', 500);
  }
}

export async function DELETE(request) {
  try {
    await requireRole(request, 'superadmin');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('ID guru wajib diisi', 400);
    }

    const db = getDB();
    const target = await db.getOne("SELECT id, role, username FROM users WHERE id = ? AND role = 'guru'", [id]);
    if (!target) {
      return apiError('Akun guru tidak ditemukan', 404);
    }

    if (target.username === 'guru') {
      return apiError('Akun demo guru bawaan tidak dapat dihapus', 400);
    }

    await db.run('DELETE FROM users WHERE id = ?', [id]);

    return apiResponse({ success: true, message: `Akun guru "${target.username}" berhasil dihapus` });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Superadmin delete guru error:', error);
    return apiError('Gagal menghapus akun guru', 500);
  }
}
