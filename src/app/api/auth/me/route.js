/**
 * Auth API - Logout & Me
 * POST /api/auth/logout - Logout user
 * GET /api/auth/me - Get current user
 */

import { getCurrentUser, COOKIE_NAME } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/utils';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return apiError('Tidak terautentikasi', 401);
    }
    return apiResponse({ user });
  } catch (error) {
    return apiError('Terjadi kesalahan', 500);
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
