/**
 * Exam Join API
 * POST /api/ujian/[id]/join - Student joins exam (creates session)
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, generateId, parseWaktuWIB, shuffleQuestionsByType, orderQuestionsByType } from '@/lib/utils';

export async function POST(request, { params }) {
  try {
    const user = await requireRole(request, 'siswa');
    const { id } = await params;
    const db = getDB();

    // Ensure urutan_soal column exists in sesi_ujian
    try {
      await db.run('ALTER TABLE sesi_ujian ADD COLUMN urutan_soal TEXT');
    } catch (_) {}

    const ujian = await db.getOne('SELECT * FROM ujian WHERE id = ?', [id]);
    if (!ujian) {
      return apiError('Ujian tidak ditemukan', 404);
    }

    let studentKelas = user.kelas;
    if (!studentKelas) {
      try {
        const studentProfile = await db.getOne('SELECT kelas FROM users WHERE id = ?', [user.id]);
        if (studentProfile) {
          studentKelas = studentProfile.kelas;
        }
      } catch {}
    }

    if (studentKelas && ujian.kelas_target && ujian.kelas_target !== 'Semua Kelas' && ujian.kelas_target !== '*') {
      if (ujian.kelas_target.trim().toUpperCase() !== studentKelas.trim().toUpperCase()) {
        return apiError(`Ujian ini dikhususkan untuk kelas ${ujian.kelas_target}.`, 403);
      }
    }

    if (ujian.status !== 'aktif') {
      return apiError('Ujian tidak aktif', 403);
    }

    const nowTime = Date.now();
    const mulaiTime = parseWaktuWIB(ujian.jadwal_mulai);
    const selesaiTime = parseWaktuWIB(ujian.jadwal_selesai);

    if (!isNaN(mulaiTime) && nowTime < mulaiTime - 10 * 60 * 1000) {
      return apiError('Ujian belum dimulai', 403);
    }
    if (!isNaN(selesaiTime) && nowTime > selesaiTime) {
      return apiError('Ujian sudah berakhir', 403);
    }

    // Check if session already exists
    let sesi = await db.getOne(
      'SELECT * FROM sesi_ujian WHERE ujian_id = ? AND siswa_id = ?',
      [id, user.id]
    );

    if (sesi) {
      if (sesi.status === 'selesai') {
        return apiError('Anda sudah menyelesaikan ujian ini', 403);
      }

      // If existing session lacks urutan_soal, populate and persist it now
      if (!sesi.urutan_soal) {
        try {
          const examQuestions = await db.getAll(
            `SELECT s.id, s.tipe
             FROM soal s
             JOIN ujian_soal us ON us.soal_id = s.id
             WHERE us.ujian_id = ?
             ORDER BY us.urutan ASC`,
            [id]
          );
          if (examQuestions && examQuestions.length > 0) {
            const isAcak = ujian.acak_soal == 1 || ujian.acak_soal === true || ujian.acak_soal === '1';
            const ordered = isAcak
              ? shuffleQuestionsByType(examQuestions, `${user.id}_${id}_${sesi.id}`)
              : orderQuestionsByType(examQuestions);
            const idListJson = JSON.stringify(ordered.map(q => q.id));
            await db.run('UPDATE sesi_ujian SET urutan_soal = ? WHERE id = ?', [idListJson, sesi.id]);
            sesi.urutan_soal = idListJson;
          }
        } catch (_) {}
      }

      // Return existing session (resume)
      return apiResponse({ sesi, resumed: true });
    }

    // Create new session
    const sesiId = generateId('sesi');

    // Fetch exam questions to establish fixed order for this student's entire exam session
    let urutanSoalJson = null;
    try {
      const examQuestions = await db.getAll(
        `SELECT s.id, s.tipe
         FROM soal s
         JOIN ujian_soal us ON us.soal_id = s.id
         WHERE us.ujian_id = ?
         ORDER BY us.urutan ASC`,
        [id]
      );
      if (examQuestions && examQuestions.length > 0) {
        const isAcak = ujian.acak_soal == 1 || ujian.acak_soal === true || ujian.acak_soal === '1';
        const ordered = isAcak
          ? shuffleQuestionsByType(examQuestions, `${user.id}_${id}_${sesiId}`)
          : orderQuestionsByType(examQuestions);
        urutanSoalJson = JSON.stringify(ordered.map(q => q.id));
      }
    } catch (_) {}

    try {
      await db.run(
        `INSERT INTO sesi_ujian (id, ujian_id, siswa_id, waktu_mulai, status, urutan_soal)
         VALUES (?, ?, ?, datetime('now'), 'berlangsung', ?)`,
        [sesiId, id, user.id, urutanSoalJson]
      );
    } catch (_) {
      // Fallback if table does not yet have column
      await db.run(
        `INSERT INTO sesi_ujian (id, ujian_id, siswa_id, waktu_mulai, status)
         VALUES (?, ?, ?, datetime('now'), 'berlangsung')`,
        [sesiId, id, user.id]
      );
    }

    sesi = await db.getOne('SELECT * FROM sesi_ujian WHERE id = ?', [sesiId]);
    return apiResponse({ sesi, resumed: false }, 201);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Join exam error:', error);
    return apiError('Gagal bergabung ke ujian', 500);
  }
}
