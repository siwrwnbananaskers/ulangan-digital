/**
 * Submit Exam API
 * POST /api/ujian/[id]/submit - Submit exam answers and calculate score
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

export async function POST(request, { params }) {
  try {
    const user = await requireRole(request, 'siswa');
    const { id } = await params;
    const body = await request.json();
    const { sesi_id, jawaban, force } = body;

    if (!sesi_id) {
      return apiError('Sesi ID wajib diisi', 400);
    }

    const db = getDB();

    // Verify session
    const sesi = await db.getOne(
      'SELECT * FROM sesi_ujian WHERE id = ? AND siswa_id = ? AND ujian_id = ?',
      [sesi_id, user.id, id]
    );

    if (!sesi) {
      return apiError('Sesi ujian tidak ditemukan', 404);
    }

    if (sesi.status === 'selesai' && !force) {
      return apiError('Ujian sudah dikumpulkan', 403);
    }

    // Save final answers
    if (jawaban && Array.isArray(jawaban)) {
      for (const j of jawaban) {
        if (!j.soal_id) continue;

        const existing = await db.getOne(
          'SELECT id FROM jawaban WHERE sesi_id = ? AND soal_id = ?',
          [sesi_id, j.soal_id]
        );

        if (existing) {
          await db.run(
            `UPDATE jawaban SET jawaban_siswa = ?, updated_at = datetime('now') WHERE id = ?`,
            [j.jawaban_siswa || '', existing.id]
          );
        } else {
          await db.run(
            'INSERT INTO jawaban (id, sesi_id, soal_id, jawaban_siswa) VALUES (?, ?, ?, ?)',
            [generateId('jwb'), sesi_id, j.soal_id, j.jawaban_siswa || '']
          );
        }
      }
    }

    // Get all exam questions with answer keys
    const soalList = await db.getAll(
      `SELECT s.id, s.tipe, s.kunci_jawaban, s.bobot
       FROM soal s
       JOIN ujian_soal us ON us.soal_id = s.id
       WHERE us.ujian_id = ?`,
      [id]
    );

    // Get all student answers
    const jawabanSiswa = await db.getAll(
      'SELECT soal_id, jawaban_siswa FROM jawaban WHERE sesi_id = ?',
      [sesi_id]
    );

    const jawabanMap = {};
    for (const j of jawabanSiswa) {
      jawabanMap[j.soal_id] = j.jawaban_siswa;
    }

    // Calculate score
    let jumlahBenar = 0;
    let jumlahSalah = 0;
    let jumlahKosong = 0;
    let totalBobotObjektif = 0;
    let nilaiBobotObjektif = 0;
    let totalBobotSemua = 0;
    let jumlahManual = 0;

    for (const soal of soalList) {
      totalBobotSemua += soal.bobot;
      const jawaban = jawabanMap[soal.id];

      // Isian and Uraian are MANUALLY graded by the teacher according to weights
      if (soal.tipe === 'isian' || soal.tipe === 'uraian') {
        jumlahManual++;
        if (!jawaban || jawaban.trim() === '') {
          jumlahKosong++;
          const existing = await db.getOne(
            'SELECT id FROM jawaban WHERE sesi_id = ? AND soal_id = ?',
            [sesi_id, soal.id]
          );
          if (existing) {
            await db.run(
              `UPDATE jawaban SET is_benar = 0, nilai_soal = 0 WHERE id = ?`,
              [existing.id]
            );
          } else {
            await db.run(
              `INSERT INTO jawaban (id, sesi_id, soal_id, jawaban_siswa, is_benar, nilai_soal) VALUES (?, ?, ?, '', 0, 0)`,
              [generateId('jwb'), sesi_id, soal.id]
            );
          }
        } else {
          // Do NOT mark as wrong! Leave for teacher review
          await db.run(
            `UPDATE jawaban SET is_benar = NULL, nilai_soal = NULL WHERE sesi_id = ? AND soal_id = ?`,
            [sesi_id, soal.id]
          );
        }
        continue;
      }

      // Objective questions (pg & benar_salah)
      totalBobotObjektif += soal.bobot;
      if (!jawaban || jawaban.trim() === '') {
        jumlahKosong++;
        await db.run(
          `UPDATE jawaban SET is_benar = 0, nilai_soal = 0 WHERE sesi_id = ? AND soal_id = ?`,
          [sesi_id, soal.id]
        );
        continue;
      }

      let isBenar = false;
      if (soal.kunci_jawaban) {
        isBenar = jawaban.trim().toLowerCase() === soal.kunci_jawaban.trim().toLowerCase();
      }

      if (isBenar) {
        jumlahBenar++;
        nilaiBobotObjektif += soal.bobot;
      } else {
        jumlahSalah++;
      }

      await db.run(
        `UPDATE jawaban SET is_benar = ?, nilai_soal = ? WHERE sesi_id = ? AND soal_id = ?`,
        [isBenar ? 1 : 0, isBenar ? soal.bobot : 0, sesi_id, soal.id]
      );
    }

    const totalNilai = totalBobotSemua > 0 ? Math.round((nilaiBobotObjektif / totalBobotSemua) * 100 * 100) / 100 : 0;

    // Update session
    await db.run(
      `UPDATE sesi_ujian SET 
        status = 'selesai',
        waktu_selesai = datetime('now'),
        total_nilai = ?,
        jumlah_benar = ?,
        jumlah_salah = ?,
        jumlah_kosong = ?
       WHERE id = ?`,
      [totalNilai, jumlahBenar, jumlahSalah, jumlahKosong, sesi_id]
    );

    return apiResponse({
      success: true,
      hasil: {
        total_nilai: totalNilai,
        jumlah_benar: jumlahBenar,
        jumlah_salah: jumlahSalah,
        jumlah_kosong: jumlahKosong,
        total_soal: soalList.length,
        jumlah_manual: jumlahManual,
        menunggu_koreksi: jumlahManual > 0,
      },
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Submit exam error:', error);
    return apiError('Gagal mengumpulkan ujian', 500);
  }
}
