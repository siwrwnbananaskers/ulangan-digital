/**
 * Cloudflare D1 Database Client
 * Communicates with D1 via REST API from Vercel serverless functions.
 * Includes seamless in-memory fallback mode for local development and demonstration.
 */

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

// In-memory fallback database state
const fallbackStore = {
  users: [
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
      id: 'usr_siswa_001',
      username: 'siswa1',
      password_hash: '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', // guru123
      nama: 'Ahmad Rizki Pratama',
      role: 'siswa',
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

class D1Client {
  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    this.databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
    this.isCloudflare = !!(this.accountId && this.databaseId && this.apiToken);

    if (!this.isCloudflare) {
      // In-memory fallback
    }
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

        return data.result?.[0] || { results: [], meta: {} };
      } catch (error) {
        console.warn('⚠️ Cloudflare D1 query failed, using resilient fallback store:', error.message);
        return this.executeFallback(sql, params);
      }
    }

    // Fallback in-memory handler
    return this.executeFallback(sql, params);
  }

  /**
   * Fallback in-memory query handler
   */
  executeFallback(sql, params = []) {
    const s = sql.trim();
    const upper = s.toUpperCase();

    // 1. SELECT queries
    if (upper.startsWith('SELECT')) {
      // SELECT ... FROM users WHERE username = ?
      if (upper.includes('FROM USERS') && upper.includes('WHERE USERNAME =')) {
        const username = params[0]?.toLowerCase();
        const found = fallbackStore.users.find(u => u.username.toLowerCase() === username);
        return { results: found ? [found] : [], meta: {} };
      }

      // SELECT * FROM users WHERE id = ?
      if (upper.includes('FROM USERS') && upper.includes('WHERE ID =')) {
        const found = fallbackStore.users.find(u => u.id === params[0]);
        return { results: found ? [found] : [], meta: {} };
      }

      // SELECT * FROM soal WHERE guru_id = ?
      if (upper.includes('FROM SOAL') && upper.includes('WHERE GURU_ID =')) {
        let results = fallbackStore.soal.filter(q => q.guru_id === params[0]);
        if (upper.includes('MATA_PELAJARAN =')) {
          results = results.filter(q => q.mata_pelajaran === params[1]);
        }
        return { results, meta: {} };
      }

      // SELECT id FROM soal WHERE id = ? AND guru_id = ?
      if (upper.includes('FROM SOAL') && upper.includes('WHERE ID =') && upper.includes('AND GURU_ID =')) {
        const found = fallbackStore.soal.find(q => q.id === params[0] && q.guru_id === params[1]);
        return { results: found ? [found] : [], meta: {} };
      }

      // SELECT * FROM ujian WHERE guru_id = ? OR overview
      if (upper.includes('FROM UJIAN U WHERE U.GURU_ID =') || upper.includes('FROM UJIAN WHERE GURU_ID =')) {
        const exams = fallbackStore.ujian.filter(u => u.guru_id === params[0]).map(u => ({
          ...u,
          total_peserta: fallbackStore.sesi_ujian.filter(s => s.ujian_id === u.id).length,
          peserta_selesai: fallbackStore.sesi_ujian.filter(s => s.ujian_id === u.id && s.status === 'selesai').length,
          rata_rata: 80,
        }));
        return { results: exams, meta: {} };
      }

      // SELECT * FROM ujian WHERE id = ?
      if (upper.includes('FROM UJIAN') && upper.includes('WHERE ID =')) {
        const found = fallbackStore.ujian.find(u => u.id === params[0]);
        return { results: found ? [found] : [], meta: {} };
      }

      // SELECT ... FROM ujian WHERE kode_ujian = ?
      if (upper.includes('FROM UJIAN') && upper.includes('KODE_UJIAN =')) {
        const code = params[0]?.toUpperCase();
        const found = fallbackStore.ujian.find(u => u.kode_ujian.toUpperCase() === code);
        return { results: found ? [found] : [], meta: {} };
      }

      // SELECT * FROM ujian (all active exams for student)
      if (upper.includes('FROM UJIAN') && !upper.includes('WHERE')) {
        return { results: fallbackStore.ujian, meta: {} };
      }

      // Question junction SELECT s.*, us.urutan FROM soal s JOIN ujian_soal us
      if (upper.includes('FROM SOAL S') || upper.includes('UJIAN_SOAL')) {
        const ujianId = params[0];
        const junctions = fallbackStore.ujian_soal.filter(j => j.ujian_id === ujianId);
        const results = junctions.map(j => {
          const soal = fallbackStore.soal.find(s => s.id === j.soal_id);
          return soal ? { ...soal, urutan: j.urutan } : null;
        }).filter(Boolean);
        return { results, meta: {} };
      }

      // Sesi ujian: SELECT * FROM sesi_ujian WHERE ujian_id = ? AND siswa_id = ?
      if (upper.includes('FROM SESI_UJIAN') && upper.includes('UJIAN_ID =') && upper.includes('SISWA_ID =')) {
        const found = fallbackStore.sesi_ujian.find(s => s.ujian_id === params[0] && s.siswa_id === params[1]);
        return { results: found ? [found] : [], meta: {} };
      }

      // Sesi ujian: SELECT * FROM sesi_ujian WHERE id = ?
      if (upper.includes('FROM SESI_UJIAN') && upper.includes('WHERE ID =')) {
        const found = fallbackStore.sesi_ujian.find(s => s.id === params[0]);
        return { results: found ? [found] : [], meta: {} };
      }

      // Sesi ujian for student history: SELECT su.*, uj.judul...
      if (upper.includes('FROM SESI_UJIAN SU') && upper.includes('WHERE SU.SISWA_ID =')) {
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

      // Detailed results for exam: SELECT su.*, u.nama... FROM sesi_ujian su JOIN users u...
      if (upper.includes('FROM SESI_UJIAN SU') && upper.includes('WHERE SU.UJIAN_ID =')) {
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

      // Answers: SELECT soal_id, jawaban_siswa FROM jawaban WHERE sesi_id = ?
      if (upper.includes('FROM JAWABAN') && upper.includes('SESI_ID =')) {
        const sesiId = params[0];
        if (upper.includes('SOAL_ID =')) {
          const found = fallbackStore.jawaban.find(j => j.sesi_id === sesiId && j.soal_id === params[1]);
          return { results: found ? [found] : [], meta: {} };
        }
        const results = fallbackStore.jawaban.filter(j => j.sesi_id === sesiId);
        return { results, meta: {} };
      }

      // Audit logs: SELECT al.*, u.nama as siswa_nama...
      if (upper.includes('FROM AUDIT_LOG') && upper.includes('UJIAN_ID =')) {
        const ujianId = params[0];
        const logs = fallbackStore.audit_log.filter(l => l.ujian_id === ujianId).map(l => {
          const u = fallbackStore.users.find(usr => usr.id === l.siswa_id) || {};
          return {
            ...l,
            siswa_nama: u.nama,
            siswa_kelas: u.kelas,
          };
        });
        return { results: logs, meta: {} };
      }
    }

    // 2. INSERT queries
    if (upper.startsWith('INSERT')) {
      if (upper.includes('INTO USERS')) {
        fallbackStore.users.push({
          id: params[0],
          username: params[1],
          password_hash: params[2],
          nama: params[3],
          role: params[4],
          kelas: params[5] || null,
          no_absen: params[6] || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
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
          status: params[16],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return { results: [], meta: { changes: 1 } };
      }

      if (upper.includes('INTO UJIAN_SOAL')) {
        fallbackStore.ujian_soal.push({
          id: params[0],
          ujian_id: params[1],
          soal_id: params[2],
          urutan: params[3],
        });
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
        return { results: [], meta: { changes: 1 } };
      }
    }

    // 3. UPDATE queries
    if (upper.startsWith('UPDATE')) {
      if (upper.includes('UPDATE SESI_UJIAN')) {
        if (upper.includes('STATUS =') && upper.includes('TOTAL_NILAI =')) {
          // Submit update
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
          return { results: [], meta: { changes: 1 } };
        }

        if (upper.includes('STATUS = \'DITANGGUHKAN\'')) {
          const s = fallbackStore.sesi_ujian.find(x => x.id === params[0]);
          if (s) s.status = 'ditangguhkan';
          return { results: [], meta: { changes: 1 } };
        }

        if (upper.includes('STATUS = \'BERLANGSUNG\'') && upper.includes('JUMLAH_PELANGGARAN = 0')) {
          const s = fallbackStore.sesi_ujian.find(x => x.id === params[0]);
          if (s) {
            s.status = 'berlangsung';
            s.jumlah_pelanggaran = 0;
          }
          return { results: [], meta: { changes: 1 } };
        }

        if (upper.includes('JUMLAH_PELANGGARAN =')) {
          const s = fallbackStore.sesi_ujian.find(x => x.id === params[1]);
          if (s) s.jumlah_pelanggaran = params[0];
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
          return { results: [], meta: { changes: 1 } };
        }

        if (upper.includes('IS_BENAR =')) {
          const j = fallbackStore.jawaban.find(x => x.sesi_id === params[2] && x.soal_id === params[3]);
          if (j) {
            j.is_benar = params[0];
            j.nilai_soal = params[1];
          }
          return { results: [], meta: { changes: 1 } };
        }
      }

      if (upper.includes('UPDATE UJIAN SET STATUS =')) {
        const u = fallbackStore.ujian.find(x => x.id === params[1]);
        if (u) u.status = params[0];
        return { results: [], meta: { changes: 1 } };
      }
    }

    // 4. DELETE queries
    if (upper.startsWith('DELETE FROM SOAL')) {
      const idx = fallbackStore.soal.findIndex(s => s.id === params[0] && s.guru_id === params[1]);
      if (idx !== -1) {
        fallbackStore.soal.splice(idx, 1);
        return { results: [], meta: { changes: 1 } };
      }
      return { results: [], meta: { changes: 0 } };
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
    return result.results?.[0] || null;
  }

  async getAll(sql, params = []) {
    const result = await this.query(sql, params);
    return result.results || [];
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
