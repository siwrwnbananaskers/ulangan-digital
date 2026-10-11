/**
 * Autosave API
 * POST /api/ujian/[id]/autosave - Save answers periodically
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

export async function POST(request, { params }) {
  try {
    const user = await requireRole(request, 'siswa');
    const { id } = await params;
    const body = await request.json();
    const { sesi_id, jawaban } = body;

    if (!sesi_id || !jawaban) {
      return apiError('Data tidak lengkap', 400);
    }

    const db = getDB();

    // Verify session belongs to user and is active
    const sesi = await db.getOne(
      'SELECT * FROM sesi_ujian WHERE id = ? AND siswa_id = ? AND ujian_id = ?',
      [sesi_id, user.id, id]
    );

    if (!sesi) {
      return apiError('Sesi ujian tidak ditemukan', 404);
    }

    if (sesi.status !== 'berlangsung') {
      return apiError('Sesi ujian sudah berakhir', 403);
    }

    // Check if time is still valid
    const ujian = await db.getOne('SELECT durasi_menit, jadwal_selesai FROM ujian WHERE id = ?', [id]);
    const waktuMulai = new Date(sesi.waktu_mulai);
    const batasWaktu = new Date(waktuMulai.getTime() + ujian.durasi_menit * 60 * 1000);
    const jadwalSelesai = new Date(ujian.jadwal_selesai);
    const now = new Date();

    if (now > batasWaktu || now > jadwalSelesai) {
      return apiError('Waktu ujian sudah habis', 403);
    }

    // Upsert answers
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

    // Return server time for timer sync
    return apiResponse({
      success: true,
      server_time: new Date().toISOString(),
      saved_count: jawaban.length,
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Autosave error:', error);
    return apiError('Gagal menyimpan jawaban', 500);
  }
}
