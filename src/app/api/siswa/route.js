/**
 * Siswa Management API (Guru only)
 * GET  /api/siswa - List students (filter by kelas)
 * POST /api/siswa - Add single or bulk students
 * DELETE /api/siswa - Delete student
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse, sanitizeInput, hashPassword } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

export async function GET(request) {
  try {
    await requireRole(request, 'guru');
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas');

    const db = getDB();
    let query = "SELECT id, username, nama, role, kelas, no_absen, created_at FROM users WHERE role = 'siswa'";
    const params = [];

    if (kelas) {
      query += ' AND kelas = ?';
      params.push(kelas);
    }
    query += ' ORDER BY kelas ASC, no_absen ASC, nama ASC';

    const siswaList = await db.getAll(query, params);
    const kelasList = await db.getAll("SELECT DISTINCT kelas FROM users WHERE role = 'siswa' AND kelas IS NOT NULL ORDER BY kelas ASC");

    return apiResponse({
      siswa: siswaList,
      kelas_options: kelasList.map(k => k.kelas).filter(Boolean),
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('List siswa error:', error);
    return apiError('Gagal memuat daftar siswa', 500);
  }
}

export async function POST(request) {
  try {
    const user = await requireRole(request, 'guru');
    const body = await request.json();
    const db = getDB();

    // Check demo limitation: demo user "guru" is limited to adding only 1 student
    if (user.role === 'guru' && user.username === 'guru') {
      const existingStudents = await db.getAll("SELECT id FROM users WHERE role = 'siswa'");
      // If already has 1 or more custom students created (or total students >= 1), limit reached
      if (existingStudents && existingStudents.length >= 1) {
        return Response.json({
          error: 'LIMIT_DEMO_REACHED',
          message: 'Batas Akun Demo Tercapai! Anda hanya dapat menambah 1 siswa untuk uji coba.',
          upgrade_required: true,
          wa_contact: '082175693537',
        }, { status: 403 });
      }
    }

    // Check if bulk insert
    if (Array.isArray(body.siswa)) {
      if (body.siswa.length === 0) {
        return apiError('Daftar siswa kosong', 400);
      }

      let createdCount = 0;
      let skippedCount = 0;
      const createdList = [];

      for (const item of body.siswa) {
        const username = item.username?.trim().toLowerCase();
        const nama = item.nama?.trim();
        const kelas = item.kelas?.trim();
        const no_absen = parseInt(item.no_absen) || null;
        const rawPassword = item.password?.trim() || 'guru123';

        if (!username || !nama) {
          skippedCount++;
          continue;
        }

        // Check if username exists
        const exists = await db.getOne('SELECT id FROM users WHERE username = ?', [username]);
        if (exists) {
          skippedCount++;
          continue;
        }

        const id = generateId('usr');
        const passwordHash = await hashPassword(rawPassword);

        await db.run(
          `INSERT INTO users (id, username, password_hash, nama, role, kelas, no_absen)
           VALUES (?, ?, ?, ?, 'siswa', ?, ?)`,
          [id, username, passwordHash, nama, kelas || null, no_absen]
        );

        createdList.push({
          id,
          username,
          nama,
          kelas,
          no_absen,
          raw_password: rawPassword,
        });
        createdCount++;
      }

      return apiResponse({
        success: true,
        message: `Berhasil menambahkan ${createdCount} siswa (${skippedCount} dilewati/duplikat)`,
        created_count: createdCount,
        skipped_count: skippedCount,
        created_siswa: createdList,
      }, 201);
    }

    // Single student insert
    const { username, nama, kelas, no_absen, password } = body;
    if (!username || !nama) {
      return apiError('Username dan nama wajib diisi', 400);
    }

    const cleanUsername = username.trim().toLowerCase();
    const exists = await db.getOne('SELECT id FROM users WHERE username = ?', [cleanUsername]);
    if (exists) {
      return apiError(`Username "${cleanUsername}" sudah digunakan`, 409);
    }

    const id = generateId('usr');
    const rawPassword = password?.trim() || 'guru123';
    const passwordHash = await hashPassword(rawPassword);

    await db.run(
      `INSERT INTO users (id, username, password_hash, nama, role, kelas, no_absen)
       VALUES (?, ?, ?, ?, 'siswa', ?, ?)`,
      [id, cleanUsername, passwordHash, sanitizeInput(nama.trim()), kelas?.trim() || null, parseInt(no_absen) || null]
    );

    return apiResponse({
      success: true,
      message: 'Siswa berhasil ditambahkan',
      siswa: {
        id,
        username: cleanUsername,
        nama: nama.trim(),
        kelas: kelas?.trim() || null,
        no_absen: parseInt(no_absen) || null,
      },
    }, 201);
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Create siswa error:', error);
    return apiError('Gagal menambahkan siswa', 500);
  }
}

export async function DELETE(request) {
  try {
    await requireRole(request, 'guru');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('ID siswa wajib diisi', 400);
    }

    const db = getDB();
    const target = await db.getOne("SELECT id, role FROM users WHERE id = ? AND role = 'siswa'", [id]);
    if (!target) {
      return apiError('Data siswa tidak ditemukan', 404);
    }

    // Clean up student responses and sessions
    await db.run('DELETE FROM jawaban WHERE sesi_id IN (SELECT id FROM sesi_ujian WHERE siswa_id = ?)', [id]);
    await db.run('DELETE FROM audit_log WHERE sesi_id IN (SELECT id FROM sesi_ujian WHERE siswa_id = ?)', [id]);
    await db.run('DELETE FROM sesi_ujian WHERE siswa_id = ?', [id]);
    await db.run('DELETE FROM users WHERE id = ?', [id]);

    return apiResponse({ success: true, message: 'Data siswa berhasil dihapus' });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Delete siswa error:', error);
    return apiError('Gagal menghapus siswa', 500);
  }
}
