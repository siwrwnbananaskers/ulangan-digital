/**
 * Ujian (Exam) API
 * GET  /api/ujian - List exams
 * POST /api/ujian - Create exam
 */

import { getDB } from '@/lib/db';
import { requireAuth, requireRole, authErrorResponse, sanitizeInput } from '@/lib/auth';
import { apiResponse, apiError, generateId, generateKodeUjian, validateRequired } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const db = getDB();

    if (user.role === 'guru') {
      const ujianList = await db.getAll(
        `SELECT u.*, 
          (SELECT COUNT(*) FROM sesi_ujian s WHERE s.ujian_id = u.id) as total_peserta,
          (SELECT COUNT(*) FROM sesi_ujian s WHERE s.ujian_id = u.id AND s.status = 'selesai') as peserta_selesai
         FROM ujian u WHERE u.guru_id = ? ORDER BY u.created_at DESC`,
        [user.id]
      );
      return apiResponse({ ujian: ujianList });
    }

    // For siswa, only show active exams
    const ujianList = await db.getAll(
      `SELECT id, judul, mata_pelajaran, kelas_target, durasi_menit, jadwal_mulai, jadwal_selesai, jumlah_soal, status
       FROM ujian 
       WHERE status = 'aktif' 
       AND datetime(jadwal_mulai) <= datetime('now') 
       AND datetime(jadwal_selesai) >= datetime('now')
       ORDER BY jadwal_mulai ASC`
    );
    return apiResponse({ ujian: ujianList });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    return apiError('Gagal memuat daftar ujian', 500);
  }
}

export async function POST(request) {
  try {
    const user = await requireRole(request, 'guru');
    const body = await request.json();

    const errors = validateRequired(body, [
      'judul', 'mata_pelajaran', 'kelas_target', 'durasi_menit',
      'jadwal_mulai', 'jadwal_selesai', 'soal_ids'
    ]);
    if (errors.length > 0) {
      return apiError(errors.join(', '), 400);
    }

    if (!Array.isArray(body.soal_ids) || body.soal_ids.length === 0) {
      return apiError('Pilih minimal 1 soal untuk ujian', 400);
    }

    const db = getDB();
    const id = generateId('ujn');
    let kodeUjian = generateKodeUjian();

    // Ensure unique code
    let codeExists = await db.getOne('SELECT id FROM ujian WHERE kode_ujian = ?', [kodeUjian]);
    while (codeExists) {
      kodeUjian = generateKodeUjian();
      codeExists = await db.getOne('SELECT id FROM ujian WHERE kode_ujian = ?', [kodeUjian]);
    }

    await db.run(
      `INSERT INTO ujian (id, guru_id, judul, mata_pelajaran, kelas_target, kode_ujian, deskripsi, durasi_menit, jadwal_mulai, jadwal_selesai, jumlah_soal, kkm, acak_soal, acak_jawaban, tampilkan_nilai, batas_pelanggaran, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, user.id,
        sanitizeInput(body.judul),
        sanitizeInput(body.mata_pelajaran),
        sanitizeInput(body.kelas_target),
        kodeUjian,
        body.deskripsi ? sanitizeInput(body.deskripsi) : null,
        body.durasi_menit,
        body.jadwal_mulai,
        body.jadwal_selesai,
        body.soal_ids.length,
        body.kkm || 75,
        body.acak_soal ? 1 : 0,
        body.acak_jawaban ? 1 : 0,
        body.tampilkan_nilai ? 1 : 0,
        body.batas_pelanggaran || 3,
        body.status || 'draft',
      ]
    );

    // Insert exam-question mappings
    for (let i = 0; i < body.soal_ids.length; i++) {
      await db.run(
        'INSERT INTO ujian_soal (id, ujian_id, soal_id, urutan) VALUES (?, ?, ?, ?)',
        [generateId('us'), id, body.soal_ids[i], i + 1]
      );
    }

    return apiResponse({ success: true, id, kode_ujian: kodeUjian }, 201);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Create ujian error:', error);
    return apiError('Gagal membuat ujian', 500);
  }
}

export async function PUT(request) {
  try {
    const user = await requireRole(request, 'guru');
    const body = await request.json();

    if (!body.id) {
      return apiError('ID ujian wajib diisi', 400);
    }

    const db = getDB();

    const existing = await db.getOne(
      'SELECT id FROM ujian WHERE id = ? AND guru_id = ?',
      [body.id, user.id]
    );
    if (!existing) {
      return apiError('Ujian tidak ditemukan', 404);
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (body.status) { updates.push('status = ?'); params.push(body.status); }
    if (body.judul) { updates.push('judul = ?'); params.push(sanitizeInput(body.judul)); }
    if (body.durasi_menit) { updates.push('durasi_menit = ?'); params.push(body.durasi_menit); }
    if (body.kkm !== undefined) { updates.push('kkm = ?'); params.push(body.kkm); }
    if (body.batas_pelanggaran !== undefined) { updates.push('batas_pelanggaran = ?'); params.push(body.batas_pelanggaran); }
    if (body.tampilkan_nilai !== undefined) { updates.push('tampilkan_nilai = ?'); params.push(body.tampilkan_nilai ? 1 : 0); }
    if (body.jadwal_mulai) { updates.push('jadwal_mulai = ?'); params.push(body.jadwal_mulai); }
    if (body.jadwal_selesai) { updates.push('jadwal_selesai = ?'); params.push(body.jadwal_selesai); }

    updates.push("updated_at = datetime('now')");
    params.push(body.id, user.id);

    await db.run(
      `UPDATE ujian SET ${updates.join(', ')} WHERE id = ? AND guru_id = ?`,
      params
    );

    return apiResponse({ success: true });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    return apiError('Gagal mengupdate ujian', 500);
  }
}
