/**
 * Auth API - Register
 * POST /api/auth/register
 */

import { getDB } from '@/lib/db';
import { hashPassword, sanitizeInput, requireRole, authErrorResponse } from '@/lib/auth';
import { apiResponse, apiError, generateId } from '@/lib/utils';

export async function POST(request) {
  try {
    // Only guru can register new users
    let currentUser;
    try {
      currentUser = await requireRole(request, 'guru');
    } catch (e) {
      return authErrorResponse(e);
    }

    const body = await request.json();
    const { username, password, nama, role, kelas, no_absen } = body;

    if (!username || !password || !nama || !role) {
      return apiError('Semua field wajib diisi', 400);
    }

    if (!['guru', 'siswa'].includes(role)) {
      return apiError('Role tidak valid', 400);
    }

    if (password.length < 4) {
      return apiError('Password minimal 4 karakter', 400);
    }

    const db = getDB();

    // Check if username exists
    const existing = await db.getOne(
      'SELECT id FROM users WHERE username = ?',
      [username.trim().toLowerCase()]
    );

    if (existing) {
      return apiError('Username sudah digunakan', 409);
    }

    const hashedPassword = await hashPassword(password);
    const id = generateId('usr');

    await db.run(
      `INSERT INTO users (id, username, password_hash, nama, role, kelas, no_absen)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, sanitizeInput(username.trim().toLowerCase()), hashedPassword, sanitizeInput(nama), role, kelas || null, no_absen || null]
    );

    return apiResponse({ success: true, id }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return apiError('Terjadi kesalahan saat registrasi', 500);
  }
}
