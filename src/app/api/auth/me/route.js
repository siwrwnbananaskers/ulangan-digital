/**
 * Auth API - Logout, Current User & Profile Update
 * GET  /api/auth/me - Get current user profile (synced with Cloudflare D1)
 * PUT  /api/auth/me - Update user display name and profile photo (synced with Cloudflare D1)
 * POST /api/auth/me - Logout user
 */

import { getCurrentUser, generateToken, COOKIE_NAME } from '@/lib/auth';
import { getDB } from '@/lib/db';
import { apiResponse, apiError } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return apiError('Tidak terautentikasi', 401);
    }

    const db = getDB();
    // Ensure columns exist in SQLite / Cloudflare D1
    try {
      await db.run('ALTER TABLE users ADD COLUMN foto_profil TEXT');
    } catch (_) {}
    try {
      await db.run('ALTER TABLE users ADD COLUMN tanda_tangan TEXT');
    } catch (_) {}

    // Fetch fresh record from database
    const dbUser = await db.getOne(
      'SELECT id, username, nama, role, guru_id, kelas, no_absen, foto_profil, tanda_tangan FROM users WHERE id = ?',
      [user.id]
    );

    const freshUser = dbUser || user;
    return apiResponse({ user: freshUser });
  } catch (error) {
    console.error('Error in GET /api/auth/me:', error);
    return apiError('Terjadi kesalahan saat memuat profil', 500);
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return apiError('Tidak terautentikasi', 401);
    }

    const body = await request.json();
    const { nama, foto_profil, tanda_tangan } = body;

    if (!nama || !nama.trim()) {
      return apiError('Nama lengkap tidak boleh kosong', 400);
    }

    const db = getDB();

    // Ensure columns exist in SQLite/Cloudflare D1 schema
    try {
      await db.run('ALTER TABLE users ADD COLUMN foto_profil TEXT');
    } catch (_) {}
    try {
      await db.run('ALTER TABLE users ADD COLUMN tanda_tangan TEXT');
    } catch (_) {}

    const cleanNama = nama.trim();
    const cleanFoto = foto_profil !== undefined ? foto_profil : null;
    const cleanTtd = tanda_tangan !== undefined ? tanda_tangan : null;

    // Persist to Cloudflare D1 SQL database
    await db.run(
      'UPDATE users SET nama = ?, foto_profil = ?, tanda_tangan = ?, updated_at = datetime("now") WHERE id = ?',
      [cleanNama, cleanFoto, cleanTtd, user.id]
    );

    // Fetch freshly updated row
    const updatedUser = await db.getOne(
      'SELECT id, username, nama, role, guru_id, kelas, no_absen, foto_profil, tanda_tangan FROM users WHERE id = ?',
      [user.id]
    );

    const resultUser = updatedUser || { ...user, nama: cleanNama, foto_profil: cleanFoto, tanda_tangan: cleanTtd };
    const newToken = generateToken(resultUser);

    const response = apiResponse({
      success: true,
      message: 'Profil berhasil diperbarui dan disinkronkan ke database',
      user: resultUser,
      token: newToken,
    });

    // Update session cookie with new token
    response.headers.set(
      'Set-Cookie',
      `${COOKIE_NAME}=${newToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${24 * 3600}`
    );

    return response;
  } catch (error) {
    console.error('Error in PUT /api/auth/me:', error);
    return apiError('Gagal memperbarui profil: ' + error.message, 500);
  }
}

export async function POST(request) {
  const response = apiResponse({ success: true, message: 'Berhasil logout' });
  response.headers.set(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
  );
  return response;
}
