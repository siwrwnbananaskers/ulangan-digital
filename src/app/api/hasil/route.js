/**
 * Results API
 * GET /api/hasil - Get exam results
 */

import { getDB } from '@/lib/db';
import { requireAuth, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujian_id');

    if (user.role === 'guru') {
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

    // Student results
    const results = await db.getAll(
      `SELECT su.*, uj.judul, uj.mata_pelajaran, uj.kkm, uj.tampilkan_nilai
       FROM sesi_ujian su
       JOIN ujian uj ON uj.id = su.ujian_id
       WHERE su.siswa_id = ? AND su.status = 'selesai'
       ORDER BY su.waktu_selesai DESC`,
      [user.id]
    );

    // Only include scores if teacher allows it
    const filteredResults = results.map(r => {
      if (!r.tampilkan_nilai) {
        return { ...r, total_nilai: null, jumlah_benar: null, jumlah_salah: null };
      }
      return r;
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
    const user = await requireAuth(request);
    if (user.role !== 'guru') {
      return apiError('Akses ditolak', 403);
    }

    const body = await request.json();
    const { sesi_id, action } = body;

    if (!sesi_id) {
      return apiError('sesi_id wajib diisi', 400);
    }

    const db = getDB();

    if (action === 'unfreeze') {
      await db.run(
        "UPDATE sesi_ujian SET status = 'berlangsung', jumlah_pelanggaran = 0 WHERE id = ?",
        [sesi_id]
      );
      return apiResponse({ success: true, message: 'Sesi berhasil dipulihkan' });
    }

    return apiError('Aksi tidak valid', 400);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    return apiError('Gagal memperbarui status sesi', 500);
  }
}

