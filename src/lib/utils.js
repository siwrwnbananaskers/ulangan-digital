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
 * Format date to Indonesian locale in WIB (Asia/Jakarta)
 */
export function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  let str = String(dateStr).trim();

  // If SQLite datetime('now') format "YYYY-MM-DD HH:mm:ss" without timezone, it is stored in UTC
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str + 'Z';
  }

  const date = new Date(str);
  if (isNaN(date.getTime())) return String(dateStr);

  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
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
 * Parse date string reliably assuming WIB (UTC+7) if timezone is not specified
 */
export function parseWaktuWIB(dateStr) {
  if (!dateStr) return NaN;
  // If already contains timezone indicator Z or +/-, parse as is
  if (dateStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dateStr)) {
    return new Date(dateStr).getTime();
  }
  // If string is YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm:ss without timezone, treat as WIB (UTC+7)
  const clean = dateStr.replace(' ', 'T');
  const withTz = `${clean}:00`.substring(0, 19) + '+07:00';
  const t = new Date(withTz).getTime();
  if (!isNaN(t)) return t;
  return new Date(dateStr).getTime();
}

/**
 * Check if exam is within schedule
 */
export function isJadwalAktif(jadwalMulai, jadwalSelesai) {
  const now = Date.now();
  const mulai = parseWaktuWIB(jadwalMulai);
  const selesai = parseWaktuWIB(jadwalSelesai);
  return now >= (mulai - 10 * 60 * 1000) && now <= selesai;
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
