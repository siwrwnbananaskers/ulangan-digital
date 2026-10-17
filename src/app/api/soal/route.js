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

    const isMasterAll = searchParams.get('all') === 'true';

    let sql = '';
    const params = [];

    if (user.role === 'superadmin') {
      // Super Admin master view across all teachers
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
      sql += ' ORDER BY s.created_at DESC, s.rowid DESC';
    } else {
      // Regular teachers strictly see only their own questions
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

      sql += ' ORDER BY created_at ASC, rowid ASC';
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
    const db = getDB();

    // Check demo limitation: demo user "guru" is limited to 5 questions in bank soal
    const isDemoTeacher = user.role === 'guru' && (user.username === 'guru' || user.is_demo === 1);
    if (isDemoTeacher) {
      const existingCountRow = await db.getOne('SELECT COUNT(*) as total FROM soal WHERE guru_id = ?', [user.id]);
      const currentCount = existingCountRow?.total || 0;

      if (currentCount >= 5) {
        return Response.json({
          error: 'LIMIT_DEMO_REACHED',
          message: 'Batas Akun Demo Tercapai! Anda hanya dapat menambahkan maksimal 5 butir soal untuk uji coba.',
          upgrade_required: true,
          wa_contact: '082175693537',
        }, { status: 403 });
      }

      if (Array.isArray(body.soal) && currentCount + body.soal.length > 5) {
        return Response.json({
          error: 'LIMIT_DEMO_REACHED',
          message: `Batas Akun Demo Tercapai! Bank Soal versi demo dibatasi maksimal 5 butir soal (saat ini tersimpan ${currentCount} soal, sisa kuota: ${5 - currentCount} butir).`,
          upgrade_required: true,
          wa_contact: '082175693537',
        }, { status: 403 });
      }
    }

    // Check if bulk insert
    if (Array.isArray(body.soal)) {
      if (body.soal.length === 0) {
        return apiError('Daftar soal kosong', 400);
      }

      let createdCount = 0;
      let skippedCount = 0;
      const errorDetails = [];

      for (let i = 0; i < body.soal.length; i++) {
        const item = body.soal[i];
        const rowNum = i + 1;

        const mapel = sanitizeInput(item.mata_pelajaran || body.default_mapel || '').trim();
        let tipe = (item.tipe || 'pg').toLowerCase().trim();
        if (tipe === 'pilihan ganda' || tipe === 'mcq') tipe = 'pg';
        if (tipe === 'isian singkat' || tipe === 'short answer') tipe = 'isian';
        if (tipe === 'benar/salah' || tipe === 'benar salah' || tipe === 'b/s' || tipe === 'bs' || tipe === 'true/false') tipe = 'benar_salah';
        if (tipe === 'uraian' || tipe === 'esai' || tipe === 'essay') tipe = 'uraian';

        const pertanyaan = sanitizeInput(item.pertanyaan || '').trim();
        const bobot = Math.max(1, parseInt(item.bobot) || 1);

        if (!mapel || !pertanyaan) {
          skippedCount++;
          errorDetails.push(`Baris #${rowNum}: Mata pelajaran dan pertanyaan wajib diisi`);
          continue;
        }

        if (!['pg', 'isian', 'benar_salah', 'uraian'].includes(tipe)) {
          skippedCount++;
          errorDetails.push(`Baris #${rowNum}: Tipe soal "${item.tipe}" tidak valid`);
          continue;
        }

        let pilA = item.pilihan_a ? sanitizeInput(String(item.pilihan_a).trim()) : null;
        let pilB = item.pilihan_b ? sanitizeInput(String(item.pilihan_b).trim()) : null;
        let pilC = item.pilihan_c ? sanitizeInput(String(item.pilihan_c).trim()) : null;
        let pilD = item.pilihan_d ? sanitizeInput(String(item.pilihan_d).trim()) : null;
        let pilE = item.pilihan_e ? sanitizeInput(String(item.pilihan_e).trim()) : null;

        if (tipe === 'pg' && (!pilA || !pilB)) {
          skippedCount++;
          errorDetails.push(`Baris #${rowNum}: Soal PG minimal harus ada Pilihan A dan B`);
          continue;
        }

        let kunci = item.kunci_jawaban ? String(item.kunci_jawaban).trim() : null;
        if (tipe === 'pg') {
          if (kunci) {
            kunci = kunci.slice(0, 1).toLowerCase();
            if (!['a', 'b', 'c', 'd', 'e'].includes(kunci)) {
              kunci = null;
            }
          }
        } else if (tipe === 'benar_salah') {
          if (kunci) {
            const kLower = kunci.toLowerCase();
            if (['benar', 'b', 'true', 't', '1'].includes(kLower)) {
              kunci = 'benar';
            } else if (['salah', 's', 'false', 'f', '0'].includes(kLower)) {
              kunci = 'salah';
            } else {
              kunci = null;
            }
          }
        } else if (kunci) {
          kunci = sanitizeInput(kunci);
        }

        const gambar = item.gambar ? String(item.gambar).trim() : null;
        const id = generateId('soal');
        await db.run(
          `INSERT INTO soal (id, guru_id, mata_pelajaran, tipe, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, kunci_jawaban, bobot, gambar)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, user.id, mapel, tipe, pertanyaan, pilA, pilB, pilC, pilD, pilE, kunci, bobot, gambar]
        );
        createdCount++;
      }

      return apiResponse({
        success: true,
        message: `Berhasil mengimpor ${createdCount} butir soal ke Bank Soal.${skippedCount > 0 ? ` (${skippedCount} soal dilewati karena data tidak lengkap)` : ''}`,
        created_count: createdCount,
        skipped_count: skippedCount,
        errors: errorDetails.slice(0, 10),
      }, 201);
    }

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

    const gambar = body.gambar ? String(body.gambar).trim() : null;
    const id = generateId('soal');

    await db.run(
      `INSERT INTO soal (id, guru_id, mata_pelajaran, tipe, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, kunci_jawaban, bobot, gambar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        gambar,
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

    // Verify ownership or superadmin role
    const existing = await db.getOne(
      'SELECT id, gambar FROM soal WHERE id = ? AND (guru_id = ? OR ? = \'superadmin\')',
      [body.id, user.id, user.role]
    );
    if (!existing) {
      return apiError('Soal tidak ditemukan', 404);
    }

    const gambar = body.gambar !== undefined ? (body.gambar ? String(body.gambar).trim() : null) : existing.gambar;

    await db.run(
      `UPDATE soal SET 
        mata_pelajaran = COALESCE(?, mata_pelajaran),
        tipe = COALESCE(?, tipe),
        pertanyaan = COALESCE(?, pertanyaan),
        pilihan_a = ?, pilihan_b = ?, pilihan_c = ?, pilihan_d = ?, pilihan_e = ?,
        kunci_jawaban = ?, bobot = COALESCE(?, bobot),
        gambar = ?,
        updated_at = datetime('now')
       WHERE id = ? AND (guru_id = ? OR ? = 'superadmin')`,
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
        gambar,
        body.id, user.id, user.role,
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
      'DELETE FROM soal WHERE id = ? AND (guru_id = ? OR ? = \'superadmin\')',
      [id, user.id, user.role]
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
