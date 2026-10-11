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
      `SELECT id, judul, mata_pelajaran, kelas_target, durasi_menit, jadwal_mulai, jadwal_selesai, jumlah_soal, status, batas_pelanggaran, deskripsi
       FROM ujian WHERE kode_ujian = ?`,
      [kode_ujian.trim().toUpperCase()]
    );

    if (!ujian) {
      return apiError('Kode ujian tidak ditemukan', 404);
    }

    if (ujian.status !== 'aktif') {
      return apiError('Ujian belum aktif atau sudah selesai', 403);
    }

    const now = new Date().toISOString();
    if (now < ujian.jadwal_mulai) {
      return apiError(`Ujian belum dimulai. Jadwal: ${ujian.jadwal_mulai}`, 403);
    }
    if (now > ujian.jadwal_selesai) {
      return apiError('Ujian sudah berakhir', 403);
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
