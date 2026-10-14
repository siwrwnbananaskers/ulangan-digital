/**
 * Exam Code Lookup API
 * POST /api/ujian/kode - Find exam by code
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, parseWaktuWIB } from '@/lib/utils';

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
      `SELECT id, judul, mata_pelajaran, kelas_target, durasi_menit, jadwal_mulai, jadwal_selesai, jumlah_soal, status, batas_pelanggaran, deskripsi, guru_id, mode_exambro
       FROM ujian WHERE kode_ujian = ?`,
      [kode_ujian.trim().toUpperCase()]
    );

    if (!ujian) {
      return apiError('Kode ujian tidak ditemukan. Periksa kembali 6 digit kode yang dibagikan guru Anda.', 404);
    }

    // Verify target class if specified
    let studentKelas = user.kelas;
    if (!studentKelas) {
      try {
        const studentProfile = await db.getOne('SELECT kelas FROM users WHERE id = ?', [user.id]);
        if (studentProfile) {
          studentKelas = studentProfile.kelas;
        }
      } catch {}
    }

    // Verify target class if specified
    if (studentKelas && ujian.kelas_target && ujian.kelas_target !== 'Semua Kelas' && ujian.kelas_target !== '*') {
      const cleanTarget = ujian.kelas_target.trim().toUpperCase();
      const cleanStudent = studentKelas.trim().toUpperCase();
      const stripTarget = cleanTarget.replace(/^KELAS\s*/i, '');
      const stripStudent = cleanStudent.replace(/^KELAS\s*/i, '');
      if (cleanTarget !== cleanStudent && stripTarget !== stripStudent) {
        return apiError(`Ujian ini dikhususkan untuk kelas ${ujian.kelas_target}, sedangkan kelas Anda adalah ${studentKelas}.`, 403);
      }
    }

    if (ujian.status !== 'aktif') {
      return apiError('Ujian belum diaktifkan atau sudah ditutup oleh guru.', 403);
    }

    // Parse schedule with timezone tolerance (give 10-minute buffer before scheduled time)
    const nowTime = Date.now();
    const mulaiTime = parseWaktuWIB(ujian.jadwal_mulai);
    const selesaiTime = parseWaktuWIB(ujian.jadwal_selesai);

    // If started within 10 minutes from now or already passed
    if (!isNaN(mulaiTime) && nowTime < mulaiTime - 10 * 60 * 1000) {
      return apiError(`Ujian belum dimulai. Jadwal mulai: ${new Date(mulaiTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`, 403);
    }
    if (!isNaN(selesaiTime) && nowTime > selesaiTime) {
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
