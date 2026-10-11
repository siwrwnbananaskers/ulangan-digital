/**
 * Utility functions for the digital exam application
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique ID with optional prefix
 */
export function generateId(prefix = '') {
  const id = uuidv4().replace(/-/g, '').substring(0, 16);
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * Generate a 6-character exam code
 */
export function generateKodeUjian() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Format date to Indonesian locale
 */
export function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration in minutes to readable string
 */
export function formatDurasi(menit) {
  if (menit < 60) return `${menit} menit`;
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  return sisa > 0 ? `${jam} jam ${sisa} menit` : `${jam} jam`;
}

/**
 * Calculate exam score
 */
export function hitungNilai(jumlahBenar, totalSoal) {
  if (totalSoal === 0) return 0;
  return Math.round((jumlahBenar / totalSoal) * 100 * 100) / 100;
}

/**
 * Check if exam is within schedule
 */
export function isJadwalAktif(jadwalMulai, jadwalSelesai) {
  const now = new Date();
  const mulai = new Date(jadwalMulai);
  const selesai = new Date(jadwalSelesai);
  return now >= mulai && now <= selesai;
}

/**
 * Get remaining time in seconds
 */
export function sisaWaktu(waktuMulai, durasiMenit) {
  const mulai = new Date(waktuMulai);
  const selesai = new Date(mulai.getTime() + durasiMenit * 60 * 1000);
  const now = new Date();
  const sisa = Math.max(0, Math.floor((selesai - now) / 1000));
  return sisa;
}

/**
 * Validate required fields
 */
export function validateRequired(data, fields) {
  const errors = [];
  for (const field of fields) {
    if (!data[field] && data[field] !== 0) {
      errors.push(`${field} wajib diisi`);
    }
  }
  return errors;
}

/**
 * Create standardized API response with strong cache-control headers
 */
export function apiResponse(data, status = 200, customHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...customHeaders,
    },
  });
}

/**
 * Create error API response with strong cache-control headers
 */
export function apiError(message, status = 400) {
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
