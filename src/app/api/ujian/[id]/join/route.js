/**
 * Exam Join API
 * POST /api/ujian/[id]/join - Student joins exam (creates session)
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

export async function POST(request, { params }) {
  try {
    const user = await requireRole(request, 'siswa');
    const { id } = await params;
    const db = getDB();

    const ujian = await db.getOne('SELECT * FROM ujian WHERE id = ?', [id]);
    if (!ujian) {
      return apiError('Ujian tidak ditemukan', 404);
    }

    // Verify teacher ownership
    let studentGuruId = user.guru_id;
    let studentKelas = user.kelas;
    if (!studentGuruId || !studentKelas) {
      try {
        const studentProfile = await db.getOne('SELECT guru_id, kelas FROM users WHERE id = ?', [user.id]);
        if (studentProfile) {
          studentGuruId = studentGuruId || studentProfile.guru_id || 'usr_guru_001';
          studentKelas = studentKelas || studentProfile.kelas;
        }
      } catch {}
    }

    if (studentGuruId && ujian.guru_id && ujian.guru_id !== studentGuruId && !(studentGuruId === 'usr_guru_001' && !ujian.guru_id)) {
      return apiError('Anda tidak memiliki izin mengikuti ujian dari guru lain.', 403);
    }

    if (studentKelas && ujian.kelas_target && ujian.kelas_target !== 'Semua Kelas' && ujian.kelas_target !== '*') {
      if (ujian.kelas_target.trim().toUpperCase() !== studentKelas.trim().toUpperCase()) {
        return apiError(`Ujian ini dikhususkan untuk kelas ${ujian.kelas_target}.`, 403);
      }
    }

    if (ujian.status !== 'aktif') {
      return apiError('Ujian tidak aktif', 403);
    }

    const now = new Date().toISOString();
    if (now < ujian.jadwal_mulai) {
      return apiError('Ujian belum dimulai', 403);
    }
    if (now > ujian.jadwal_selesai) {
      return apiError('Ujian sudah berakhir', 403);
    }

    // Check if session already exists
    let sesi = await db.getOne(
      'SELECT * FROM sesi_ujian WHERE ujian_id = ? AND siswa_id = ?',
      [id, user.id]
    );

    if (sesi) {
      if (sesi.status === 'selesai') {
        return apiError('Anda sudah menyelesaikan ujian ini', 403);
      }
      // Return existing session (resume)
      return apiResponse({ sesi, resumed: true });
    }

    // Create new session
    const sesiId = generateId('sesi');
    await db.run(
      `INSERT INTO sesi_ujian (id, ujian_id, siswa_id, waktu_mulai, status)
       VALUES (?, ?, ?, datetime('now'), 'berlangsung')`,
      [sesiId, id, user.id]
    );

    sesi = await db.getOne('SELECT * FROM sesi_ujian WHERE id = ?', [sesiId]);
    return apiResponse({ sesi, resumed: false }, 201);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Join exam error:', error);
    return apiError('Gagal bergabung ke ujian', 500);
  }
}
