/**
 * Siswa Management API
 * GET    /api/siswa - List students (filtered by teacher for guru, all or filtered for superadmin)
 * POST   /api/siswa - Add single or bulk students (assigned to current teacher)
 * PUT    /api/siswa - Update student details & password (CRUD edit)
 * DELETE /api/siswa - Delete single, selected, or all students
 */

import { getDB } from '@/lib/db';
import { requireRole, authErrorResponse, sanitizeInput, hashPassword } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

let _migrationChecked = false;
async function ensureSchema(db) {
  if (_migrationChecked) return;
  try {
    await db.run('ALTER TABLE users ADD COLUMN password_plain TEXT');
  } catch (e) {
    // Column already exists or alter table skipped
  }
  try {
    await db.run("UPDATE users SET password_plain = '123456' WHERE role = 'siswa' AND (password_plain IS NULL OR password_plain = '')");
  } catch (e) {
    // ignore
  }
  _migrationChecked = true;
}

export async function GET(request) {
  try {
    const user = await requireRole(request, 'guru');
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas');
    const guruFilter = searchParams.get('guru_id');

    const db = getDB();
    await ensureSchema(db);

    let query = "SELECT id, username, nama, role, guru_id, kelas, no_absen, password_plain, created_at FROM users WHERE role = 'siswa'";
    const params = [];

    const isSuperadmin = user.role === 'superadmin';

    if (!isSuperadmin) {
      // Guru can ONLY see their own students (or unassigned demo students if current teacher is demo guru)
      query += ' AND (guru_id = ? OR guru_id IS NULL)';
      params.push(user.id);
    } else if (guruFilter) {
      // Superadmin filtering by a specific teacher
      query += ' AND guru_id = ?';
      params.push(guruFilter);
    }

    if (kelas) {
      query += ' AND kelas = ?';
      params.push(kelas);
    }
    query += ' ORDER BY kelas ASC, no_absen ASC, nama ASC';

    let siswaRaw = [];
    try {
      siswaRaw = await db.getAll(query, params);
    } catch {
      // Fallback query without password_plain if column not yet queried
      const fallbackQuery = query.replace(', password_plain', '');
      siswaRaw = await db.getAll(fallbackQuery, params);
    }

    // Enrich with teacher names for superadmin view & default password fallback
    const siswaList = await Promise.all(
      (siswaRaw || []).map(async (s) => {
        const plainPwd = s.password_plain || '123456';
        let namaGuru = s.nama_guru;
        if (!namaGuru) {
          if (s.guru_id) {
            try {
              const g = await db.getOne('SELECT nama FROM users WHERE id = ?', [s.guru_id]);
              namaGuru = g?.nama || 'Guru';
            } catch {
              namaGuru = 'Guru';
            }
          } else {
            namaGuru = 'Guru Demo, S.Pd.';
          }
        }
        return {
          ...s,
          password_plain: plainPwd,
          nama_guru: namaGuru,
        };
      })
    );

    // Get available classes for filter dropdown
    let kelasQuery = "SELECT DISTINCT kelas FROM users WHERE role = 'siswa' AND kelas IS NOT NULL";
    const kelasParams = [];
    if (!isSuperadmin) {
      kelasQuery += ' AND (guru_id = ? OR guru_id IS NULL)';
      kelasParams.push(user.id);
    } else if (guruFilter) {
      kelasQuery += ' AND guru_id = ?';
      kelasParams.push(guruFilter);
    }
    kelasQuery += ' ORDER BY kelas ASC';

    const kelasList = await db.getAll(kelasQuery, kelasParams);

    // If superadmin, fetch all registered teachers for filter selector
    let teacherOptions = [];
    if (isSuperadmin) {
      try {
        teacherOptions = await db.getAll("SELECT id, username, nama FROM users WHERE role = 'guru' ORDER BY nama ASC") || [];
      } catch (err) {
        console.warn('Teacher list fetch error:', err.message);
      }
    }

    return apiResponse({
      siswa: siswaList,
      kelas_options: kelasList.map(k => k.kelas).filter(Boolean),
      is_superadmin: isSuperadmin,
      teacher_options: teacherOptions,
      current_teacher_id: user.id,
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
    await ensureSchema(db);

    // Target teacher owner: current guru, or if superadmin specified a target teacher
    const targetGuruId = (user.role === 'superadmin' && body.guru_id) ? body.guru_id : user.id;

    // Check demo limitation: demo user "guru" is limited to adding only 1 student
    if (user.role === 'guru' && user.username === 'guru') {
      const existingStudents = await db.getAll("SELECT id FROM users WHERE role = 'siswa' AND (guru_id = ? OR guru_id IS NULL)", [user.id]);
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
        const rawPassword = item.password?.trim() || '123456';

        if (!username || !nama) {
          skippedCount++;
          continue;
        }

        const exists = await db.getOne('SELECT id, role FROM users WHERE username = ?', [username]);
        if (exists) {
          if (exists.role === 'siswa') {
            // Update existing student and link to current teacher
            const passwordHash = await hashPassword(rawPassword);
            await db.run(
              `UPDATE users 
               SET nama = ?, kelas = ?, no_absen = ?, password_hash = ?, password_plain = ?, guru_id = ?, updated_at = datetime('now')
               WHERE id = ?`,
              [sanitizeInput(nama), kelas || null, no_absen, passwordHash, rawPassword, targetGuruId, exists.id]
            );
            createdList.push({
              id: exists.id,
              username,
              nama,
              kelas,
              no_absen,
              password_plain: rawPassword,
              updated: true,
            });
            createdCount++;
            continue;
          } else {
            skippedCount++;
            continue;
          }
        }

        const id = generateId('usr');
        const passwordHash = await hashPassword(rawPassword);

        await db.run(
          `INSERT INTO users (id, username, password_hash, password_plain, nama, role, guru_id, kelas, no_absen)
           VALUES (?, ?, ?, ?, ?, 'siswa', ?, ?, ?)`,
          [id, username, passwordHash, rawPassword, sanitizeInput(nama), targetGuruId, kelas || null, no_absen]
        );

        createdList.push({
          id,
          username,
          nama,
          kelas,
          no_absen,
          password_plain: rawPassword,
        });
        createdCount++;
      }

      return apiResponse({
        success: true,
        message: skippedCount > 0 
          ? `Berhasil memproses ${createdCount} siswa (${skippedCount} dilewati karena bentrok akun guru/admin)`
          : `Berhasil menambahkan/memperbarui seluruh ${createdCount} siswa!`,
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
    const exists = await db.getOne('SELECT id, role, guru_id FROM users WHERE username = ?', [cleanUsername]);
    const rawPassword = password?.trim() || '123456';
    const passwordHash = await hashPassword(rawPassword);

    if (exists) {
      if (exists.role === 'siswa') {
        // Update existing student and link to target teacher
        await db.run(
          `UPDATE users 
           SET nama = ?, kelas = ?, no_absen = ?, password_hash = ?, password_plain = ?, guru_id = ?, updated_at = datetime('now')
           WHERE id = ?`,
          [sanitizeInput(nama.trim()), kelas?.trim() || null, parseInt(no_absen) || null, passwordHash, rawPassword, targetGuruId, exists.id]
        );
        return apiResponse({
          success: true,
          message: 'Data siswa berhasil diperbarui',
          siswa: {
            id: exists.id,
            username: cleanUsername,
            nama: nama.trim(),
            guru_id: targetGuruId,
            kelas: kelas?.trim() || null,
            no_absen: parseInt(no_absen) || null,
            password_plain: rawPassword,
          },
        });
      }
      return apiError(`Username "${cleanUsername}" sudah digunakan oleh akun guru atau admin`, 409);
    }

    const id = generateId('usr');

    await db.run(
      `INSERT INTO users (id, username, password_hash, password_plain, nama, role, guru_id, kelas, no_absen)
       VALUES (?, ?, ?, ?, ?, 'siswa', ?, ?, ?)`,
      [id, cleanUsername, passwordHash, rawPassword, sanitizeInput(nama.trim()), targetGuruId, kelas?.trim() || null, parseInt(no_absen) || null]
    );

    return apiResponse({
      success: true,
      message: 'Siswa berhasil ditambahkan',
      siswa: {
        id,
        username: cleanUsername,
        nama: nama.trim(),
        guru_id: targetGuruId,
        kelas: kelas?.trim() || null,
        no_absen: parseInt(no_absen) || null,
        password_plain: rawPassword,
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

export async function PUT(request) {
  try {
    const user = await requireRole(request, 'guru');
    const body = await request.json();
    const db = getDB();
    await ensureSchema(db);

    const { id, username, nama, kelas, no_absen, password } = body;
    if (!id || !username || !nama) {
      return apiError('ID, username, dan nama siswa wajib diisi', 400);
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check target student exists
    const target = await db.getOne("SELECT id, role, guru_id, password_hash, password_plain FROM users WHERE id = ? AND role = 'siswa'", [id]);
    if (!target) {
      return apiError('Data siswa tidak ditemukan', 404);
    }

    // Teacher isolation check
    if (user.role === 'guru' && target.guru_id && target.guru_id !== user.id) {
      return apiError('Anda tidak memiliki akses untuk mengubah siswa ini', 403);
    }

    // Check unique username constraint if username was changed
    if (cleanUsername !== target.username) {
      const existingUser = await db.getOne('SELECT id FROM users WHERE username = ? AND id != ?', [cleanUsername, id]);
      if (existingUser) {
        return apiError(`Username "${cleanUsername}" sudah digunakan oleh akun lain`, 409);
      }
    }

    let passwordHash = target.password_hash;
    let passwordPlain = target.password_plain || '123456';

    if (password && password.trim()) {
      passwordPlain = password.trim();
      passwordHash = await hashPassword(passwordPlain);
    }

    await db.run(
      `UPDATE users 
       SET username = ?, nama = ?, kelas = ?, no_absen = ?, password_hash = ?, password_plain = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [cleanUsername, sanitizeInput(nama.trim()), kelas?.trim() || null, parseInt(no_absen) || null, passwordHash, passwordPlain, id]
    );

    return apiResponse({
      success: true,
      message: `Data siswa "${nama.trim()}" berhasil diperbarui`,
      siswa: {
        id,
        username: cleanUsername,
        nama: nama.trim(),
        kelas: kelas?.trim() || null,
        no_absen: parseInt(no_absen) || null,
        password_plain: passwordPlain,
      },
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Update siswa error:', error);
    return apiError('Gagal memperbarui data siswa', 500);
  }
}

export async function DELETE(request) {
  try {
    const user = await requireRole(request, 'guru');
    const db = getDB();
    await ensureSchema(db);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const isAll = searchParams.get('all') === 'true';

    let idsToDelete = [];

    if (id) {
      idsToDelete = [id];
    } else if (isAll) {
      // Find all students belonging to this teacher
      let studentQuery = "SELECT id FROM users WHERE role = 'siswa'";
      const qParams = [];
      if (user.role !== 'superadmin') {
        studentQuery += " AND (guru_id = ? OR guru_id IS NULL)";
        qParams.push(user.id);
      }
      const allStudents = await db.getAll(studentQuery, qParams);
      idsToDelete = (allStudents || []).map(s => s.id);
    } else {
      // Parse JSON body for array of ids
      try {
        const body = await request.json();
        if (Array.isArray(body?.ids)) {
          idsToDelete = body.ids;
        }
      } catch {}
    }

    if (idsToDelete.length === 0) {
      return apiError('Pilih minimal 1 siswa untuk dihapus', 400);
    }

    let deletedCount = 0;
    for (const sid of idsToDelete) {
      const target = await db.getOne("SELECT id, role, guru_id FROM users WHERE id = ? AND role = 'siswa'", [sid]);
      if (!target) continue;

      // Non-superadmin teachers can only delete their own students
      if (user.role === 'guru' && target.guru_id && target.guru_id !== user.id) {
        continue;
      }

      // Cascade delete student responses, logs, and sessions
      await db.run('DELETE FROM jawaban WHERE sesi_id IN (SELECT id FROM sesi_ujian WHERE siswa_id = ?)', [sid]);
      await db.run('DELETE FROM audit_log WHERE sesi_id IN (SELECT id FROM sesi_ujian WHERE siswa_id = ?)', [sid]);
      await db.run('DELETE FROM sesi_ujian WHERE siswa_id = ?', [sid]);
      await db.run('DELETE FROM users WHERE id = ?', [sid]);
      deletedCount++;
    }

    return apiResponse({ 
      success: true, 
      message: `Berhasil menghapus ${deletedCount} siswa`,
      deleted_count: deletedCount 
    });
  } catch (error) {
    if (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN') {
      return authErrorResponse(error);
    }
    console.error('Delete siswa error:', error);
    return apiError('Gagal menghapus siswa', 500);
  }
}
