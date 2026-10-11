/**
 * Ujian (Exam) API
 * GET  /api/ujian - List exams
 * POST /api/ujian - Create exam
 */

import { getDB } from '@/lib/db';
import { requireAuth, requireRole, authErrorResponse, sanitizeInput } from '@/lib/auth';
import { apiResponse, apiError, generateId, generateKodeUjian, validateRequired } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    const db = getDB();

    if (user.role === 'superadmin') {
      const ujianList = await db.getAll(
        `SELECT 
          u.id as id, u.guru_id as guru_id, u.judul as judul, u.mata_pelajaran as mata_pelajaran,
          u.kelas_target as kelas_target, u.kode_ujian as kode_ujian, u.deskripsi as deskripsi,
          u.durasi_menit as durasi_menit, u.jadwal_mulai as jadwal_mulai, u.jadwal_selesai as jadwal_selesai,
          u.jumlah_soal as jumlah_soal, u.kkm as kkm, u.acak_soal as acak_soal, u.acak_jawaban as acak_jawaban,
          u.tampilkan_nilai as tampilkan_nilai, u.batas_pelanggaran as batas_pelanggaran, u.status as status,
          u.created_at as created_at, u.updated_at as updated_at,
          (SELECT COUNT(*) FROM sesi_ujian s WHERE s.ujian_id = u.id) as total_peserta,
          (SELECT COUNT(*) FROM sesi_ujian s WHERE s.ujian_id = u.id AND s.status = 'selesai') as peserta_selesai,
          (SELECT nama FROM users g WHERE g.id = u.guru_id) as nama_guru
         FROM ujian u ORDER BY u.created_at DESC`
      );
      return apiResponse({ ujian: ujianList });
    }

    if (user.role === 'guru') {
      const ujianListRaw = await db.getAll(
        `SELECT 
          u.id as id, u.guru_id as guru_id, u.judul as judul, u.mata_pelajaran as mata_pelajaran,
          u.kelas_target as kelas_target, u.kode_ujian as kode_ujian, u.deskripsi as deskripsi,
          u.durasi_menit as durasi_menit, u.jadwal_mulai as jadwal_mulai, u.jadwal_selesai as jadwal_selesai,
          u.jumlah_soal as jumlah_soal, u.kkm as kkm, u.acak_soal as acak_soal, u.acak_jawaban as acak_jawaban,
          u.tampilkan_nilai as tampilkan_nilai, u.batas_pelanggaran as batas_pelanggaran, u.status as status,
          u.created_at as created_at, u.updated_at as updated_at,
          (SELECT COUNT(*) FROM sesi_ujian s WHERE s.ujian_id = u.id) as total_peserta,
          (SELECT COUNT(*) FROM sesi_ujian s WHERE s.ujian_id = u.id AND s.status = 'selesai') as peserta_selesai
         FROM ujian u WHERE u.guru_id = ? ORDER BY u.created_at DESC`,
        [user.id]
      );
      // Clean ghost items that lack title/subject
      const validUjian = (ujianListRaw || []).filter(u => u && u.id && (u.judul || u.mata_pelajaran || u.kode_ujian));
      return apiResponse({ ujian: validUjian });
    }

    // For siswa, only show active exams created by their own teacher (guru_id) and for their class
    let studentGuruId = user.guru_id;
    let studentKelas = user.kelas;

    // Fetch up-to-date user info if missing from token
    if (!studentGuruId || !studentKelas) {
      try {
        const studentProfile = await db.getOne('SELECT guru_id, kelas FROM users WHERE id = ?', [user.id]);
        if (studentProfile) {
          studentGuruId = studentGuruId || studentProfile.guru_id || 'usr_guru_001';
          studentKelas = studentKelas || studentProfile.kelas;
        }
      } catch {}
    }

    let ujianList = [];
    if (studentGuruId) {
      ujianList = await db.getAll(
        `SELECT u.id, u.judul, u.mata_pelajaran, u.kelas_target, u.durasi_menit, u.jadwal_mulai, u.jadwal_selesai, u.jumlah_soal, u.status, u.guru_id, u.kkm,
                (SELECT nama FROM users g WHERE g.id = u.guru_id) as nama_guru
         FROM ujian u
         WHERE u.status = 'aktif' 
         AND u.guru_id = ?
         AND datetime(u.jadwal_mulai) <= datetime('now') 
         AND datetime(u.jadwal_selesai) >= datetime('now')
         ORDER BY u.jadwal_mulai ASC`,
        [studentGuruId]
      );
    } else {
      ujianList = await db.getAll(
        `SELECT u.id, u.judul, u.mata_pelajaran, u.kelas_target, u.durasi_menit, u.jadwal_mulai, u.jadwal_selesai, u.jumlah_soal, u.status, u.guru_id, u.kkm,
                (SELECT nama FROM users g WHERE g.id = u.guru_id) as nama_guru
         FROM ujian u
         WHERE u.status = 'aktif' 
         AND datetime(u.jadwal_mulai) <= datetime('now') 
         AND datetime(u.jadwal_selesai) >= datetime('now')
         ORDER BY u.jadwal_mulai ASC`
      );
    }

    // Filter by student class if kelas_target is set and student has a class
    if (studentKelas) {
      const normalizedKelas = studentKelas.trim().toUpperCase();
      ujianList = ujianList.filter(u => {
        if (!u.kelas_target || u.kelas_target === 'Semua Kelas' || u.kelas_target === '*') return true;
        return u.kelas_target.trim().toUpperCase() === normalizedKelas;
      });
    }

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

    // Check demo limitation: demo user "guru" is limited to 1 exam
    if (user.role === 'guru' && user.username === 'guru') {
      const existingExams = await db.getAll('SELECT id FROM ujian WHERE guru_id = ?', [user.id]);
      if (existingExams && existingExams.length >= 1) {
        return Response.json({
          error: 'LIMIT_DEMO_REACHED',
          message: 'Batas Akun Demo Tercapai! Anda hanya dapat membuat 1 ujian untuk uji coba.',
          upgrade_required: true,
          wa_contact: '082175693537',
        }, { status: 403 });
      }
    }

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
        body.jadwal_mulai || new Date().toISOString(),
        body.jadwal_selesai || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        body.soal_ids.length,
        body.kkm || 75,
        body.acak_soal ? 1 : 0,
        body.acak_jawaban ? 1 : 0,
        body.tampilkan_nilai ? 1 : 0,
        body.batas_pelanggaran || 3,
        body.status || 'aktif',
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
      'SELECT id, guru_id FROM ujian WHERE id = ?',
      [body.id]
    );
    if (!existing) {
      return apiError('Ujian tidak ditemukan', 404);
    }

    if (user.role !== 'superadmin' && existing.guru_id && existing.guru_id !== user.id) {
      const isEquivalentTeacher = (user.username === 'novisa' || user.username === 'apim') && 
        (existing.guru_id === 'usr_guru_002' || !existing.guru_id);
      if (!isEquivalentTeacher) {
        return apiError('Anda tidak memiliki akses untuk mengubah ujian ini', 403);
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (body.status) { updates.push('status = ?'); params.push(body.status); }
    if (body.judul) { updates.push('judul = ?'); params.push(sanitizeInput(body.judul)); }
    if (body.mata_pelajaran) { updates.push('mata_pelajaran = ?'); params.push(sanitizeInput(body.mata_pelajaran)); }
    if (body.kelas_target) { updates.push('kelas_target = ?'); params.push(sanitizeInput(body.kelas_target)); }
    if (body.deskripsi !== undefined) { updates.push('deskripsi = ?'); params.push(body.deskripsi ? sanitizeInput(body.deskripsi) : null); }
    if (body.durasi_menit) { updates.push('durasi_menit = ?'); params.push(body.durasi_menit); }
    if (body.kkm !== undefined) { updates.push('kkm = ?'); params.push(body.kkm); }
    if (body.batas_pelanggaran !== undefined) { updates.push('batas_pelanggaran = ?'); params.push(body.batas_pelanggaran); }
    if (body.tampilkan_nilai !== undefined) { updates.push('tampilkan_nilai = ?'); params.push(body.tampilkan_nilai ? 1 : 0); }
    if (body.acak_soal !== undefined) { updates.push('acak_soal = ?'); params.push(body.acak_soal ? 1 : 0); }
    if (body.jadwal_mulai) { updates.push('jadwal_mulai = ?'); params.push(body.jadwal_mulai); }
    if (body.jadwal_selesai) { updates.push('jadwal_selesai = ?'); params.push(body.jadwal_selesai); }

    if (Array.isArray(body.soal_ids) && body.soal_ids.length > 0) {
      updates.push('jumlah_soal = ?');
      params.push(body.soal_ids.length);
    }

    updates.push("updated_at = datetime('now')");
    params.push(body.id);

    await db.run(
      `UPDATE ujian SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // If soal_ids provided, replace questions mapping
    if (Array.isArray(body.soal_ids) && body.soal_ids.length > 0) {
      await db.run('DELETE FROM ujian_soal WHERE ujian_id = ?', [body.id]);
      for (let i = 0; i < body.soal_ids.length; i++) {
        await db.run(
          'INSERT INTO ujian_soal (id, ujian_id, soal_id, urutan) VALUES (?, ?, ?, ?)',
          [generateId('us'), body.id, body.soal_ids[i], i + 1]
        );
      }
    }

    return apiResponse({ success: true });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Update ujian error:', error);
    return apiError('Gagal mengupdate ujian', 500);
  }
}

export async function DELETE(request) {
  try {
    const user = await requireRole(request, 'guru');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('ID ujian wajib diisi', 400);
    }

    const db = getDB();
    const existing = await db.getOne(
      'SELECT id, guru_id FROM ujian WHERE id = ?',
      [id]
    );
    if (!existing) {
      return apiError('Ujian tidak ditemukan', 404);
    }

    // Permission check: superadmin can delete any, teacher can delete their own or orphaned exams
    if (user.role !== 'superadmin' && existing.guru_id && existing.guru_id !== user.id) {
      const isEquivalentTeacher = (user.username === 'novisa' || user.username === 'apim') && 
        (existing.guru_id === 'usr_guru_002' || !existing.guru_id);
      if (!isEquivalentTeacher) {
        return apiError('Anda tidak memiliki akses untuk menghapus ujian ini', 403);
      }
    }

    // Delete related records
    await db.run('DELETE FROM ujian_soal WHERE ujian_id = ?', [id]);
    await db.run('DELETE FROM ujian WHERE id = ?', [id]);

    return apiResponse({ success: true, message: 'Ujian berhasil dihapus' });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    return apiError('Gagal menghapus ujian', 500);
  }
}
