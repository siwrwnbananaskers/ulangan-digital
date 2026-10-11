'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { formatDurasi, formatTanggal } from '@/lib/utils';

export default function InstruksiUjianPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id;
  const { user, loading: authLoading, logout, authFetch } = useAuth('siswa');

  const [ujian, setUjian] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!user || !examId) return;
    loadExamDetail();
  }, [user, examId]);

  const loadExamDetail = async () => {
    try {
      const res = await authFetch(`/api/ujian/${examId}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal memuat instruksi ujian');
        return;
      }

      setUjian(data.ujian);
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!agreed) return;
    setStarting(true);
    setErrorMsg('');

    try {
      // Join exam (create / resume session)
      const res = await authFetch(`/api/ujian/${examId}/join`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Tidak dapat memulai ujian');
        setStarting(false);
        return;
      }

      // Try entering fullscreen before navigation
      try {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        }
      } catch (fsErr) {
        console.warn('Fullscreen request prompt dismissed or not yet allowed', fsErr);
      }

      // Navigate to active exam page
      router.push(`/siswa/ujian/${examId}`);
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server ujian');
      setStarting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat lembar instruksi ujian...</p>
      </div>
    );
  }

  if (errorMsg && !ujian) {
    return (
      <div className="app-container">
        <Navbar user={user} onLogout={logout} role="siswa" />
        <main className="main-content">
          <div className="card" style={{ maxWidth: 600, margin: 'var(--space-2xl) auto', textAlign: 'center' }}>
            <div className="alert alert-danger" style={{ marginBottom: 'var(--space-lg)' }}>
              {errorMsg}
            </div>
            <a href="/siswa/dashboard" className="btn btn-secondary">
              Kembali ke Dashboard
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="siswa" />

      <main className="main-content">
        <div className="instruction-page">
          <div className="instruction-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <span className="badge badge-primary">{ujian?.mata_pelajaran}</span>
              <span className="badge badge-success">Mode Asesmen Terproteksi</span>
            </div>

            <h1>{ujian?.judul}</h1>
            <p className="text-muted">
              Harap baca seluruh instruksi dan peraturan pengerjaan ujian dengan teliti sebelum menekan tombol mulai.
            </p>

            {/* Exam Meta */}
            <div className="instruction-meta">
              <div className="instruction-meta-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>Durasi: <strong>{formatDurasi(ujian?.durasi_menit || 60)}</strong></span>
              </div>

              <div className="instruction-meta-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>Jumlah Soal: <strong>{ujian?.jumlah_soal} Butir</strong></span>
              </div>

              <div className="instruction-meta-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Batas Pelanggaran: <strong>{ujian?.batas_pelanggaran || 3}x Kejadian</strong></span>
              </div>

              <div className="instruction-meta-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 8 14" />
                </svg>
                <span>Batas Waktu: <strong>{formatTanggal(ujian?.jadwal_selesai)}</strong></span>
              </div>
            </div>

            {ujian?.deskripsi && (
              <div style={{ background: 'var(--gray-50)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', borderLeft: '4px solid var(--primary-500)' }}>
                <strong style={{ fontSize: 'var(--font-size-sm)', display: 'block', marginBottom: 4 }}>Pesan dari Guru:</strong>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-700)' }}>{ujian?.deskripsi}</p>
              </div>
            )}

            {/* Rules */}
            <div className="instruction-rules">
              <h3>Peraturan & Ketentuan Integritas Ujian</h3>
              <ul>
                <li>
                  <strong>Layar Penuh (Fullscreen):</strong> Halaman ujian akan otomatis mengunci dalam mode fullscreen. Menutup atau keluar fullscreen akan terhitung sebagai pelanggaran.
                </li>
                <li>
                  <strong>Deteksi Perpindahan Halaman:</strong> Sistem menggunakan Page Visibility & Focus Detection. Berpindah tab browser, membuka browser/aplikasi lain, split-screen, atau alt-tab akan dicatat ke server beserta timestamp real-time.
                </li>
                <li>
                  <strong>Tindakan Otomatis & Penangguhan:</strong> Setiap pelanggaran akan menampilkan peringatan. Jika melampaui batas ({ujian?.batas_pelanggaran || 3}x), ujian akan <strong>DITANGGUHKAN</strong> dan hanya dapat dibuka kembali setelah verifikasi guru pengawas.
                </li>
                <li>
                  <strong>Penyimpanan Jawaban (Autosave):</strong> Jawaban Anda tersimpan otomatis ke server secara berkala. Jawaban Anda aman dan tidak akan hilang jika perangkat mati mendadak.
                </li>
                <li>
                  <strong>Sinkronisasi Waktu Server:</strong> Waktu ujian dihitung dari jam server, bukan jam HP/Laptop Anda. Jika waktu habis, lembar jawaban otomatis terkunci dan terkirim ke guru.
                </li>
              </ul>
            </div>

            {/* Educational Disclaimer */}
            <div className="instruction-disclaimer">
              <strong>Catatan Teknis Keamanan:</strong> Web browser memiliki batasan sistem operasi dan tidak dapat menjamin penguncian perangkat 100%. Untuk ujian resmi berskala besar, disarankan menggunakan kiosk browser atau managed device sekolah. Sistem ini tidak mengakses webcam, mikrofon, atau file pribadi tanpa izin Anda.
            </div>

            {errorMsg && (
              <div className="alert alert-danger" style={{ marginBottom: 'var(--space-lg)' }}>
                {errorMsg}
              </div>
            )}

            {/* Agreement Checkbox */}
            <div style={{ margin: 'var(--space-xl) 0', padding: 'var(--space-md)', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)' }}>
              <label className="form-checkbox" style={{ cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--primary-900)' }}>
                  Saya telah membaca, memahami, dan berjanji mengerjakan ujian ini dengan jujur dan tertib.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'space-between', alignItems: 'center' }}>
              <a href="/siswa/dashboard" className="btn btn-secondary">
                Batal / Kembali
              </a>
              <button
                className="btn btn-primary btn-lg"
                disabled={!agreed || starting}
                onClick={handleStartExam}
                id="btn-mulai-ujian"
              >
                {starting ? (
                  <>
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                    Menyiapkan Lembar Soal...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Mulai Ujian Sekarang (Masuk Fullscreen)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
