import fs from 'fs';
import path from 'path';
import os from 'os';

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

const STORE_PATHS = [
  path.join(process.env.VERCEL ? '/tmp' : (process.env.TEMP || os.tmpdir()), 'ulangan_digital_db_store_v3.json'),
  path.join(process.env.VERCEL ? '/tmp' : (process.env.TEMP || os.tmpdir()), 'ulangan_digital_db_store_v2.json'),
  path.join(process.env.VERCEL ? '/tmp' : (process.env.TEMP || os.tmpdir()), 'ulangan_digital_db_store.json'),
];
const STORE_PATH = STORE_PATHS[0];

function sanitizeStore(store) {
  if (!store || typeof store !== 'object') return store;
  if (!Array.isArray(store.deleted_usernames)) {
    store.deleted_usernames = [];
  }

  // 1. Maintain users safely - preserve any real teacher created by superadmin
  if (Array.isArray(store.users)) {
    store.users = store.users.filter(u => u && !store.deleted_usernames.includes(u.username));
    
    // Ensure default demo teacher exists
    if (!store.users.some(u => u.username === 'guru')) {
      store.users.push({
        id: 'usr_guru_001',
        username: 'guru',
        password_hash: '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm',
        nama: 'Guru Demo, S.Pd.',
        role: 'guru',
        kelas: null,
        no_absen: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Ensure official teacher exists if no other teacher exists
    const hasOtherTeacher = store.users.some(u => u.role === 'guru' && u.username !== 'guru');
    if (!hasOtherTeacher) {
      store.users.push({
        id: 'usr_guru_002',
        username: 'novisa',
        password_hash: '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm',
        nama: 'NOVISA MAHARANI, S.Pd',
        role: 'guru',
        kelas: null,
        no_absen: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  // 2. Filter invalid questions or demo question leaks
  if (Array.isArray(store.soal)) {
    store.soal = store.soal.filter(s => {
      if (!s || !s.id) return false;
      if (s.id.startsWith('soal_demo_')) {
        s.guru_id = 'usr_guru_001';
      }
      return true;
    });
  }

  // 3. Filter corrupted exams (ghost exams without title or mapel)
  if (Array.isArray(store.ujian)) {
    store.ujian = store.ujian.filter(u => {
      if (!u || !u.id) return false;
      // Strip blank ghost cards that have no title and no subject
      if (!u.judul && !u.mata_pelajaran && !u.kode_ujian) return false;
      if (u.id.startsWith('ujn_demo_')) {
        u.guru_id = 'usr_guru_001';
      }
      return true;
    });
  }

  // 4. Ensure junction mappings clean
  if (Array.isArray(store.ujian_soal)) {
    store.ujian_soal = store.ujian_soal.filter(us => us && us.id && us.ujian_id && us.soal_id);
  }

  return store;
}

function loadPersistedStore() {
  for (const p of STORE_PATHS) {
    try {
      if (fs.existsSync(p)) {
        const data = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(data);
        if (parsed && Array.isArray(parsed.users)) {
          // Merge with initialStore so initial accounts and new accounts coexist safely
          const mergedUsers = [...initialStore.users];
          for (const u of parsed.users) {
            if (!mergedUsers.some(m => m.id === u.id || m.username === u.username)) {
              mergedUsers.push(u);
            }
          }
          parsed.users = mergedUsers;
          return sanitizeStore(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

function savePersistedStore(store) {
  try {
    const clean = sanitizeStore(store);
    fs.writeFileSync(STORE_PATH, JSON.stringify(clean), 'utf8');
  } catch (e) {
    // ignore
  }
}

// Initial in-memory fallback database state
const initialStore = {
  deleted_usernames: ['novisa'],
  users: [
    {
      id: 'usr_superadmin_001',
      username: 'superadmin',
      password_hash: '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', // admin123 / guru123
      nama: 'Super Admin Wozber (Owner)',
      role: 'superadmin',
      kelas: null,
      no_absen: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_guru_001',
      username: 'guru',
      password_hash: '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', // guru123
      nama: 'Guru Demo, S.Pd.',
      role: 'guru',
      kelas: null,
      no_absen: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_guru_002',
      username: 'apim',
      password_hash: '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', // guru123
      nama: 'NOVISA MAHARANI, S.Pd',
      role: 'guru',
      kelas: null,
      no_absen: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_siswa_001',
      username: 'siswa1',
      password_hash: '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', // guru123
      nama: 'Ahmad Rizki Pratama',
      role: 'siswa',
      guru_id: 'usr_guru_001',
      kelas: 'XII-IPA-1',
      no_absen: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_siswa_002',
      username: 'siswa2',
      password_hash: '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm',
      nama: 'Siti Nurhaliza',
      role: 'siswa',
      guru_id: 'usr_guru_001',
      kelas: 'XII-IPA-1',
      no_absen: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'usr_siswa_003',
      username: 'siswa3',
      password_hash: '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm',
      nama: 'Budi Santoso',
      role: 'siswa',
      guru_id: 'usr_guru_001',
      kelas: 'XII-IPA-1',
      no_absen: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  soal: [
    {
      id: 'soal_demo_001',
      guru_id: 'usr_guru_001',
      mata_pelajaran: 'Matematika',
      tipe: 'pg',
      pertanyaan: 'Berapakah turunan pertama dari f(x) = 3x² + 5x - 7 ?',
      pilihan_a: '6x + 5',
      pilihan_b: '3x + 5',
      pilihan_c: '6x - 7',
      pilihan_d: '5x + 3',
      pilihan_e: '6x² + 5',
      kunci_jawaban: 'a',
      bobot: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'soal_demo_002',
      guru_id: 'usr_guru_001',
      mata_pelajaran: 'Matematika',
      tipe: 'pg',
      pertanyaan: 'Jika log 2 = 0.301 dan log 3 = 0.477, maka nilai log 6 adalah...',
      pilihan_a: '0.176',
      pilihan_b: '0.778',
      pilihan_c: '0.143',
      pilihan_d: '0.602',
      pilihan_e: '0.954',
      kunci_jawaban: 'b',
      bobot: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'soal_demo_003',
      guru_id: 'usr_guru_001',
      mata_pelajaran: 'Matematika',
      tipe: 'isian',
      pertanyaan: 'Berapakah nilai dari 2 pangkat 5?',
      pilihan_a: null,
      pilihan_b: null,
      pilihan_c: null,
      pilihan_d: null,
      pilihan_e: null,
      kunci_jawaban: '32',
      bobot: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'soal_demo_004',
      guru_id: 'usr_guru_001',
      mata_pelajaran: 'Matematika',
      tipe: 'benar_salah',
      pertanyaan: 'Segitiga siku-siku dengan panjang sisi 3 cm dan 4 cm memiliki sisi miring sepanjang 5 cm.',
      pilihan_a: null,
      pilihan_b: null,
      pilihan_c: null,
      pilihan_d: null,
      pilihan_e: null,
      kunci_jawaban: 'Benar',
      bobot: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'soal_demo_005',
      guru_id: 'usr_guru_001',
      mata_pelajaran: 'Matematika',
      tipe: 'uraian',
      pertanyaan: 'Jelaskan teorema Pythagoras dan tuliskan rumusnya secara lengkap beserta contoh penggunaannya.',
      pilihan_a: null,
      pilihan_b: null,
      pilihan_c: null,
      pilihan_d: null,
      pilihan_e: null,
      kunci_jawaban: 'a² + b² = c²',
      bobot: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  ujian: [
    {
      id: 'ujn_demo_001',
      guru_id: 'usr_guru_001',
      judul: 'Penilaian Harian Matematika Wajib',
      mata_pelajaran: 'Matematika',
      kelas_target: 'XII-IPA-1',
      kode_ujian: 'MAT123',
      deskripsi: 'Kerjakan soal dengan teliti, dilarang membuka browser/tab lain.',
      durasi_menit: 90,
      jadwal_mulai: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      jadwal_selesai: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      jumlah_soal: 5,
      kkm: 75,
      acak_soal: 0,
      acak_jawaban: 0,
      tampilkan_nilai: 1,
      batas_pelanggaran: 3,
      status: 'aktif',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  ujian_soal: [
    { id: 'us_1', ujian_id: 'ujn_demo_001', soal_id: 'soal_demo_001', urutan: 1 },
    { id: 'us_2', ujian_id: 'ujn_demo_001', soal_id: 'soal_demo_002', urutan: 2 },
    { id: 'us_3', ujian_id: 'ujn_demo_001', soal_id: 'soal_demo_003', urutan: 3 },
    { id: 'us_4', ujian_id: 'ujn_demo_001', soal_id: 'soal_demo_004', urutan: 4 },
    { id: 'us_5', ujian_id: 'ujn_demo_001', soal_id: 'soal_demo_005', urutan: 5 },
  ],
  sesi_ujian: [],
  jawaban: [],
  audit_log: [],
};

// Use globalThis singleton to prevent memory resets across lambda executions in Node
if (!globalThis.__ULANGAN_DIGITAL_STORE__) {
  const disk = loadPersistedStore();
  globalThis.__ULANGAN_DIGITAL_STORE__ = disk || initialStore;
}
const fallbackStore = globalThis.__ULANGAN_DIGITAL_STORE__;

function extractD1Results(data) {
  if (!data) return { results: [], meta: {} };
  if (Array.isArray(data.result) && data.result.length > 0) {
    const first = data.result[0];
    if (first && Array.isArray(first.results)) {
      return { results: first.results, meta: first.meta || {} };
    }
    if (Array.isArray(first)) {
      return { results: first, meta: {} };
    }
    return { results: data.result, meta: {} };
  }
  if (data.result && Array.isArray(data.result.results)) {
    return { results: data.result.results, meta: data.result.meta || {} };
  }
  if (Array.isArray(data.results)) {
    return { results: data.results, meta: data.meta || {} };
  }
  return { results: [], meta: {} };
}

class D1Client {
  constructor() {
    this.accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
    this.databaseId = (process.env.CLOUDFLARE_D1_DATABASE_ID || '').trim();
    this.apiToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
    this.isCloudflare = !!(this.accountId && this.databaseId && this.apiToken);
  }

  normalizeRow(row) {
    if (!row || typeof row !== 'object') return row;
    const clean = {};
    for (const [key, value] of Object.entries(row)) {
      clean[key] = value;
      // Handle table prefix e.g. "u.judul"
      if (key.includes('.')) {
        const shortKey = key.split('.').pop();
        if (clean[shortKey] === undefined) {
          clean[shortKey] = value;
        }
      }
      // Handle alias artifact e.g. "u.judul as judul"
      if (key.toLowerCase().includes(' as ')) {
        const aliasKey = key.split(/\s+as\s+/i).pop().trim();
        if (clean[aliasKey] === undefined) {
          clean[aliasKey] = value;
        }
      }
    }
    return clean;
  }

  /**
   * Execute query via Cloudflare D1 REST API or fallback memory store
   */
  async query(sql, params = []) {
    if (this.isCloudflare) {
      const url = `${CLOUDFLARE_API_BASE}/accounts/${this.accountId}/d1/database/${this.databaseId}/query`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql, params }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`D1 API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
        }

        const res = extractD1Results(data);
        if (Array.isArray(res.results)) {
          res.results = res.results.map(r => this.normalizeRow(r));
        }
        return res;
      } catch (error) {
        console.warn('⚠️ Cloudflare D1 query failed, using resilient fallback store:', error.message);
        return this.executeFallback(sql, params);
      }
    }

    // Fallback in-memory handler
    return this.executeFallback(sql, params);
  }

  /**
   * Fallback in-memory and file-persisted query handler
   */
  executeFallback(sql, params = []) {
    // Sync latest from persisted disk store if exists
    const persisted = loadPersistedStore();
    if (persisted) {
      if (Array.isArray(persisted.users)) fallbackStore.users = persisted.users;
      if (Array.isArray(persisted.soal)) fallbackStore.soal = persisted.soal;
      if (Array.isArray(persisted.ujian)) fallbackStore.ujian = persisted.ujian;
      if (Array.isArray(persisted.ujian_soal)) fallbackStore.ujian_soal = persisted.ujian_soal;
      if (Array.isArray(persisted.sesi_ujian)) fallbackStore.sesi_ujian = persisted.sesi_ujian;
      if (Array.isArray(persisted.jawaban)) fallbackStore.jawaban = persisted.jawaban;
      if (Array.isArray(persisted.audit_log)) fallbackStore.audit_log = persisted.audit_log;
    }
    sanitizeStore(fallbackStore);

    const s = sql.trim();
    const upper = s.toUpperCase();

    // 1. SELECT queries
    if (upper.startsWith('SELECT')) {
      // 1.1 Dedicated COUNT queries (MUST ONLY match outer SELECT COUNT(...) statements!)
      // DO NOT match queries where COUNT is in a subquery projection!
      const isCountOnly = /^\s*SELECT\s+COUNT\s*\(/i.test(s);
      if (isCountOnly) {
        let count = 0;
        if (upper.includes('FROM USERS')) {
          if (upper.includes("ROLE = 'GURU'") || (upper.includes("ROLE = ?") && params[0] === 'guru')) {
            count = fallbackStore.users.filter(u => u.role === 'guru').length;
          } else if (upper.includes("ROLE = 'SISWA'") || (upper.includes("ROLE = ?") && params.includes('siswa'))) {
            let list = fallbackStore.users.filter(u => u.role === 'siswa');
            if (upper.includes('GURU_ID = ?') || upper.includes('GURU_ID=')) {
              const gId = params[params.length - 1];
              list = list.filter(u => u.guru_id === gId || (!u.guru_id && gId === 'usr_guru_001'));
            }
            count = list.length;
          } else {
            count = fallbackStore.users.length;
          }
        } else if (upper.includes('FROM UJIAN')) {
          if (upper.includes('GURU_ID = ?') || upper.includes('GURU_ID=')) {
            count = fallbackStore.ujian.filter(u => u.guru_id === params[0]).length;
          } else {
            count = fallbackStore.ujian.length;
          }
        } else if (upper.includes('FROM SOAL')) {
          if (upper.includes('GURU_ID = ?') || upper.includes('GURU_ID=')) {
            count = fallbackStore.soal.filter(s => s.guru_id === params[0]).length;
          } else {
            count = fallbackStore.soal.length;
          }
        } else if (upper.includes('FROM AUDIT_LOG')) {
          if (upper.includes('SESI_ID = ?')) {
            count = fallbackStore.audit_log.filter(a => a.sesi_id === params[0]).length;
          } else if (upper.includes('UJIAN_ID = ?')) {
            count = fallbackStore.audit_log.filter(a => a.ujian_id === params[0]).length;
          } else {
            count = fallbackStore.audit_log.length;
          }
        } else if (upper.includes('FROM SESI_UJIAN')) {
          if (upper.includes('UJIAN_ID = ?')) {
            count = fallbackStore.sesi_ujian.filter(s => s.ujian_id === params[0]).length;
          } else {
            count = fallbackStore.sesi_ujian.length;
          }
        }
        return { results: [{ cnt: count, count: count }], meta: {} };
      }

      // 1.2 FROM USERS (only when main table is users, not inside a subquery)
      if (upper.includes('FROM USERS') && !upper.includes('FROM UJIAN') && !upper.includes('FROM SOAL')) {
        // SELECT DISTINCT kelas FROM users WHERE role = 'siswa'...
        if (upper.includes('DISTINCT KELAS')) {
          let students = fallbackStore.users.filter(u => u.role === 'siswa' && u.kelas);
          if (upper.includes('GURU_ID = ?') || upper.includes('GURU_ID=')) {
            const gId = params[0];
            students = students.filter(u => u.guru_id === gId || (!u.guru_id && gId === 'usr_guru_001'));
          }
          const classes = [...new Set(students.map(u => u.kelas))].sort();
          return { results: classes.map(c => ({ kelas: c })), meta: {} };
        }

        // SELECT ... FROM users WHERE username = ?
        if (upper.includes('WHERE USERNAME =') || upper.includes('USERNAME = ?')) {
          const username = params[0]?.toLowerCase();
          const found = fallbackStore.users.find(u => u.username?.toLowerCase() === username);
          return { results: found ? [found] : [], meta: {} };
        }

        // SELECT * FROM users WHERE id = ? (primary ID, not guru_id)
        if ((upper.includes('WHERE ID =') || upper.includes('WHERE U.ID =') || upper.includes('AND ID =')) && !upper.includes('GURU_ID')) {
          const id = params[0];
          let found = fallbackStore.users.find(u => u.id === id);
          if (found && upper.includes("ROLE = 'GURU'") && found.role !== 'guru') found = null;
          if (found && upper.includes("ROLE = 'SISWA'") && found.role !== 'siswa') found = null;
          return { results: found ? [found] : [], meta: {} };
        }

        // SELECT ... FROM users WHERE role = 'guru'
        if (upper.includes("ROLE = 'GURU'") || (upper.includes("ROLE = ?") && params[0] === 'guru')) {
          const teachers = fallbackStore.users.filter(u => u.role === 'guru');
          return { results: teachers, meta: {} };
        }

        // SELECT ... FROM users WHERE role = 'siswa'
        if (upper.includes("ROLE = 'SISWA'") || (upper.includes("ROLE = ?") && params.includes('siswa'))) {
          let students = fallbackStore.users.filter(u => u.role === 'siswa');
          
          // Check if filtered by guru_id
          if (upper.includes('GURU_ID = ?') || upper.includes('GURU_ID=')) {
            const guruId = params[0];
            students = students.filter(u => u.guru_id === guruId || (!u.guru_id && guruId === 'usr_guru_001'));
          }

          if (upper.includes('KELAS = ?')) {
            const k = params[params.length - 1];
            students = students.filter(u => u.kelas === k);
          }

          const enriched = students.map(s => {
            const guru = fallbackStore.users.find(g => g.id === s.guru_id);
            return {
              ...s,
              nama_guru: guru ? guru.nama : (s.guru_id ? 'Guru' : 'Guru Demo, S.Pd.'),
            };
          });

          enriched.sort((a, b) => {
            const kComp = (a.kelas || '').localeCompare(b.kelas || '');
            if (kComp !== 0) return kComp;
            const nA = a.no_absen || 0;
            const nB = b.no_absen || 0;
            if (nA !== nB) return nA - nB;
            return (a.nama || '').localeCompare(b.nama || '');
          });
          return { results: enriched, meta: {} };
        }

        return { results: fallbackStore.users, meta: {} };
      }

      // 1.3 FROM SOAL
      if (upper.includes('FROM SOAL') && !upper.includes('JOIN UJIAN_SOAL') && !upper.includes('UJIAN_SOAL US')) {
        if (upper.includes('WHERE ID =') && (upper.includes('GURU_ID =') || upper.includes('GURU_ID='))) {
          const found = fallbackStore.soal.find(q => q.id === params[0] && q.guru_id === params[1]);
          return { results: found ? [found] : [], meta: {} };
        }
        if (upper.includes('WHERE ID =') || upper.includes('WHERE S.ID =')) {
          const found = fallbackStore.soal.find(q => q.id === params[0]);
          return { results: found ? [found] : [], meta: {} };
        }
        // Strict teacher isolation: a teacher ONLY sees questions where guru_id matches!
        if (upper.includes('GURU_ID = ?') || upper.includes('GURU_ID=')) {
          let results = fallbackStore.soal.filter(q => q.guru_id === params[0]);
          if (upper.includes('MATA_PELAJARAN = ?') && params[1]) {
            results = results.filter(q => q.mata_pelajaran === params[1]);
          }
          if (upper.includes('TIPE = ?')) {
            const tipeParam = params[2] || params[1];
            if (tipeParam) results = results.filter(q => q.tipe === tipeParam);
          }
          return { results, meta: {} };
        }
        // Superadmin query (all questions across all teachers with teacher name)
        const enriched = fallbackStore.soal.map(s => {
          const g = fallbackStore.users.find(u => u.id === s.guru_id);
          return {
            ...s,
            nama_guru: g ? g.nama : 'Guru Demo, S.Pd.',
            username_guru: g ? g.username : 'guru',
          };
        });
        return { results: enriched, meta: {} };
      }

      // 1.4 FROM UJIAN
      if (upper.includes('FROM UJIAN') && !upper.includes('UJIAN_SOAL')) {
        // Query single exam: WHERE ID = ? (optionally with GURU_ID = ?)
        if ((upper.includes('WHERE ID =') || upper.includes('WHERE U.ID =')) && !upper.includes('WHERE U.GURU_ID =')) {
          let found = fallbackStore.ujian.find(u => u.id === params[0]);
          if (found && (upper.includes('AND GURU_ID =') || upper.includes('AND U.GURU_ID ='))) {
            const requestedGuruId = params[1];
            if (requestedGuruId && found.guru_id !== requestedGuruId) {
              // Also check if teacher owns it under alternative ID
              const requestingUser = fallbackStore.users.find(u => u.id === requestedGuruId);
              const isOwner = requestingUser && (
                (requestingUser.username === 'novisa' && (found.guru_id === 'usr_guru_002' || !found.guru_id)) ||
                (requestingUser.username === 'apim' && (found.guru_id === 'usr_guru_002' || !found.guru_id))
              );
              if (!isOwner) {
                found = null;
              }
            }
          }
          return { results: found ? [found] : [], meta: {} };
        }
        if (upper.includes('KODE_UJIAN =')) {
          const code = params[0]?.toUpperCase();
          const found = fallbackStore.ujian.find(u => u.kode_ujian?.toUpperCase() === code);
          return { results: found ? [found] : [], meta: {} };
        }
        // Strict teacher isolation: a teacher sees exams matching their guru_id or matching their user profile
        if (upper.includes('GURU_ID = ?') || upper.includes('GURU_ID=')) {
          const reqId = params[0];
          const reqUser = fallbackStore.users.find(u => u.id === reqId);
          let exams = fallbackStore.ujian.filter(u => {
            if (u.guru_id === reqId) return true;
            if (reqUser && (reqUser.username === 'novisa' || reqUser.username === 'apim')) {
              return u.guru_id === 'usr_guru_002' || !u.guru_id;
            }
            return false;
          });
          if (upper.includes("STATUS = 'AKTIF'")) {
            exams = exams.filter(u => u.status === 'aktif');
          }
          const results = exams.map(u => ({
            ...u,
            total_peserta: fallbackStore.sesi_ujian.filter(s => s.ujian_id === u.id).length,
            peserta_selesai: fallbackStore.sesi_ujian.filter(s => s.ujian_id === u.id && s.status === 'selesai').length,
            rata_rata: 80,
          }));
          return { results, meta: {} };
        }
        // Superadmin or active exam list for students
        let examList = fallbackStore.ujian;
        if (upper.includes("STATUS = 'AKTIF'")) {
          examList = examList.filter(u => u.status === 'aktif');
        }
        const exams = examList.map(u => {
          const guru = fallbackStore.users.find(g => g.id === u.guru_id);
          return {
            ...u,
            nama_guru: guru?.nama || 'Dewan Guru',
            total_peserta: fallbackStore.sesi_ujian.filter(s => s.ujian_id === u.id).length,
            peserta_selesai: fallbackStore.sesi_ujian.filter(s => s.ujian_id === u.id && s.status === 'selesai').length,
          };
        });
        return { results: exams, meta: {} };
      }

      // 1.5 Junction SELECT s.*, us.urutan FROM soal s JOIN ujian_soal us
      if (upper.includes('UJIAN_SOAL') || upper.includes('FROM SOAL S')) {
        const ujianId = params[0];
        const junctions = fallbackStore.ujian_soal.filter(j => j.ujian_id === ujianId);
        const results = junctions.map(j => {
          const soal = fallbackStore.soal.find(s => s.id === j.soal_id);
          return soal ? { ...soal, urutan: j.urutan } : null;
        }).filter(Boolean);
        return { results, meta: {} };
      }

      // 1.6 SESI UJIAN
      if (upper.includes('FROM SESI_UJIAN')) {
        if (upper.includes('UJIAN_ID =') && upper.includes('SISWA_ID =')) {
          const found = fallbackStore.sesi_ujian.find(s => s.ujian_id === params[0] && s.siswa_id === params[1]);
          return { results: found ? [found] : [], meta: {} };
        }
        if (upper.includes('WHERE ID =')) {
          const found = fallbackStore.sesi_ujian.find(s => s.id === params[0]);
          return { results: found ? [found] : [], meta: {} };
        }
        if (upper.includes('WHERE SU.SISWA_ID =')) {
          const studentId = params[0];
          const studentSessions = fallbackStore.sesi_ujian.filter(s => s.siswa_id === studentId);
          const results = studentSessions.map(su => {
            const uj = fallbackStore.ujian.find(u => u.id === su.ujian_id) || {};
            return {
              ...su,
              judul: uj.judul,
              mata_pelajaran: uj.mata_pelajaran,
              kkm: uj.kkm,
              tampilkan_nilai: uj.tampilkan_nilai,
            };
          });
          return { results, meta: {} };
        }
        if (upper.includes('WHERE SU.UJIAN_ID =')) {
          const examId = params[0];
          const sessions = fallbackStore.sesi_ujian.filter(s => s.ujian_id === examId);
          const results = sessions.map(su => {
            const u = fallbackStore.users.find(usr => usr.id === su.siswa_id) || {};
            const logCount = fallbackStore.audit_log.filter(l => l.sesi_id === su.id).length;
            return {
              ...su,
              nama: u.nama || 'Siswa',
              kelas: u.kelas || '-',
              no_absen: u.no_absen || '-',
              total_pelanggaran: logCount,
            };
          });
          return { results, meta: {} };
        }
        return { results: fallbackStore.sesi_ujian, meta: {} };
      }

      // 1.7 JAWABAN
      if (upper.includes('FROM JAWABAN')) {
        const sesiId = params[0];
        if (upper.includes('SOAL_ID =')) {
          const found = fallbackStore.jawaban.find(j => j.sesi_id === sesiId && j.soal_id === params[1]);
          return { results: found ? [found] : [], meta: {} };
        }
        const results = fallbackStore.jawaban.filter(j => j.sesi_id === sesiId);
        return { results, meta: {} };
      }

      // 1.8 AUDIT LOG
      if (upper.includes('FROM AUDIT_LOG')) {
        if (upper.includes('UJIAN_ID =')) {
          const logs = fallbackStore.audit_log.filter(l => l.ujian_id === params[0]).map(l => {
            const u = fallbackStore.users.find(usr => usr.id === l.siswa_id) || {};
            return { ...l, siswa_nama: u.nama, siswa_kelas: u.kelas, nama_siswa: u.nama };
          });
          return { results: logs, meta: {} };
        }
        const logs = fallbackStore.audit_log.map(l => {
          const u = fallbackStore.users.find(usr => usr.id === l.siswa_id) || {};
          return { ...l, siswa_nama: u.nama, siswa_kelas: u.kelas, nama_siswa: u.nama };
        });
        return { results: logs, meta: {} };
      }
    }

    // 2. INSERT queries
    if (upper.startsWith('INSERT')) {
      if (upper.includes('INTO USERS')) {
        let userObj;
        if (upper.includes('GURU_ID')) {
          if (params.length >= 8) {
            userObj = {
              id: params[0],
              username: params[1],
              password_hash: params[2],
              nama: params[3],
              role: params[4],
              guru_id: params[5],
              kelas: params[6] || null,
              no_absen: params[7] || null,
            };
          } else {
            userObj = {
              id: params[0],
              username: params[1],
              password_hash: params[2],
              nama: params[3],
              role: 'siswa',
              guru_id: params[4],
              kelas: params[5] || null,
              no_absen: params[6] || null,
            };
          }
        } else {
          userObj = {
            id: params[0],
            username: params[1],
            password_hash: params[2],
            nama: params[3],
            role: params[4] || (upper.includes("'GURU'") ? 'guru' : upper.includes("'SISWA'") ? 'siswa' : 'guru'),
            guru_id: null,
            kelas: params[5] || null,
            no_absen: params[6] || null,
          };
        }
        userObj.created_at = new Date().toISOString();
        userObj.updated_at = new Date().toISOString();
        fallbackStore.users.push(userObj);
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: 1 } };
      }

      if (upper.includes('INTO SOAL')) {
        fallbackStore.soal.unshift({
          id: params[0],
          guru_id: params[1],
          mata_pelajaran: params[2],
          tipe: params[3],
          pertanyaan: params[4],
          pilihan_a: params[5],
          pilihan_b: params[6],
          pilihan_c: params[7],
          pilihan_d: params[8],
          pilihan_e: params[9],
          kunci_jawaban: params[10],
          bobot: params[11] || 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: 1 } };
      }

      if (upper.includes('INTO UJIAN_SOAL')) {
        fallbackStore.ujian_soal.push({
          id: params[0],
          ujian_id: params[1],
          soal_id: params[2],
          urutan: params[3],
        });
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: 1 } };
      }

      if (upper.includes('INTO UJIAN')) {
        fallbackStore.ujian.unshift({
          id: params[0],
          guru_id: params[1],
          judul: params[2],
          mata_pelajaran: params[3],
          kelas_target: params[4],
          kode_ujian: params[5],
          deskripsi: params[6],
          durasi_menit: params[7],
          jadwal_mulai: params[8],
          jadwal_selesai: params[9],
          jumlah_soal: params[10],
          kkm: params[11],
          acak_soal: params[12],
          acak_jawaban: params[13],
          tampilkan_nilai: params[14],
          batas_pelanggaran: params[15],
          status: params[16] || 'aktif',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: 1 } };
      }

      if (upper.includes('INTO SESI_UJIAN')) {
        const item = {
          id: params[0],
          ujian_id: params[1],
          siswa_id: params[2],
          waktu_mulai: new Date().toISOString(),
          status: 'berlangsung',
          jumlah_pelanggaran: 0,
          created_at: new Date().toISOString(),
        };
        fallbackStore.sesi_ujian.push(item);
        savePersistedStore(fallbackStore);
        return { results: [item], meta: { changes: 1 } };
      }

      if (upper.includes('INTO JAWABAN')) {
        fallbackStore.jawaban.push({
          id: params[0],
          sesi_id: params[1],
          soal_id: params[2],
          jawaban_siswa: params[3],
          updated_at: new Date().toISOString(),
        });
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: 1 } };
      }

      if (upper.includes('INTO AUDIT_LOG')) {
        fallbackStore.audit_log.unshift({
          id: params[0],
          sesi_id: params[1],
          siswa_id: params[2],
          ujian_id: params[3],
          tipe_pelanggaran: params[4],
          detail: params[5],
          timestamp: new Date().toISOString(),
        });
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: 1 } };
      }
    }

    // 3. UPDATE queries
    if (upper.startsWith('UPDATE')) {
      if (upper.includes('UPDATE SOAL')) {
        const id = params[10] || params[0];
        const item = fallbackStore.soal.find(s => s.id === id);
        if (item) {
          if (params[0]) item.mata_pelajaran = params[0];
          if (params[1]) item.tipe = params[1];
          if (params[2]) item.pertanyaan = params[2];
          if (params[3] !== undefined) item.pilihan_a = params[3];
          if (params[4] !== undefined) item.pilihan_b = params[4];
          if (params[5] !== undefined) item.pilihan_c = params[5];
          if (params[6] !== undefined) item.pilihan_d = params[6];
          if (params[7] !== undefined) item.pilihan_e = params[7];
          if (params[8] !== undefined) item.kunci_jawaban = params[8];
          if (params[9] !== undefined) item.bobot = params[9];
          item.updated_at = new Date().toISOString();
        }
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: 1 } };
      }

      if (upper.includes('UPDATE UJIAN')) {
        let u = null;
        for (const p of params) {
          if (typeof p === 'string' && fallbackStore.ujian.some(x => x.id === p)) {
            u = fallbackStore.ujian.find(x => x.id === p);
            break;
          }
        }
        if (!u && params.length >= 2) {
          u = fallbackStore.ujian.find(x => x.id === params[params.length - 2] || x.id === params[params.length - 1]);
        }

        if (u) {
          const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE/i);
          if (setMatch) {
            const clauses = setMatch[1].split(',').map(c => c.trim().split('=')[0].trim().toLowerCase());
            clauses.forEach((col, idx) => {
              if (col && idx < params.length && params[idx] !== undefined && col !== 'id' && col !== 'guru_id') {
                u[col] = params[idx];
              }
            });
          }
          if (upper.includes('STATUS =') && !setMatch) {
            const newStatus = params.find(p => ['draft', 'aktif', 'selesai'].includes(p));
            if (newStatus) u.status = newStatus;
          }
          u.updated_at = new Date().toISOString();
        }
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: u ? 1 : 0 } };
      }

      if (upper.includes('UPDATE SESI_UJIAN')) {
        if (upper.includes('STATUS =') && upper.includes('TOTAL_NILAI =')) {
          const [totalNilai, jBenar, jSalah, jKosong, sesiId] = params;
          const s = fallbackStore.sesi_ujian.find(x => x.id === sesiId);
          if (s) {
            s.status = 'selesai';
            s.total_nilai = totalNilai;
            s.jumlah_benar = jBenar;
            s.jumlah_salah = jSalah;
            s.jumlah_kosong = jKosong;
            s.waktu_selesai = new Date().toISOString();
          }
          savePersistedStore(fallbackStore);
          return { results: [], meta: { changes: 1 } };
        }

        if (upper.includes("STATUS = 'DITANGGUHKAN'")) {
          const s = fallbackStore.sesi_ujian.find(x => x.id === params[0]);
          if (s) s.status = 'ditangguhkan';
          savePersistedStore(fallbackStore);
          return { results: [], meta: { changes: 1 } };
        }

        if (upper.includes("STATUS = 'BERLANGSUNG'") && upper.includes('JUMLAH_PELANGGARAN = 0')) {
          const s = fallbackStore.sesi_ujian.find(x => x.id === params[0]);
          if (s) {
            s.status = 'berlangsung';
            s.jumlah_pelanggaran = 0;
          }
          savePersistedStore(fallbackStore);
          return { results: [], meta: { changes: 1 } };
        }

        if (upper.includes('JUMLAH_PELANGGARAN =')) {
          const s = fallbackStore.sesi_ujian.find(x => x.id === params[1]);
          if (s) s.jumlah_pelanggaran = params[0];
          savePersistedStore(fallbackStore);
          return { results: [], meta: { changes: 1 } };
        }
      }

      if (upper.includes('UPDATE JAWABAN')) {
        if (upper.includes('JAWABAN_SISWA =')) {
          const existing = fallbackStore.jawaban.find(j => j.id === params[1]);
          if (existing) {
            existing.jawaban_siswa = params[0];
            existing.updated_at = new Date().toISOString();
          }
          savePersistedStore(fallbackStore);
          return { results: [], meta: { changes: 1 } };
        }

        if (upper.includes('IS_BENAR =')) {
          const j = fallbackStore.jawaban.find(x => x.sesi_id === params[2] && x.soal_id === params[3]);
          if (j) {
            j.is_benar = params[0];
            j.nilai_soal = params[1];
          }
          savePersistedStore(fallbackStore);
          return { results: [], meta: { changes: 1 } };
        }
      }
    }

    // 4. DELETE queries
    if (upper.startsWith('DELETE')) {
      if (upper.includes('FROM USERS')) {
        const id = params[0];
        const idx = fallbackStore.users.findIndex(u => u.id === id);
        if (idx !== -1) {
          const removed = fallbackStore.users.splice(idx, 1)[0];
          if (!Array.isArray(fallbackStore.deleted_usernames)) fallbackStore.deleted_usernames = [];
          if (removed && removed.username && !fallbackStore.deleted_usernames.includes(removed.username)) {
            fallbackStore.deleted_usernames.push(removed.username);
          }
          savePersistedStore(fallbackStore);
          return { results: [], meta: { changes: 1 } };
        }
        return { results: [], meta: { changes: 0 } };
      }

      if (upper.includes('FROM SOAL')) {
        const idx = fallbackStore.soal.findIndex(s => s.id === params[0]);
        if (idx !== -1) {
          fallbackStore.soal.splice(idx, 1);
          savePersistedStore(fallbackStore);
          return { results: [], meta: { changes: 1 } };
        }
        return { results: [], meta: { changes: 0 } };
      }

      if (upper.includes('FROM UJIAN_SOAL')) {
        const ujianId = params[0];
        const before = fallbackStore.ujian_soal.length;
        fallbackStore.ujian_soal = fallbackStore.ujian_soal.filter(j => j.ujian_id !== ujianId);
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: before - fallbackStore.ujian_soal.length } };
      }

      if (upper.includes('FROM UJIAN')) {
        const ujianId = params[0];
        const before = fallbackStore.ujian.length;
        fallbackStore.ujian = fallbackStore.ujian.filter(u => u.id !== ujianId);
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: Math.max(1, before - fallbackStore.ujian.length) } };
      }

      if (upper.includes('FROM SESI_UJIAN')) {
        const siswaId = params[0];
        const before = fallbackStore.sesi_ujian.length;
        fallbackStore.sesi_ujian = fallbackStore.sesi_ujian.filter(s => s.siswa_id !== siswaId);
        savePersistedStore(fallbackStore);
        return { results: [], meta: { changes: before - fallbackStore.sesi_ujian.length } };
      }

      if (upper.includes('FROM JAWABAN') || upper.includes('FROM AUDIT_LOG')) {
        return { results: [], meta: { changes: 1 } };
      }
    }

    return { results: [], meta: { changes: 0 } };
  }

  async batch(statements) {
    const results = [];
    for (const stmt of statements) {
      const result = await this.query(stmt.sql, stmt.params || []);
      results.push(result);
    }
    return results;
  }

  async getOne(sql, params = []) {
    const result = await this.query(sql, params);
    const row = result.results?.[0] || null;
    return row ? this.normalizeRow(row) : null;
  }

  async getAll(sql, params = []) {
    const result = await this.query(sql, params);
    const rows = result.results || [];
    return rows.map(r => this.normalizeRow(r));
  }

  async run(sql, params = []) {
    const result = await this.query(sql, params);
    return {
      changes: result.meta?.changes || 0,
      lastRowId: result.meta?.last_row_id,
      results: result.results || [],
    };
  }
}

// Singleton instance
let dbInstance = null;

export function getDB() {
  if (!dbInstance) {
    dbInstance = new D1Client();
  }
  return dbInstance;
}

export default D1Client;
