/**
 * Auth API - Login
 * POST /api/auth/login
 */

import { getDB } from '@/lib/db';
import { comparePassword, generateToken, sanitizeInput, COOKIE_NAME } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/utils';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return apiError('Username dan password wajib diisi', 400);
    }

    const db = getDB();
    const user = await db.getOne(
      'SELECT * FROM users WHERE username = ?',
      [sanitizeInput(username.trim().toLowerCase())]
    );

    if (!user) {
      return apiError('Username atau password salah', 401);
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return apiError('Username atau password salah', 401);
    }

    const token = generateToken(user);

    const response = apiResponse({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        guru_id: user.guru_id || null,
        kelas: user.kelas,
        no_absen: user.no_absen || null,
        foto_profil: user.foto_profil || null,
      },
    });

    // Set HTTP-only cookie
    response.headers.set(
      'Set-Cookie',
      `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${24 * 60 * 60}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    );

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return apiError(error.message || 'Terjadi kesalahan saat login', 500);
  }
}
