-- =============================================
-- ULANGAN DIGITAL - Database Schema
-- Cloudflare D1 (SQLite)
-- =============================================

-- Users table (superadmin, guru & siswa)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('superadmin', 'guru', 'siswa')),
  guru_id TEXT,
  kelas TEXT,
  no_absen INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (guru_id) REFERENCES users(id)
);

-- Question bank (bank soal)
CREATE TABLE IF NOT EXISTS soal (
  id TEXT PRIMARY KEY,
  guru_id TEXT NOT NULL,
  mata_pelajaran TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK(tipe IN ('pg', 'isian', 'benar_salah', 'uraian')),
  pertanyaan TEXT NOT NULL,
  pilihan_a TEXT,
  pilihan_b TEXT,
  pilihan_c TEXT,
  pilihan_d TEXT,
  pilihan_e TEXT,
  kunci_jawaban TEXT,
  bobot INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (guru_id) REFERENCES users(id)
);

-- Exams (ujian)
CREATE TABLE IF NOT EXISTS ujian (
  id TEXT PRIMARY KEY,
  guru_id TEXT NOT NULL,
  judul TEXT NOT NULL,
  mata_pelajaran TEXT NOT NULL,
  kelas_target TEXT NOT NULL,
  kode_ujian TEXT UNIQUE NOT NULL,
  deskripsi TEXT,
  durasi_menit INTEGER NOT NULL DEFAULT 60,
  jadwal_mulai TEXT NOT NULL,
  jadwal_selesai TEXT NOT NULL,
  jumlah_soal INTEGER NOT NULL,
  kkm REAL DEFAULT 75,
  acak_soal INTEGER DEFAULT 0,
  acak_jawaban INTEGER DEFAULT 0,
  tampilkan_nilai INTEGER DEFAULT 0,
  batas_pelanggaran INTEGER DEFAULT 3,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'aktif', 'selesai')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (guru_id) REFERENCES users(id)
);

-- Exam-Question junction (soal per ujian)
CREATE TABLE IF NOT EXISTS ujian_soal (
  id TEXT PRIMARY KEY,
  ujian_id TEXT NOT NULL,
  soal_id TEXT NOT NULL,
  urutan INTEGER NOT NULL,
  FOREIGN KEY (ujian_id) REFERENCES ujian(id) ON DELETE CASCADE,
  FOREIGN KEY (soal_id) REFERENCES soal(id)
);

-- Student exam sessions (sesi ujian siswa)
CREATE TABLE IF NOT EXISTS sesi_ujian (
  id TEXT PRIMARY KEY,
  ujian_id TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  waktu_mulai TEXT,
  waktu_selesai TEXT,
  status TEXT DEFAULT 'belum_mulai' CHECK(status IN ('belum_mulai', 'berlangsung', 'selesai', 'ditangguhkan')),
  total_nilai REAL,
  jumlah_benar INTEGER DEFAULT 0,
  jumlah_salah INTEGER DEFAULT 0,
  jumlah_kosong INTEGER DEFAULT 0,
  jumlah_pelanggaran INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (ujian_id) REFERENCES ujian(id),
  FOREIGN KEY (siswa_id) REFERENCES users(id),
  UNIQUE(ujian_id, siswa_id)
);

-- Student answers (jawaban siswa)
CREATE TABLE IF NOT EXISTS jawaban (
  id TEXT PRIMARY KEY,
  sesi_id TEXT NOT NULL,
  soal_id TEXT NOT NULL,
  jawaban_siswa TEXT,
  is_benar INTEGER,
  nilai_soal REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sesi_id) REFERENCES sesi_ujian(id) ON DELETE CASCADE,
  FOREIGN KEY (soal_id) REFERENCES soal(id),
  UNIQUE(sesi_id, soal_id)
);

-- Violation audit log (log pelanggaran)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  sesi_id TEXT NOT NULL,
  siswa_id TEXT NOT NULL,
  ujian_id TEXT NOT NULL,
  tipe_pelanggaran TEXT NOT NULL,
  detail TEXT,
  timestamp TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sesi_id) REFERENCES sesi_ujian(id),
  FOREIGN KEY (siswa_id) REFERENCES users(id),
  FOREIGN KEY (ujian_id) REFERENCES ujian(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_soal_guru ON soal(guru_id);
CREATE INDEX IF NOT EXISTS idx_soal_mapel ON soal(mata_pelajaran);
CREATE INDEX IF NOT EXISTS idx_ujian_guru ON ujian(guru_id);
CREATE INDEX IF NOT EXISTS idx_ujian_kode ON ujian(kode_ujian);
CREATE INDEX IF NOT EXISTS idx_ujian_soal_ujian ON ujian_soal(ujian_id);
CREATE INDEX IF NOT EXISTS idx_sesi_ujian ON sesi_ujian(ujian_id);
CREATE INDEX IF NOT EXISTS idx_sesi_siswa ON sesi_ujian(siswa_id);
CREATE INDEX IF NOT EXISTS idx_jawaban_sesi ON jawaban(sesi_id);
CREATE INDEX IF NOT EXISTS idx_audit_sesi ON audit_log(sesi_id);
CREATE INDEX IF NOT EXISTS idx_audit_ujian ON audit_log(ujian_id);

-- Insert default superadmin and admin/guru account (password: guru123)
-- bcrypt hash for 'guru123'
INSERT OR IGNORE INTO users (id, username, password_hash, nama, role) 
VALUES 
  ('usr_superadmin_001', 'superadmin', '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', 'Super Admin Wozber (Owner)', 'superadmin'),
  ('usr_guru_001', 'guru', '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', 'Guru Demo, S.Pd.', 'guru'),
  ('usr_guru_002', 'novisa', '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', 'NOVISA MAHARANI, S.Pd', 'guru');

-- Insert demo students (assigned to Guru Demo usr_guru_001)
INSERT OR IGNORE INTO users (id, username, password_hash, nama, role, guru_id, kelas, no_absen)
VALUES 
  ('usr_siswa_001', 'siswa1', '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', 'Ahmad Rizki', 'siswa', 'usr_guru_001', 'XII-IPA-1', 1),
  ('usr_siswa_002', 'siswa2', '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', 'Siti Nurhaliza', 'siswa', 'usr_guru_001', 'XII-IPA-1', 2),
  ('usr_siswa_003', 'siswa3', '$2a$10$8KxX8jHQgRWLbQKC1G9GCeZVHqJKEHGUoEhHJHMdF3Y3vXkKR7Iqm', 'Budi Santoso', 'siswa', 'usr_guru_001', 'XII-IPA-1', 3);

-- Seed initial questions for Novisa
INSERT OR IGNORE INTO soal (id, guru_id, mata_pelajaran, tipe, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, pilihan_e, kunci_jawaban, bobot)
VALUES
  ('soal_novisa_001', 'usr_guru_002', 'Matematika', 'pg', 'Hasil dari 15 + (25 x 4) - 50 adalah...', '65', '75', '85', '90', '100', 'a', 1),
  ('soal_novisa_002', 'usr_guru_002', 'Matematika', 'pg', 'Faktor Persekutuan Terbesar (FPB) dari 24 dan 36 adalah...', '6', '12', '18', '24', '72', 'b', 1),
  ('soal_novisa_003', 'usr_guru_002', 'Matematika', 'isian', 'Berapakah nilai dari akar kuadrat 144?', null, null, null, null, null, '12', 1);

-- Seed initial exam for Novisa
INSERT OR IGNORE INTO ujian (id, guru_id, judul, mata_pelajaran, kelas_target, kode_ujian, deskripsi, durasi_menit, jadwal_mulai, jadwal_selesai, jumlah_soal, kkm, acak_soal, acak_jawaban, tampilkan_nilai, batas_pelanggaran, status)
VALUES
  ('ujn_novisa_001', 'usr_guru_002', 'Penilaian Tengah Semester Matematika', 'Matematika', 'XII-IPA-1', 'NOV789', 'Kerjakan secara mandiri dan jujur.', 60, datetime('now', '-1 day'), datetime('now', '+7 days'), 3, 75, 0, 0, 1, 3, 'draft');

INSERT OR IGNORE INTO ujian_soal (id, ujian_id, soal_id, urutan)
VALUES
  ('us_nov_1', 'ujn_novisa_001', 'soal_novisa_001', 1),
  ('us_nov_2', 'ujn_novisa_001', 'soal_novisa_002', 2),
  ('us_nov_3', 'ujn_novisa_001', 'soal_novisa_003', 3);

