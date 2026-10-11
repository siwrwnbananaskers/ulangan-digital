/**
 * Ujian Detail API
 * GET /api/ujian/[id] - Get exam details with questions
 */

import { getDB } from '@/lib/db';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, shuffleArray } from '@/lib/utils';

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const db = getDB();

    const ujian = await db.getOne('SELECT * FROM ujian WHERE id = ?', [id]);
    if (!ujian) {
      return apiError('Ujian tidak ditemukan', 404);
    }

    // Get questions
    let soalList = await db.getAll(
      `SELECT s.*, us.urutan FROM soal s
       JOIN ujian_soal us ON us.soal_id = s.id
       WHERE us.ujian_id = ?
       ORDER BY us.urutan ASC`,
      [id]
    );

    if (user.role === 'siswa') {
      // Check if exam is active and within schedule
      const now = new Date().toISOString();
      if (ujian.status !== 'aktif') {
        return apiError('Ujian belum aktif', 403);
      }
      if (now < ujian.jadwal_mulai) {
        return apiError('Ujian belum dimulai', 403);
      }
      if (now > ujian.jadwal_selesai) {
        return apiError('Ujian sudah berakhir', 403);
      }

      // Shuffle questions if enabled
      if (ujian.acak_soal) {
        soalList = shuffleArray(soalList);
      }

      // Remove answer keys for students
      soalList = soalList.map(s => {
        const { kunci_jawaban, ...rest } = s;
        return rest;
      });

      // Get or create session
      let sesi = await db.getOne(
        'SELECT * FROM sesi_ujian WHERE ujian_id = ? AND siswa_id = ?',
        [id, user.id]
      );

      // Get existing answers
      let jawabanSiswa = [];
      if (sesi) {
        jawabanSiswa = await db.getAll(
          'SELECT soal_id, jawaban_siswa FROM jawaban WHERE sesi_id = ?',
          [sesi.id]
        );
      }

      return apiResponse({
        ujian: {
          id: ujian.id,
          judul: ujian.judul,
          mata_pelajaran: ujian.mata_pelajaran,
          durasi_menit: ujian.durasi_menit,
          jumlah_soal: ujian.jumlah_soal,
          batas_pelanggaran: ujian.batas_pelanggaran,
          jadwal_selesai: ujian.jadwal_selesai,
        },
        soal: soalList,
        sesi,
        jawaban: jawabanSiswa,
      });
    }

    // Guru gets full details
    const peserta = await db.getAll(
      `SELECT su.*, u.nama, u.kelas, u.no_absen
       FROM sesi_ujian su
       JOIN users u ON u.id = su.siswa_id
       WHERE su.ujian_id = ?
       ORDER BY u.nama ASC`,
      [id]
    );

    return apiResponse({ ujian, soal: soalList, peserta });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Get ujian detail error:', error);
    return apiError('Gagal memuat detail ujian', 500);
  }
}
