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
 * Format date to concise Indonesian WIB string (e.g., "14 Okt 2026, 09.19 WIB")
 * Guarantees proper UTC to Asia/Jakarta (+7h) conversion regardless of local browser timezone.
 */
export function formatWIB(dateInput, includeWeekday = false) {
  if (!dateInput) return '-';
  let str = String(dateInput).trim();

  if (dateInput instanceof Date) {
    str = dateInput.toISOString();
  }

  // If SQLite datetime('now') format "YYYY-MM-DD HH:mm:ss" without timezone, it is stored in UTC
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(str)) {
    str = str + 'Z';
  }

  const date = new Date(str);
  if (isNaN(date.getTime())) return String(dateInput);

  const day = date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric' });
  const month = date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', month: includeWeekday ? 'long' : 'short' });
  const year = date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric' });
  const hour = date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false });
  const minute = date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', minute: '2-digit', hour12: false });

  if (includeWeekday) {
    const weekday = date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' });
    return `${weekday}, ${day} ${month} ${year} pukul ${hour}.${minute} WIB`;
  }

  return `${day} ${month} ${year}, ${hour}.${minute} WIB`;
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
 * Shuffle array (Fisher-Yates) using standard Math.random
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 * Produces reproducible pseudo-random floats in [0, 1) based on a string seed
 */
export function createSeededRandom(seedStr) {
  const str = String(seedStr || 'default_seed');
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle array with a custom PRNG function (e.g. seeded random)
 */
export function shuffleArraySeeded(array, rng = Math.random) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Group questions into distinct categories:
 * 1. Pilihan Ganda (pg)
 * 2. Benar / Salah (benar_salah)
 * 3. Isian Singkat (isian)
 * 4. Uraian / Essay (uraian)
 * 5. Lainnya (others)
 */
export function groupQuestionsByType(questions) {
  const groups = {
    pg: [],
    benar_salah: [],
    isian: [],
    uraian: [],
    others: [],
  };

  if (!Array.isArray(questions)) return groups;

  for (const q of questions) {
    if (!q) continue;
    const type = String(q.tipe || 'pg').toLowerCase().trim();
    if (type === 'pg' || type === 'pilihan ganda' || type === 'mcq') {
      groups.pg.push(q);
    } else if (type === 'benar_salah' || type === 'benar/salah' || type === 'b/s' || type === 'bs') {
      groups.benar_salah.push(q);
    } else if (type === 'isian' || type === 'isian singkat' || type === 'short answer') {
      groups.isian.push(q);
    } else if (type === 'uraian' || type === 'esai' || type === 'essay') {
      groups.uraian.push(q);
    } else {
      groups.others.push(q);
    }
  }

  return groups;
}

/**
 * Order questions standardly by type (PG first, then Benar-Salah, Isian, and Uraian/Essay at the bottom)
 * Preserves existing order within each group.
 */
export function orderQuestionsByType(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return [];
  const groups = groupQuestionsByType(questions);
  return [
    ...groups.pg,
    ...groups.benar_salah,
    ...groups.isian,
    ...groups.uraian,
    ...groups.others,
  ];
}

/**
 * Shuffles questions strictly WITHIN their own question type.
 * - Pilihan Ganda are shuffled only amongst Pilihan Ganda (always on top)
 * - Benar/Salah are shuffled only amongst Benar/Salah
 * - Isian are shuffled only amongst Isian
 * - Uraian/Essay are shuffled only amongst Uraian/Essay (always at the bottom)
 *
 * Seed is deterministic per student session so refreshes do not disrupt order.
 */
export function shuffleQuestionsByType(questions, seedStr = '') {
  if (!Array.isArray(questions) || questions.length === 0) return [];

  const groups = groupQuestionsByType(questions);
  const rng = seedStr ? createSeededRandom(seedStr) : Math.random;

  const shuffledPg = shuffleArraySeeded(groups.pg, rng);
  const shuffledBenarSalah = shuffleArraySeeded(groups.benar_salah, rng);
  const shuffledIsian = shuffleArraySeeded(groups.isian, rng);
  const shuffledUraian = shuffleArraySeeded(groups.uraian, rng);
  const shuffledOthers = shuffleArraySeeded(groups.others, rng);

  return [
    ...shuffledPg,
    ...shuffledBenarSalah,
    ...shuffledIsian,
    ...shuffledUraian,
    ...shuffledOthers,
  ];
}

