/**
 * Exam Code Lookup API
 * POST /api/ujian/kode - Find exam by code
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/utils';

export async function POST(request) {
  try {
    const user = await requireRole(request, 'siswa');
    const body = await request.json();
    const { kode_ujian } = body;

    if (!kode_ujian) {
      return apiError('Kode ujian wajib diisi', 400);
    }

    const db = getDB();
    const ujian = await db.getOne(
      `SELECT id, judul, mata_pelajaran, kelas_target, durasi_menit, jadwal_mulai, jadwal_selesai, jumlah_soal, status, batas_pelanggaran, deskripsi, guru_id
       FROM ujian WHERE kode_ujian = ?`,
      [kode_ujian.trim().toUpperCase()]
    );

    if (!ujian) {
      return apiError('Kode ujian tidak ditemukan. Periksa kembali 6 digit kode yang dibagikan guru Anda.', 404);
    }

    // Verify teacher ownership: the exam must belong to the student's teacher
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
      return apiError('Kode ruang ujian ini bukan milik guru pengampu Anda.', 403);
    }

    // Verify target class if specified
    if (studentKelas && ujian.kelas_target && ujian.kelas_target !== 'Semua Kelas' && ujian.kelas_target !== '*') {
      if (ujian.kelas_target.trim().toUpperCase() !== studentKelas.trim().toUpperCase()) {
        return apiError(`Ujian ini dikhususkan untuk kelas ${ujian.kelas_target}, sedangkan kelas Anda adalah ${studentKelas}.`, 403);
      }
    }

    if (ujian.status !== 'aktif') {
      return apiError('Ujian belum diaktifkan atau sudah ditutup oleh guru.', 403);
    }

    const now = new Date().toISOString();
    if (now < ujian.jadwal_mulai) {
      return apiError(`Ujian belum dimulai. Jadwal mulai: ${new Date(ujian.jadwal_mulai).toLocaleString('id-ID')}`, 403);
    }
    if (now > ujian.jadwal_selesai) {
      return apiError('Waktu ujian sudah berakhir.', 403);
    }

    // Check if student already has a session
    const sesi = await db.getOne(
      'SELECT * FROM sesi_ujian WHERE ujian_id = ? AND siswa_id = ?',
      [ujian.id, user.id]
    );

    return apiResponse({
      ujian,
      sesi_existing: sesi || null,
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Lookup exam code error:', error);
    return apiError('Gagal mencari ujian', 500);
  }
}
