/**
 * Ujian Detail API
 * GET /api/ujian/[id] - Get exam details with questions
 */

import { getDB } from '@/lib/db';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, shuffleQuestionsByType, orderQuestionsByType, parseWaktuWIB } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const db = getDB();

    // Ensure urutan_soal column exists in sesi_ujian
    try {
      await db.run('ALTER TABLE sesi_ujian ADD COLUMN urutan_soal TEXT');
    } catch (_) {}

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
      let studentKelas = user.kelas;
      if (!studentKelas) {
        try {
          const studentProfile = await db.getOne('SELECT kelas FROM users WHERE id = ?', [user.id]);
          if (studentProfile) {
            studentKelas = studentProfile.kelas;
          }
        } catch {}
      }

      if (studentKelas && ujian.kelas_target && ujian.kelas_target !== 'Semua Kelas' && ujian.kelas_target !== '*') {
        const cleanTarget = ujian.kelas_target.trim().toUpperCase();
        const cleanStudent = studentKelas.trim().toUpperCase();
        const stripTarget = cleanTarget.replace(/^KELAS\s*/i, '');
        const stripStudent = cleanStudent.replace(/^KELAS\s*/i, '');
        if (cleanTarget !== cleanStudent && stripTarget !== stripStudent) {
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

      // Get student session first to check if a persistent question order exists
      let sesi = await db.getOne(
        'SELECT * FROM sesi_ujian WHERE ujian_id = ? AND siswa_id = ?',
        [id, user.id]
      );

      let isOrdered = false;
      if (sesi && sesi.urutan_soal) {
        try {
          const idOrder = JSON.parse(sesi.urutan_soal);
          if (Array.isArray(idOrder) && idOrder.length > 0) {
            const map = new Map(soalList.map(s => [s.id, s]));
            const reordered = [];
            for (const qId of idOrder) {
              if (map.has(qId)) {
                reordered.push(map.get(qId));
                map.delete(qId);
              }
            }
            if (map.size > 0) {
              const remaining = orderQuestionsByType(Array.from(map.values()));
              reordered.push(...remaining);
            }
            soalList = reordered;
            isOrdered = true;
          }
        } catch (err) {
          console.warn('Failed to parse sesi.urutan_soal:', err.message);
        }
      }

      // If not yet ordered from session:
      if (!isOrdered) {
        const isAcak = ujian.acak_soal == 1 || ujian.acak_soal === true || ujian.acak_soal === '1';
        if (isAcak) {
          // Shuffle strictly grouped by type: PG at top, Uraian at bottom.
          // Seed is deterministic for this student and exam, so every refresh produces identical order.
          const seed = `${user.id}_${id}_${sesi?.id || 'sesi'}`;
          soalList = shuffleQuestionsByType(soalList, seed);
        } else {
          // Standard type hierarchy: PG first, then Benar-Salah, Isian, and Uraian/Essay at the bottom
          soalList = orderQuestionsByType(soalList);
        }

        // Persist question order into session if session already created
        if (sesi?.id) {
          try {
            const idList = soalList.map(s => s.id);
            const idListJson = JSON.stringify(idList);
            await db.run('UPDATE sesi_ujian SET urutan_soal = ? WHERE id = ?', [idListJson, sesi.id]);
            sesi.urutan_soal = idListJson;
          } catch (saveErr) {
            console.warn('Failed to persist urutan_soal to sesi_ujian:', saveErr.message);
          }
        }
      }

      // Remove answer keys for students
      soalList = soalList.map(s => {
        const { kunci_jawaban, ...rest } = s;
        return rest;
      });

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
          mode_exambro: ujian.mode_exambro !== undefined ? ujian.mode_exambro : 1,
        },
        soal: soalList,
        sesi,
        jawaban: jawabanSiswa,
      });
    }

    // Guru gets full details with standard type hierarchy
    soalList = orderQuestionsByType(soalList);
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
