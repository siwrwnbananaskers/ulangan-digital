'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { formatTanggal, formatDurasi } from '@/lib/utils';

export default function SiswaDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout, authFetch } = useAuth('siswa');
  const [kodeUjian, setKodeUjian] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeExams, setActiveExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const res = await authFetch('/api/ujian');
      const data = await res.json();
      const list = data.ujian || [];
      // Filter active exams
      setActiveExams(list.filter(u => u.status === 'aktif'));
    } catch (err) {
      console.error('Error loading exams', err);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleKodeSubmit = async (e) => {
    e.preventDefault();
    if (!kodeUjian.trim()) return;

    setErrorMsg('');
    setCheckingCode(true);

    try {
      const res = await authFetch('/api/ujian/kode', {
        method: 'POST',
        body: JSON.stringify({ kode_ujian: kodeUjian.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Kode ujian tidak valid');
        setCheckingCode(false);
        return;
      }

      const ujian = data.ujian;
      router.push(`/siswa/ujian/${ujian.id}/instruksi`);
    } catch (err) {
      setErrorMsg('Gagal memeriksa kode ujian. Silakan coba lagi.');
      setCheckingCode(false);
    }
  };

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat profil siswa...</p></div>;
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="siswa" />

      <main className="main-content">
        {/* Welcome Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div className="user-avatar" style={{ width: 48, height: 48, fontSize: '1.25rem' }}>
              {user?.nama?.charAt(0)?.toUpperCase() || 'S'}
            </div>
            <div>
              <h1>Halo, {user?.nama}! 👋</h1>
              <p>
                Kelas: <strong>{user?.kelas || 'Belum diatur'}</strong> • No. Absen:{' '}
                <strong>{user?.no_absen || '-'}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Enter Exam Code Card */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, var(--primary-50) 100%)',
            border: '2px solid var(--primary-200)',
            marginBottom: 'var(--space-2xl)',
            padding: 'var(--space-2xl)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--primary-100)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-md)',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 'var(--space-xs)' }}>
              Masuk Ujian / Asesmen
            </h2>
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
              Masukkan 6 digit Kode Ujian atau Token yang diberikan oleh guru pengawas
            </p>

            {errorMsg && (
              <div className="alert alert-danger" style={{ textAlign: 'left', marginBottom: 'var(--space-md)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleKodeSubmit}>
              <div className="code-input-group" style={{ marginBottom: 'var(--space-md)' }}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="KODE"
                  value={kodeUjian}
                  onChange={(e) => setKodeUjian(e.target.value.toUpperCase())}
                  className="code-input"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-block"
                disabled={checkingCode || kodeUjian.length < 4}
              >
                {checkingCode ? (
                  <>
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                    Memeriksa Kode...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Lanjutkan ke Lembar Ujian
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Active Exams & Quick Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-xl)' }}>
          {/* Active Exams for class */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Ujian Aktif Saat Ini</h2>
              <span className="badge badge-success">{activeExams.length} Aktif</span>
            </div>

            {loadingExams ? (
              <div className="loading-page" style={{ minHeight: 150 }}>
                <div className="spinner" />
              </div>
            ) : activeExams.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                <p>Tidak ada ujian aktif saat ini untuk kelas Anda.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {activeExams.map((exam) => (
                  <div
                    key={exam.id}
                    style={{
                      border: '1px solid var(--gray-200)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'white',
                    }}
                  >
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: 'var(--gray-900)' }}>
                        {exam.judul}
                      </h4>
                      <p className="text-xs text-muted">
                        {exam.mata_pelajaran} • {exam.durasi_menit} Menit • {exam.jumlah_soal} Soal
                      </p>
                      <div style={{ marginTop: 'var(--space-xs)' }}>
                        <code style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700 }}>
                          Kode: {exam.kode_ujian}
                        </code>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => router.push(`/siswa/ujian/${exam.id}/instruksi`)}
                    >
                      Buka Ujian
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Menu & Safety Rules */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Petunjuk Integritas Siswa</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>🛡️</div>
                <div>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>Exam Mode & Layar Penuh</h4>
                  <p className="text-xs text-muted">
                    Ujian berlangsung dalam mode Fullscreen. Dilarang keluar fullscreen atau membuka aplikasi lain.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>⚡</div>
                <div>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>Penyimpanan Otomatis (Autosave)</h4>
                  <p className="text-xs text-muted">
                    Jawaban Anda tersimpan otomatis ke server secara berkala. Jika internet terputus, Anda dapat melanjutkan kembali.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 24 }}>⏱️</div>
                <div>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>Batas Waktu Otomatis</h4>
                  <p className="text-xs text-muted">
                    Waktu ujian dihitung dari waktu server. Saat timer habis, lembar jawaban akan terkunci dan terkirim otomatis.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-sm)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--gray-200)' }}>
                <a href="/siswa/hasil" className="btn btn-secondary btn-block">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
                  </svg>
                  Lihat Riwayat Hasil Ujian Saya
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
