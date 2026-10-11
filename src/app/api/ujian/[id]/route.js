/**
 * Ujian Detail API
 * GET /api/ujian/[id] - Get exam details with questions
 */

import { getDB } from '@/lib/db';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, shuffleArray, parseWaktuWIB } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      `SELECT 
        s.id as id, s.guru_id as guru_id, s.mata_pelajaran as mata_pelajaran, s.tipe as tipe,
        s.pertanyaan as pertanyaan, s.pilihan_a as pilihan_a, s.pilihan_b as pilihan_b,
        s.pilihan_c as pilihan_c, s.pilihan_d as pilihan_d, s.pilihan_e as pilihan_e,
        s.kunci_jawaban as kunci_jawaban, s.bobot as bobot, s.created_at as created_at,
        us.urutan as urutan
       FROM soal s
       JOIN ujian_soal us ON us.soal_id = s.id
       WHERE us.ujian_id = ?
       ORDER BY us.urutan ASC`,
      [id]
    );

    if (user.role === 'siswa') {
      // Verify that this exam belongs to student's teacher
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
        return apiError('Anda tidak memiliki akses ke lembar ujian dari guru lain.', 403);
      }

      if (studentKelas && ujian.kelas_target && ujian.kelas_target !== 'Semua Kelas' && ujian.kelas_target !== '*') {
        if (ujian.kelas_target.trim().toUpperCase() !== studentKelas.trim().toUpperCase()) {
          return apiError(`Ujian ini diperuntukkan bagi kelas ${ujian.kelas_target}.`, 403);
        }
      }

      // Check if exam is active and within schedule
      const nowTime = Date.now();
      const mulaiTime = parseWaktuWIB(ujian.jadwal_mulai);
      const selesaiTime = parseWaktuWIB(ujian.jadwal_selesai);

      if (ujian.status !== 'aktif') {
        return apiError('Ujian belum aktif', 403);
      }
      if (!isNaN(mulaiTime) && nowTime < mulaiTime - 10 * 60 * 1000) {
        return apiError('Ujian belum dimulai', 403);
      }
      if (!isNaN(selesaiTime) && nowTime > selesaiTime) {
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
