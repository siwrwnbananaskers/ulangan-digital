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

    // Query all teachers with activity counters
    const teachers = await db.getAll(
      `SELECT u.id, u.username, u.nama, u.role, u.created_at,
        (SELECT COUNT(*) FROM ujian WHERE guru_id = u.id) as total_ujian,
        (SELECT COUNT(*) FROM soal WHERE guru_id = u.id) as total_soal,
        (SELECT COUNT(DISTINCT su.siswa_id) FROM sesi_ujian su JOIN ujian uj ON uj.id = su.ujian_id WHERE uj.guru_id = u.id) as total_peserta_diuji
       FROM users u
       WHERE u.role = 'guru'
       ORDER BY u.created_at DESC`
    );

    // Global system stats for superadmin overview
    const stats = {
      total_guru: teachers.length,
      total_ujian: (await db.getOne('SELECT COUNT(*) as cnt FROM ujian'))?.cnt || 0,
      total_soal: (await db.getOne('SELECT COUNT(*) as cnt FROM soal'))?.cnt || 0,
      total_siswa: (await db.getOne("SELECT COUNT(*) as cnt FROM users WHERE role = 'siswa'"))?.cnt || 0,
      total_sesi: (await db.getOne('SELECT COUNT(*) as cnt FROM sesi_ujian'))?.cnt || 0,
      total_pelanggaran: (await db.getOne('SELECT COUNT(*) as cnt FROM audit_log'))?.cnt || 0,
    };

    // Recent activities (recent exams & violation logs)
    const recentExams = await db.getAll(
      `SELECT u.id, u.judul, u.mata_pelajaran, u.status, u.created_at, g.nama as nama_guru
       FROM ujian u
       JOIN users g ON g.id = u.guru_id
       ORDER BY u.created_at DESC LIMIT 5`
    );

    const recentLogs = await db.getAll(
      `SELECT al.*, u.nama as nama_siswa
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.siswa_id
       ORDER BY al.timestamp DESC LIMIT 6`
    );

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
    return apiError('Gagal memuat data superadmin', 500);
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
