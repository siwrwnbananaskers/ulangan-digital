/**
 * Superadmin API - Full Management
 * GET  /api/superadmin/guru - List all teachers with activity stats (exams created, questions, students)
 * POST /api/superadmin/guru - Create new official teacher account
 * DELETE /api/superadmin/guru - Delete/revoke teacher account
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse, sanitizeInput, hashPassword } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
          const examCount = await db.getOne('SELECT COUNT(*) as cnt FROM ujian WHERE guru_id = ? OR guru_id = ?', [u.id, u.username]);
          const questionCount = await db.getOne('SELECT COUNT(*) as cnt FROM soal WHERE guru_id = ? OR guru_id = ?', [u.id, u.username]);

          // 1. Hitung siswa yang didaftarkan langsung oleh guru ini (users.guru_id)
          const studentDirectRow = await db.getOne(
            "SELECT COUNT(*) as cnt FROM users WHERE role = 'siswa' AND (guru_id = ? OR guru_id = ?)",
            [u.id, u.username]
          );
          const studentDirect = studentDirectRow?.cnt || 0;

          // 2. Hitung siswa unik yang telah mengikuti/mengerjakan lembar ujian dari guru ini
          let studentTested = 0;
          try {
            const testedRow = await db.getOne(
              `SELECT COUNT(DISTINCT h.siswa_id) as cnt 
               FROM hasil_ujian h 
               JOIN ujian uj ON h.ujian_id = uj.id 
               WHERE uj.guru_id = ? OR uj.guru_id = ?`,
              [u.id, u.username]
            );
            studentTested = testedRow?.cnt || 0;
          } catch {}

          // 3. Fallback jika ada data siswa lama dengan guru_id NULL (misal akun demo guru atau author ujian aktif tunggal)
          let unassignedCount = 0;
          if (studentDirect === 0 && (u.username === 'guru' || (examCount?.cnt || 0) > 0)) {
            try {
              const unassignedRow = await db.getOne(
                "SELECT COUNT(*) as cnt FROM users WHERE role = 'siswa' AND (guru_id IS NULL OR guru_id = '' OR guru_id = 'NULL')"
              );
              unassignedCount = unassignedRow?.cnt || 0;
            } catch {}
          }

          const totalPeserta = Math.max(studentDirect, studentTested, unassignedCount);

          return {
            ...u,
            total_ujian: examCount?.cnt || 0,
            total_soal: questionCount?.cnt || 0,
            total_peserta_diuji: totalPeserta,
          };
        } catch (err) {
          console.warn('Teacher stats err:', err.message);
          return { ...u, total_ujian: 0, total_soal: 0, total_peserta_diuji: 0 };
        }
      })
    );

    // 3. Global system stats for superadmin overview
    let totalUjian = 0;
    let totalUjianAktif = 0;
    let totalSesiAktif = 0;
    let totalSoal = 0;
    let totalSiswa = 0;
    let totalPelanggaran = 0;

    try {
      totalUjian = (await db.getOne('SELECT COUNT(*) as cnt FROM ujian'))?.cnt || 0;
      totalUjianAktif = (await db.getOne("SELECT COUNT(*) as cnt FROM ujian WHERE status = 'aktif'"))?.cnt || 0;
      totalSesiAktif = (await db.getOne("SELECT COUNT(*) as cnt FROM hasil_ujian WHERE status = 'berlangsung'"))?.cnt || 0;
      totalSoal = (await db.getOne('SELECT COUNT(*) as cnt FROM soal'))?.cnt || 0;
      totalSiswa = (await db.getOne("SELECT COUNT(*) as cnt FROM users WHERE role = 'siswa'"))?.cnt || 0;
      totalPelanggaran = (await db.getOne('SELECT COUNT(*) as cnt FROM audit_log'))?.cnt || 0;
    } catch (cntErr) {
      console.warn('Count query warning:', cntErr.message);
    }

    const stats = {
      total_guru: teachers.length,
      total_ujian: totalUjian,
      total_ujian_aktif: totalUjianAktif,
      total_sesi_aktif: totalSesiAktif,
      total_soal: totalSoal,
      total_siswa: totalSiswa,
      total_sesi: totalSesiAktif,
      total_pelanggaran: totalPelanggaran,
    };

    // 4. Recent activities
    let recentExams = [];
    let recentLogs = [];
    try {
      const examsRaw = await db.getAll('SELECT id, judul, mata_pelajaran, status, created_at, guru_id FROM ujian ORDER BY created_at DESC LIMIT 5') || [];
      recentExams = await Promise.all(
        examsRaw.map(async (ex) => {
          try {
            const g = await db.getOne('SELECT nama FROM users WHERE id = ?', [ex.guru_id]);
            return { ...ex, nama_guru: g?.nama || 'Dewan Guru' };
          } catch {
            return { ...ex, nama_guru: 'Dewan Guru' };
          }
        })
      );
    } catch {}

    try {
      const logsRaw = await db.getAll('SELECT id, tipe_pelanggaran, detail, timestamp, siswa_id FROM audit_log ORDER BY timestamp DESC LIMIT 6') || [];
      recentLogs = await Promise.all(
        logsRaw.map(async (l) => {
          try {
            const s = await db.getOne('SELECT nama FROM users WHERE id = ?', [l.siswa_id]);
            return { ...l, nama_siswa: s?.nama || 'Siswa' };
          } catch {
            return { ...l, nama_siswa: 'Siswa' };
          }
        })
      );
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

export async function PUT(request) {
  try {
    await requireRole(request, 'superadmin');
    const body = await request.json();
    const { id, username, nama, password } = body;

    if (!id || !username || !nama) {
      return apiError('ID, Username, dan Nama Guru wajib diisi', 400);
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanNama = sanitizeInput(nama.trim());
    const db = getDB();

    const target = await db.getOne("SELECT id, role, username FROM users WHERE id = ? AND role = 'guru'", [id]);
    if (!target) {
      return apiError('Akun guru tidak ditemukan', 404);
    }

    // Check duplicate username on other accounts
    const duplicate = await db.getOne('SELECT id FROM users WHERE username = ? AND id != ?', [cleanUsername, id]);
    if (duplicate) {
      return apiError(`Username "${cleanUsername}" sudah digunakan oleh akun lain`, 409);
    }

    if (password && password.trim().length > 0) {
      const passwordHash = await hashPassword(password.trim());
      await db.run(
        'UPDATE users SET username = ?, nama = ?, password_hash = ? WHERE id = ?',
        [cleanUsername, cleanNama, passwordHash, id]
      );
    } else {
      await db.run(
        'UPDATE users SET username = ?, nama = ? WHERE id = ?',
        [cleanUsername, cleanNama, id]
      );
    }

    return apiResponse({
      success: true,
      message: `Akun guru "${cleanNama}" (${cleanUsername}) berhasil diperbarui!`,
      guru: {
        id,
        username: cleanUsername,
        nama: cleanNama,
      },
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Superadmin update guru error:', error);
    return apiError('Gagal memperbarui akun guru', 500);
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
