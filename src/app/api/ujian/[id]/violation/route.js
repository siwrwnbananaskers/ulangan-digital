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

    // Log violation
    await db.run(
      `INSERT INTO audit_log (id, sesi_id, siswa_id, ujian_id, tipe_pelanggaran, detail)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        generateId('log'),
        sesi_id,
        user.id,
        id,
        sanitizeInput(tipe_pelanggaran),
        detail ? sanitizeInput(detail) : null,
      ]
    );

    // Increment violation count
    const newCount = (sesi.jumlah_pelanggaran || 0) + 1;
    await db.run(
      'UPDATE sesi_ujian SET jumlah_pelanggaran = ? WHERE id = ?',
      [newCount, sesi_id]
    );

    // Check violation limit
    const limitReached = newCount >= (ujian?.batas_pelanggaran || 3);

    if (limitReached) {
      // Suspend exam
      await db.run(
        "UPDATE sesi_ujian SET status = 'ditangguhkan' WHERE id = ?",
        [sesi_id]
      );
    }

    return apiResponse({
      success: true,
      jumlah_pelanggaran: newCount,
      batas: ujian?.batas_pelanggaran || 3,
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
      `SELECT al.*, u.nama as siswa_nama, u.kelas as siswa_kelas
       FROM audit_log al
       JOIN users u ON u.id = al.siswa_id
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
