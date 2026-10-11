# Ulangan Digital - Platform Asesmen Berbasis Web Modern

Aplikasi Ulangan & Asesmen Digital modern, responsif, ringan, dan aman yang dirancang khusus untuk kebutuhan evaluasi pembelajaran di Indonesia.

---

## 🌟 Fitur Utama

### 1. Peran & Autentikasi (Guru & Siswa)
- **Role-based Authentication (JWT & HTTP-only Cookies)**:
  - **Guru**: Manajemen Bank Soal (CRUD), Manajemen & Pembuatan Ujian, Pemantauan Hasil & Statistik KKM, Audit Log Integritas Siswa, dan Kontrol Penangguhan Sesi.
  - **Siswa**: Masuk dengan Kode Ujian/PIN, Halaman Instruksi & Persetujuan, Lembar Ujian Terproteksi, Autosave Berkala, dan Riwayat Hasil Nilai.
- **Akun Demo Bawaan**:
  - Guru: `guru` / `guru123`
  - Siswa: `siswa1` / `guru123`, `siswa2` / `guru123`, `siswa3` / `guru123`

### 2. Tipe Soal Komprehensif
- **Pilihan Ganda (PG)**: Pilihan A sampai E dengan penanda visual responsif.
- **Isian Singkat**: Jawaban teks ringkas otomatis terverifikasi.
- **Benar / Salah**: Pilihan toggle dwi-opsi cepat.
- **Uraian (Essay)**: Lembar teks jawaban bebas bertata-letak lega.

### 3. Kiosk Mode & Exam Mode (Keamanan & Integritas Siswa)
- **Otomatis Fullscreen (Layar Penuh)** saat menekan tombol "Mulai Ujian".
- **Page Visibility API**: Mendeteksi saat tab browser disembunyikan atau siswa berpindah tab.
- **Blur & Focus Detection**: Mendeteksi saat jendela browser kehilangan fokus aktif (misal membuka split-screen atau aplikasi lain).
- **Fullscreen Exit Detection**: Mendeteksi upaya keluar dari mode layar penuh.
- **Pencegahan Pintasan Keyboard**: Memblokir tombol escape, switch tab, dev tools, klik kanan (context menu), copy, dan paste.
- **Pencatatan Audit Log Real-time**: Mencatat jenis pelanggaran, detail, dan timestamp ke database server.
- **Peringatan & Batas Pelanggaran**:
  - Tampilan modal: *"Terdeteksi aktivitas meninggalkan halaman ujian. Silakan kembali ke ujian (Peringatan X/Y)"*.
  - Jika melampaui batas pelanggaran (cth: 3x): status ujian berubah otomatis menjadi **"Ujian Ditangguhkan"**.
  - **Jawaban tidak dihapus** dan siswa tidak dapat melanjutkan sampai diverifikasi/dipulihkan oleh guru pengawas.
  - **Edukasi & Transparansi**: Tidak menyadap kamera/mikrofon tanpa izin pengguna. Disertai catatan teknis bahwa browser web biasa memiliki batasan OS dan disarankan menggunakan Kiosk Managed Device untuk penguncian 100%.

### 4. Autosave & Sinkronisasi Waktu Server
- **Penyimpanan Otomatis Berkala**: Jawaban disimpan otomatis ke server setiap 20 detik serta dicadangkan di penyimpanan lokal jika koneksi terputus.
- **Timer Waktu Server**: Waktu ujian dihitung dari timestamp server sehingga siswa tidak dapat memanipulasi jam perangkat mereka.
- **Auto-Submit Saat Waktu Habis**: Jawaban terkunci dan terkirim otomatis ketika waktu ujian selesai.

### 5. Evaluasi, KKM & Audit Log Guru
- Statistik kelulusan KKM, nilai rata-rata, nilai tertinggi, dan nilai terendah.
- Status siswa (Mengerjakan, Selesai, Ditangguhkan).
- Riwayat audit log terperinci dengan filter jenis pelanggaran serta tombol **"Pulihkan Sesi"** untuk siswa yang terblokir.

---

## 🏗️ Struktur Proyek

```
ulangan-digital/
├── migrations/
│   └── 001_schema.sql             # Skema tabel Cloudflare D1 (SQLite)
├── scripts/
│   └── setup-d1.js                # Skrip inisialisasi D1 via REST API
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # Login, register, me
│   │   │   ├── hasil/             # Rekap nilai, statistik, unfreeze sesi
│   │   │   ├── soal/              # CRUD Bank Soal
│   │   │   ├── time/              # Server timestamp API
│   │   │   └── ujian/             # CRUD Ujian, pencarian kode, join, autosave, submit, violation
│   │   ├── guru/
│   │   │   ├── audit/             # Halaman Audit Log Integritas
│   │   │   ├── bank-soal/         # Halaman Bank Soal
│   │   │   ├── dashboard/         # Halaman Dashboard Guru
│   │   │   ├── hasil/             # Halaman Evaluasi & Nilai Ujian
│   │   │   └── ujian/             # Halaman Manajemen Ujian
│   │   ├── siswa/
│   │   │   ├── dashboard/         # Halaman Masuk Kode & Dashboard Siswa
│   │   │   ├── hasil/             # Halaman Riwayat Nilai Siswa
│   │   │   ├── selesai/           # Halaman Konfirmasi Selesai Ujian
│   │   │   └── ujian/[id]/
│   │   │       ├── instruksi/     # Halaman Tata Tertib & Fullscreen Trigger
│   │   │       └── page.js        # Lembar Ujian (Exam Mode & Timer)
│   │   ├── globals.css            # Sistem Desain Putih-Biru Modern (Inter)
│   │   ├── layout.js
│   │   └── page.js                # Halaman Login Utama
│   ├── components/
│   │   └── Navbar.js              # Navbar responsif Guru & Siswa
│   ├── hooks/
│   │   ├── useAuth.js             # State autentikasi & authFetch
│   │   └── useExamMode.js         # Page Visibility, Fullscreen & Blur listener
│   └── lib/
│       ├── auth.js                # JWT token & proteksi XSS/CSRF
│       ├── db.js                  # Cloudflare D1 REST client + In-Memory Fallback
│       └── utils.js               # Kalkulasi nilai, format tanggal, helper
├── .env.local.example
├── next.config.js
└── package.json
```

---

## 🚀 Panduan Deployment Gratis Selamanya (Vercel + GitHub + Cloudflare D1)

Arsitektur aplikasi ini menggunakan:
1. **Frontend & Serverless API**: Di-hosting gratis di **Vercel** melalui GitHub repository.
2. **Database SQL Serverless**: Menggunakan **Cloudflare D1** (Gratis selamanya: hingga 5 juta pembacaan/hari, 100 ribu penulisan/hari, dan 5 GB data).

### Langkah 1: Buat Database di Cloudflare D1
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) > Masuk ke **Storage & Databases** > **D1**.
2. Klik **Create database** dan beri nama `ulangan-digital-db`.
3. Catat **Database ID** dan **Account ID** Anda.
4. Buat **API Token** di Cloudflare (dengan izin *D1 Edit*).

### Langkah 2: Jalankan Migrasi Skema Database
Di terminal lokal atau konsol Cloudflare D1, jalankan skrip skema:
```bash
# Isi variabel di .env.local terlebih dahulu
node scripts/setup-d1.js
```
*Atau jalankan query langsung dari file `migrations/001_schema.sql` pada menu Cloudflare D1 Console di dashboard web.*

### Langkah 3: Deploy ke Vercel via GitHub
1. Push proyek ke repository GitHub Anda:
   ```bash
   git init
   git add .
   git commit -m "feat: complete digital assessment system"
   git branch -M main
   git remote add origin https://github.com/username/ulangan-digital.git
   git push -u origin main
   ```
2. Buka [Vercel Dashboard](https://vercel.com/) > Klik **Add New Project** > Import repository GitHub Anda.
3. Di bagian **Environment Variables**, tambahkan:
   - `CLOUDFLARE_ACCOUNT_ID` = `[Account ID Cloudflare Anda]`
   - `CLOUDFLARE_D1_DATABASE_ID` = `[Database ID D1 Anda]`
   - `CLOUDFLARE_API_TOKEN` = `[API Token Cloudflare Anda]`
   - `JWT_SECRET` = `[String acak untuk keamanan JWT]`
   - `NEXT_PUBLIC_APP_NAME` = `Ulangan Digital`
4. Klik **Deploy**. Aplikasi langsung online dengan domain otomatis `https://ulangan-digital.vercel.app` (atau kustom domain Anda) dan database Cloudflare D1 gratis selamanya!

---

## 🛡️ Catatan Keamanan
- Password di-hash menggunakan algoritma **bcrypt**.
- Token autentikasi disimpan dalam header Bearer dan cookie HTTP-only berstandar **SameSite=Strict**.
- Sanitasi input XSS diterapkan pada seluruh penyimpanan soal dan jawaban.
- Mode Ujian memantau integritas pengerjaan secara etis tanpa mengambil data pribadi atau media siswa tanpa izin.
