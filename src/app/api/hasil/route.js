/**
 * Results API
 * GET /api/hasil - Get exam results
 */

import { getDB } from '@/lib/db';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujian_id');
    const sesiId = searchParams.get('sesi_id');

    if (user.role === 'guru' || user.role === 'superadmin') {
      if (sesiId) {
        // Get specific student session and answers
        const sesi = await db.getOne(
          `SELECT su.*, u.nama, u.username, u.kelas, u.no_absen,
                  uj.judul as ujian_judul, uj.mata_pelajaran, uj.kkm, uj.durasi_menit, uj.guru_id
           FROM sesi_ujian su
           JOIN users u ON u.id = su.siswa_id
           JOIN ujian uj ON uj.id = su.ujian_id
           WHERE su.id = ?`,
          [sesiId]
        );

        if (!sesi) {
          return apiError('Sesi ujian tidak ditemukan', 404);
        }

        if (user.role === 'guru' && sesi.guru_id && sesi.guru_id !== user.id) {
          return apiError('Anda tidak memiliki akses ke sesi ujian ini', 403);
        }

        const listJawaban = await db.getAll(
          `SELECT 
            s.id as soal_id,
            s.pertanyaan,
            s.tipe,
            s.pilihan_a,
            s.pilihan_b,
            s.pilihan_c,
            s.pilihan_d,
            s.pilihan_e,
            s.kunci_jawaban,
            s.bobot,
            us.urutan,
            j.id as jawaban_id,
            j.jawaban_siswa,
            j.is_benar,
            j.nilai_soal
           FROM ujian_soal us
           JOIN soal s ON s.id = us.soal_id
           LEFT JOIN jawaban j ON j.soal_id = s.id AND j.sesi_id = ?
           WHERE us.ujian_id = ?
           ORDER BY us.urutan ASC`,
          [sesiId, sesi.ujian_id]
        );

        const logs = await db.getAll(
          `SELECT * FROM audit_log WHERE sesi_id = ? ORDER BY timestamp DESC`,
          [sesiId]
        );

        return apiResponse({
          sesi,
          jawaban: listJawaban,
          logs,
        });
      }

      if (ujianId) {
        // Get detailed results for specific exam
        const results = await db.getAll(
          `SELECT su.*, u.nama, u.kelas, u.no_absen,
            (SELECT COUNT(*) FROM audit_log al WHERE al.sesi_id = su.id) as total_pelanggaran
           FROM sesi_ujian su
           JOIN users u ON u.id = su.siswa_id
           WHERE su.ujian_id = ?
           ORDER BY u.nama ASC`,
          [ujianId]
        );

        const ujian = await db.getOne('SELECT * FROM ujian WHERE id = ?', [ujianId]);

        // Statistics
        const selesai = results.filter(r => r.status === 'selesai');
        const nilaiArr = selesai.map(r => r.total_nilai).filter(n => n !== null);
        const stats = {
          total_peserta: results.length,
          total_selesai: selesai.length,
          total_berlangsung: results.filter(r => r.status === 'berlangsung').length,
          total_ditangguhkan: results.filter(r => r.status === 'ditangguhkan').length,
          rata_rata: nilaiArr.length > 0 ? Math.round(nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length * 100) / 100 : 0,
          nilai_tertinggi: nilaiArr.length > 0 ? Math.max(...nilaiArr) : 0,
          nilai_terendah: nilaiArr.length > 0 ? Math.min(...nilaiArr) : 0,
          lulus_kkm: selesai.filter(r => r.total_nilai >= (ujian?.kkm || 75)).length,
          tidak_lulus: selesai.filter(r => r.total_nilai < (ujian?.kkm || 75)).length,
        };

        return apiResponse({ results, ujian, stats });
      }

      // Overview of all exams
      const exams = await db.getAll(
        `SELECT u.*, 
          (SELECT COUNT(*) FROM sesi_ujian s WHERE s.ujian_id = u.id) as total_peserta,
          (SELECT COUNT(*) FROM sesi_ujian s WHERE s.ujian_id = u.id AND s.status = 'selesai') as peserta_selesai,
          (SELECT AVG(s.total_nilai) FROM sesi_ujian s WHERE s.ujian_id = u.id AND s.status = 'selesai') as rata_rata
         FROM ujian u WHERE u.guru_id = ?
         ORDER BY u.created_at DESC`,
        [user.id]
      );
      return apiResponse({ exams });
    }

    // Student results with manual grading status
    const results = await db.getAll(
      `SELECT su.*, uj.judul, uj.mata_pelajaran, uj.kkm, uj.tampilkan_nilai,
        (SELECT COUNT(*) FROM soal s JOIN ujian_soal us ON us.soal_id = s.id WHERE us.ujian_id = su.ujian_id AND s.tipe IN ('isian', 'uraian')) as jumlah_manual,
        (SELECT COUNT(*) FROM jawaban j JOIN soal s ON s.id = j.soal_id WHERE j.sesi_id = su.id AND s.tipe IN ('isian', 'uraian') AND j.nilai_soal IS NOT NULL) as jumlah_terkoreksi_manual
       FROM sesi_ujian su
       JOIN ujian uj ON uj.id = su.ujian_id
       WHERE su.siswa_id = ? AND su.status = 'selesai'
       ORDER BY su.waktu_selesai DESC`,
      [user.id]
    );

    // Filter results according to teacher's visibility settings and manual grading progress
    const filteredResults = results.map(r => {
      const jmlManual = Number(r.jumlah_manual) || 0;
      const jmlTerkoreksi = Number(r.jumlah_terkoreksi_manual) || 0;
      const menungguKoreksi = jmlManual > 0 && jmlTerkoreksi < jmlManual;

      if (!r.tampilkan_nilai) {
        return {
          ...r,
          total_nilai: null,
          jumlah_benar: null,
          jumlah_salah: null,
          menunggu_koreksi: menungguKoreksi,
        };
      }
      return {
        ...r,
        menunggu_koreksi: menungguKoreksi,
      };
    });

    return apiResponse({ results: filteredResults });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Get results error:', error);
    return apiError('Gagal memuat hasil', 500);
  }
}

export async function PATCH(request) {
  try {
    const user = await requireRole(request, 'guru');

    const body = await request.json();
    const { sesi_id, siswa_id, ujian_id, action } = body;

    const db = getDB();

    if (action === 'unfreeze') {
      if (!sesi_id && (!siswa_id || !ujian_id)) {
        return apiError('sesi_id atau siswa_id & ujian_id wajib diisi', 400);
      }

      if (sesi_id) {
        await db.run(
          "UPDATE sesi_ujian SET status = 'berlangsung', jumlah_pelanggaran = 0 WHERE id = ?",
          [sesi_id]
        );
      } else {
        await db.run(
          "UPDATE sesi_ujian SET status = 'berlangsung', jumlah_pelanggaran = 0 WHERE siswa_id = ? AND ujian_id = ?",
          [siswa_id, ujian_id]
        );
      }
      return apiResponse({ success: true, message: 'Sesi berhasil dipulihkan' });
    }

    if (action === 'koreksi_soal') {
      const { jawaban_id, soal_id, is_benar, nilai_soal } = body;
      const score = Math.max(0, Number(nilai_soal) || 0);
      const isCorrect = is_benar !== undefined ? (is_benar ? 1 : 0) : (score > 0 ? 1 : 0);
      let jId = jawaban_id;

      if (!jId) {
        if (!soal_id) {
          return apiError('soal_id atau jawaban_id wajib disertakan', 400);
        }
        jId = generateId('jwb');
        await db.run(
          `INSERT INTO jawaban (id, sesi_id, soal_id, jawaban_siswa, is_benar, nilai_soal) VALUES (?, ?, ?, '', ?, ?)`,
          [jId, sesi_id, soal_id, isCorrect, score]
        );
      } else {
        await db.run(
          `UPDATE jawaban SET is_benar = ?, nilai_soal = ?, updated_at = datetime('now') WHERE id = ?`,
          [isCorrect, score, jId]
        );
      }

      // Recalculate session totals
      const allAnswers = await db.getAll(
        `SELECT j.is_benar, j.nilai_soal, j.jawaban_siswa 
         FROM jawaban j 
         WHERE j.sesi_id = ?`,
        [sesi_id]
      );
      const totalBobotRes = await db.getOne(
        `SELECT SUM(s.bobot) as total_bobot 
         FROM ujian_soal us 
         JOIN soal s ON s.id = us.soal_id 
         WHERE us.ujian_id = (SELECT ujian_id FROM sesi_ujian WHERE id = ?)`,
        [sesi_id]
      );
      const totalBobot = totalBobotRes?.total_bobot || 100;
      let sumNilai = 0;
      let benar = 0;
      let salah = 0;
      let kosong = 0;
      for (const a of allAnswers) {
        if (!a.jawaban_siswa || a.jawaban_siswa.trim() === '') {
          if ((a.nilai_soal || 0) > 0) benar++;
          else kosong++;
        } else if (a.is_benar === 1 || (a.nilai_soal || 0) > 0) {
          benar++;
        } else {
          salah++;
        }
        sumNilai += Number(a.nilai_soal) || 0;
      }
      const finalScore = totalBobot > 0 ? Math.round((sumNilai / totalBobot) * 100 * 100) / 100 : 0;
      await db.run(
        `UPDATE sesi_ujian SET total_nilai = ?, jumlah_benar = ?, jumlah_salah = ?, jumlah_kosong = ? WHERE id = ?`,
        [finalScore, benar, salah, kosong, sesi_id]
      );
      return apiResponse({ 
        success: true, 
        jawaban_id: jId,
        nilai_soal: score,
        is_benar: isCorrect,
        total_nilai: finalScore, 
        jumlah_benar: benar, 
        jumlah_salah: salah, 
        jumlah_kosong: kosong 
      });
    }

    return apiError('Aksi tidak valid', 400);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    return apiError('Gagal memperbarui status sesi', 500);
  }
}

