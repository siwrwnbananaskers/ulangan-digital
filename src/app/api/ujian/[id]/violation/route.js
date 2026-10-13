/**
 * Violation API
 * POST /api/ujian/[id]/violation - Log exam violations
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse, sanitizeInput } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

export async function POST(request, { params }) {
  try {
    const user = await requireRole(request, 'siswa');
    const { id } = await params;
    const body = await request.json();
    const { sesi_id, tipe_pelanggaran, detail } = body;

    if (!sesi_id || !tipe_pelanggaran) {
      return apiError('Data pelanggaran tidak lengkap', 400);
    }

    const db = getDB();

    // Verify session
    const sesi = await db.getOne(
      'SELECT * FROM sesi_ujian WHERE id = ? AND siswa_id = ?',
      [sesi_id, user.id]
    );

    if (!sesi) {
      return apiError('Sesi ujian tidak ditemukan', 404);
    }

    // Check if exambro mode is disabled for this exam
    const ujian = await db.getOne('SELECT batas_pelanggaran, mode_exambro FROM ujian WHERE id = ?', [id]);
    if (ujian && ujian.mode_exambro === 0) {
      return apiResponse({
        success: true,
        count: 0,
        ditangguhkan: false,
        mode_exambro: 0,
      });
    }

    // Log violation with explicit ISO timestamp
    const nowIso = new Date().toISOString();
    await db.run(
      `INSERT INTO audit_log (id, sesi_id, siswa_id, ujian_id, tipe_pelanggaran, detail, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId('log'),
        sesi_id,
        user.id,
        id,
        sanitizeInput(tipe_pelanggaran),
        detail ? sanitizeInput(detail) : null,
        nowIso,
      ]
    );

    // Increment violation count atomically
    await db.run(
      'UPDATE sesi_ujian SET jumlah_pelanggaran = COALESCE(jumlah_pelanggaran, 0) + 1 WHERE id = ?',
      [sesi_id]
    );

    // Fetch updated session
    const freshSesi = await db.getOne(
      'SELECT id, jumlah_pelanggaran, status FROM sesi_ujian WHERE id = ?',
      [sesi_id]
    );

    const currentCount = freshSesi ? Number(freshSesi.jumlah_pelanggaran) : ((sesi.jumlah_pelanggaran || 0) + 1);
    const batas = Number(ujian?.batas_pelanggaran) || 3;
    const limitReached = currentCount >= batas;

    if (limitReached) {
      // Lock exam immediately
      await db.run(
        "UPDATE sesi_ujian SET status = 'ditangguhkan' WHERE id = ?",
        [sesi_id]
      );
    }

    return apiResponse({
      success: true,
      jumlah_pelanggaran: currentCount,
      batas: batas,
      ditangguhkan: limitReached,
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Violation log error:', error);
    return apiError('Gagal mencatat pelanggaran', 500);
  }
}

/**
 * GET /api/ujian/[id]/violation - Get violations for an exam (guru only)
 */
export async function GET(request, { params }) {
  try {
    const user = await requireRole(request, 'guru');
    const { id } = await params;
    const db = getDB();

    const violations = await db.getAll(
      `SELECT al.id as id, al.sesi_id as sesi_id, al.siswa_id as siswa_id, al.ujian_id as ujian_id,
              al.tipe_pelanggaran as tipe_pelanggaran, al.detail as detail, al.timestamp as timestamp,
              u.nama as siswa_nama, u.kelas as siswa_kelas,
              COALESCE(su.status, 'berlangsung') as sesi_status,
              COALESCE(su.jumlah_pelanggaran, 0) as jumlah_pelanggaran
       FROM audit_log al
       JOIN users u ON u.id = al.siswa_id
       LEFT JOIN sesi_ujian su ON su.id = al.sesi_id
       WHERE al.ujian_id = ?
       ORDER BY al.timestamp DESC`,
      [id]
    );

    return apiResponse({ violations });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    return apiError('Gagal memuat log pelanggaran', 500);
  }
}
