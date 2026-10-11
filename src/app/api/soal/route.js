/**
 * Soal (Questions) API
 * GET    /api/soal - List all questions
 * POST   /api/soal - Create new question
 * PUT    /api/soal - Update question
 * DELETE /api/soal - Delete question
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse, sanitizeInput } from '@/lib/auth';
import { apiResponse, apiError, generateId, validateRequired } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const user = await requireRole(request, 'guru');
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const mapel = searchParams.get('mapel');
    const tipe = searchParams.get('tipe');
    const guruIdParam = searchParams.get('guru_id');

    let sql = '';
    const params = [];

    if (user.role === 'superadmin') {
      // Super Admin has god-mode access: can see all bank soal across all teachers!
      sql = `SELECT s.*, u.nama as nama_guru, u.username as username_guru 
             FROM soal s 
             LEFT JOIN users u ON s.guru_id = u.id`;
      const conditions = [];
      if (guruIdParam) {
        conditions.push('s.guru_id = ?');
        params.push(guruIdParam);
      }
      if (mapel) {
        conditions.push('s.mata_pelajaran = ?');
        params.push(mapel);
      }
      if (tipe) {
        conditions.push('s.tipe = ?');
        params.push(tipe);
      }
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY s.created_at DESC';
    } else {
      // Regular teacher MUST strictly ONLY see their own questions!
      // Teachers CANNOT see demo questions or other teachers' questions.
      sql = 'SELECT * FROM soal WHERE guru_id = ?';
      params.push(user.id);

      if (mapel) {
        sql += ' AND mata_pelajaran = ?';
        params.push(mapel);
      }
      if (tipe) {
        sql += ' AND tipe = ?';
        params.push(tipe);
      }

      sql += ' ORDER BY created_at DESC';
    }

    const soalList = await db.getAll(sql, params);
    return apiResponse({ soal: soalList });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    return apiError('Gagal memuat bank soal', 500);
  }
}

export async function POST(request) {
  try {
    const user = await requireRole(request, 'guru');
    const body = await request.json();

    const errors = validateRequired(body, ['mata_pelajaran', 'tipe', 'pertanyaan']);
    if (errors.length > 0) {
      return apiError(errors.join(', '), 400);
    }

    if (!['pg', 'isian', 'benar_salah', 'uraian'].includes(body.tipe)) {
      return apiError('Tipe soal tidak valid', 400);
    }

    // Validate PG has options
    if (body.tipe === 'pg') {
      if (!body.pilihan_a || !body.pilihan_b) {
        return apiError('Soal PG minimal harus punya pilihan A dan B', 400);
      }
    }

    const db = getDB();
    const id = generateId('soal');

    await db.run(
      `INSERT INTO soal (id, guru_id, mata_pelajaran, tipe, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, kunci_jawaban, bobot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, user.id,
        sanitizeInput(body.mata_pelajaran),
        body.tipe,
        sanitizeInput(body.pertanyaan),
        body.pilihan_a ? sanitizeInput(body.pilihan_a) : null,
        body.pilihan_b ? sanitizeInput(body.pilihan_b) : null,
        body.pilihan_c ? sanitizeInput(body.pilihan_c) : null,
        body.pilihan_d ? sanitizeInput(body.pilihan_d) : null,
        body.pilihan_e ? sanitizeInput(body.pilihan_e) : null,
        body.kunci_jawaban ? sanitizeInput(body.kunci_jawaban) : null,
        body.bobot || 1,
      ]
    );

    return apiResponse({ success: true, id }, 201);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Create soal error:', error);
    return apiError('Gagal membuat soal', 500);
  }
}

export async function PUT(request) {
  try {
    const user = await requireRole(request, 'guru');
    const body = await request.json();

    if (!body.id) {
      return apiError('ID soal wajib diisi', 400);
    }

    const db = getDB();

    // Verify ownership
    const existing = await db.getOne(
      'SELECT id FROM soal WHERE id = ? AND guru_id = ?',
      [body.id, user.id]
    );
    if (!existing) {
      return apiError('Soal tidak ditemukan', 404);
    }

    await db.run(
      `UPDATE soal SET 
        mata_pelajaran = COALESCE(?, mata_pelajaran),
        tipe = COALESCE(?, tipe),
        pertanyaan = COALESCE(?, pertanyaan),
        pilihan_a = ?, pilihan_b = ?, pilihan_c = ?, pilihan_d = ?, pilihan_e = ?,
        kunci_jawaban = ?, bobot = COALESCE(?, bobot),
        updated_at = datetime('now')
       WHERE id = ? AND guru_id = ?`,
      [
        body.mata_pelajaran ? sanitizeInput(body.mata_pelajaran) : null,
        body.tipe || null,
        body.pertanyaan ? sanitizeInput(body.pertanyaan) : null,
        body.pilihan_a ? sanitizeInput(body.pilihan_a) : null,
        body.pilihan_b ? sanitizeInput(body.pilihan_b) : null,
        body.pilihan_c ? sanitizeInput(body.pilihan_c) : null,
        body.pilihan_d ? sanitizeInput(body.pilihan_d) : null,
        body.pilihan_e ? sanitizeInput(body.pilihan_e) : null,
        body.kunci_jawaban ? sanitizeInput(body.kunci_jawaban) : null,
        body.bobot || null,
        body.id, user.id,
      ]
    );

    return apiResponse({ success: true });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    return apiError('Gagal mengupdate soal', 500);
  }
}

export async function DELETE(request) {
  try {
    const user = await requireRole(request, 'guru');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('ID soal wajib diisi', 400);
    }

    const db = getDB();
    const result = await db.run(
      'DELETE FROM soal WHERE id = ? AND guru_id = ?',
      [id, user.id]
    );

    if (result.changes === 0) {
      return apiError('Soal tidak ditemukan', 404);
    }

    return apiResponse({ success: true });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    return apiError('Gagal menghapus soal', 500);
  }
}
