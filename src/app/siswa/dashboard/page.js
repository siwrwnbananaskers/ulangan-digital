'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import EditProfileModal from '@/components/EditProfileModal';
import { useAuth } from '@/hooks/useAuth';

export default function SiswaDashboard() {
  const router = useRouter();
  const { user, loading: authLoading, logout, authFetch } = useAuth('siswa');
  const [currentUser, setCurrentUser] = useState(user);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [kodeUjian, setKodeUjian] = useState('');
  const [checkingCode, setCheckingCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeExams, setActiveExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    if (user) setCurrentUser(user);
  }, [user]);

  useEffect(() => {
    const handleUserUpdate = (e) => {
      if (e.detail) setCurrentUser(e.detail);
    };
    window.addEventListener('user-profile-updated', handleUserUpdate);
    return () => window.removeEventListener('user-profile-updated', handleUserUpdate);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const res = await authFetch('/api/ujian');
      const data = await res.json();
      const list = data.ujian || [];
      setActiveExams(list.filter((u) => u.status === 'aktif'));
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
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat profil siswa...</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ background: '#f4f2ee', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={logout} role="siswa" />

      {/* 3-Column LinkedIn Grid Layout */}
      <main className="linkedin-grid-layout">
        {/* === LEFT COLUMN: Student Profile Card === */}
        <aside className="linkedin-col-left">
          <div className="linkedin-card">
            <div className="linkedin-cover-banner" style={{ background: 'linear-gradient(135deg, #057642 0%, #0a66c2 100%)' }} />
            <div className="linkedin-profile-header">
              <div
                className="linkedin-profile-avatar-large"
                style={{ background: '#057642', cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => setShowEditProfile(true)}
                title="Klik untuk ganti foto & nama profil"
              >
                {currentUser?.foto_profil ? (
                  <img
                    src={currentUser.foto_profil}
                    alt={currentUser.nama}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  currentUser?.nama?.charAt(0)?.toUpperCase() || 'S'
                )}
              </div>
              <h3 className="linkedin-profile-name">{currentUser?.nama || 'Siswa'}</h3>
              <p className="linkedin-profile-headline">
                Kelas: <strong>{currentUser?.kelas || '-'}</strong> • Absen: <strong>{currentUser?.no_absen || '-'}</strong>
              </p>
              <button
                type="button"
                onClick={() => setShowEditProfile(true)}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 8, fontSize: 11, padding: '4px 14px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}
              >
                <span>Edit Profil</span>
              </button>
            </div>

            <div style={{ borderTop: '1px solid #f3f2ef', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: '#666666' }}>Status Asesmen</span>
                <span className="badge badge-success" style={{ fontSize: 10 }}>Siap Ujian</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#666666' }}>Ujian Aktif Tersedia</span>
                <strong style={{ color: '#0a66c2' }}>{activeExams.length} Sesi</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f3f2ef', padding: '10px 16px', background: '#fafafa' }}>
              <a href="/siswa/hasil" style={{ fontSize: 12, fontWeight: 600, color: '#0a66c2', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Lihat Riwayat Nilai Saya</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </aside>

        {/* === CENTER COLUMN: Exam Code Input & Active Exams List === */}
        <section className="linkedin-col-main">
          {/* Main Hero Card: Input Exam Code */}
          <div className="linkedin-card">
            <div
              style={{
                padding: '24px',
                background: '#ffffff',
                borderBottom: '1px solid #f3f2ef',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: '#edf3f8',
                    color: '#0a66c2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#191919', margin: 0 }}>
                    Masuk ke Ruang Ujian / Mapel
                  </h2>
                  <p style={{ fontSize: 13, color: '#666666', margin: 0 }}>
                    Masukkan 6 digit Kode Ruang Ujian yang dibagikan guru pengawas untuk mapel yang sedang diujikan
                  </p>
                </div>
              </div>

              {errorMsg && (
                <div className="alert alert-danger" style={{ marginBottom: 16, fontSize: 13 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleKodeSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="KODE UJIAN (cth: MAT123)"
                  value={kodeUjian}
                  onChange={(e) => setKodeUjian(e.target.value.toUpperCase())}
                  className="form-input"
                  style={{
                    flex: '1 1 200px',
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    borderRadius: 8,
                    border: '2px solid #cbd5e1',
                    padding: '10px 16px',
                  }}
                  autoFocus
                  required
                />

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={checkingCode || kodeUjian.length < 4}
                  style={{
                    borderRadius: 8,
                    background: '#0a66c2',
                    padding: '10px 24px',
                    fontWeight: 700,
                  }}
                >
                  {checkingCode ? (
                    <>
                      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                      Memeriksa...
                    </>
                  ) : (
                    'Buka Lembar Ujian →'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Active Exams for Student's Class */}
          <div className="linkedin-card">
            <div className="linkedin-widget-header">
              <span className="linkedin-widget-title">Ujian Aktif untuk Kelas Anda</span>
              <span className="badge badge-success" style={{ fontSize: 11 }}>
                {activeExams.length} Tersedia
              </span>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {loadingExams ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <div className="spinner" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12, color: '#666666' }}>Memuat daftar ujian...</p>
                </div>
              ) : activeExams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 16px', color: '#666666' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#191919' }}>Tidak Ada Ujian Aktif Saat Ini</h4>
                  <p style={{ fontSize: 12, marginTop: 4 }}>
                    Belum ada asesmen yang dijadwalkan aktif untuk kelas Anda saat ini.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {activeExams.map((exam) => (
                    <div
                      key={exam.id}
                      style={{
                        border: exam.sudah_selesai ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '16px 18px',
                        background: exam.sudah_selesai ? '#fcfdfd' : '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        transition: 'all 150ms ease',
                      }}
                    >
                      {/* Top Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {exam.sudah_selesai ? (
                          <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontWeight: 700, padding: '3px 10px', borderRadius: 9999, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            ✓ Sudah Dikerjakan (Selesai)
                          </span>
                        ) : exam.sesi_status === 'berlangsung' ? (
                          <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontWeight: 700, padding: '3px 10px', borderRadius: 9999, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span>Sedang Berlangsung</span>
                          </span>
                        ) : (
                          <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 700, padding: '3px 10px', borderRadius: 9999, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span>
                            <span>Siap Dikerjakan</span>
                          </span>
                        )}

                        <span style={{ background: '#f1f5f9', color: '#475569', fontWeight: 600, padding: '3px 8px', borderRadius: 6, fontSize: 11 }}>
                          {exam.mata_pelajaran} • {exam.kelas_target}
                        </span>

                        {exam.akses_ujian === 'otomatis' ? (
                          <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 600, padding: '3px 8px', borderRadius: 6, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                            <span>Akses Langsung</span>
                          </span>
                        ) : (
                          <span style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 600, padding: '3px 8px', borderRadius: 6, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span>Wajib Kode</span>
                          </span>
                        )}
                      </div>

                      {/* Title & Teacher */}
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0', lineHeight: 1.3 }}>
                          {exam.judul}
                        </h4>
                        {exam.nama_guru && (
                          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                            Guru Pengampu: <strong style={{ color: '#334155' }}>{exam.nama_guru}</strong>
                          </p>
                        )}
                      </div>

                      {/* Specs Row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: 12, color: '#475569', background: '#f8fafc', padding: '8px 12px', borderRadius: 8, alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          Durasi: <strong>{exam.durasi_menit} Menit</strong>
                        </span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          Jumlah: <strong>{exam.jumlah_soal} Butir Soal</strong>
                        </span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                          KKM: <strong>{exam.kkm}</strong>
                        </span>
                      </div>

                      {/* Action Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingTop: 4 }}>
                        <div>
                          {exam.sudah_selesai ? (
                            <div>
                              {exam.tampilkan_nilai && exam.total_nilai !== null ? (
                                <span style={{ color: '#166534', fontWeight: 700, fontSize: 13 }}>
                                  Nilai Anda: <strong style={{ fontSize: 16, color: '#15803d' }}>{exam.total_nilai}</strong>
                                </span>
                              ) : (
                                <span style={{ color: '#15803d', fontSize: 12, fontWeight: 600 }}>
                                  ✓ Jawaban Anda telah tersimpan
                                </span>
                              )}
                            </div>
                          ) : exam.akses_ujian === 'otomatis' ? (
                            <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                              Bebas Masuk Tanpa Token/Kode
                            </span>
                          ) : (
                            <code style={{ background: '#edf3f8', color: '#0a66c2', padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                              Kode: {exam.kode_ujian}
                            </code>
                          )}
                        </div>

                        <div>
                          {exam.sudah_selesai ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => router.push('/siswa/hasil')}
                              style={{ borderRadius: 9999, padding: '7px 16px', fontWeight: 600, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              <span>Lihat Riwayat & Nilai</span>
                              <span>→</span>
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => router.push(`/siswa/ujian/${exam.id}/instruksi`)}
                              style={{
                                borderRadius: 9999,
                                padding: '8px 20px',
                                fontWeight: 700,
                                fontSize: 13,
                                background: exam.sesi_status === 'berlangsung' ? '#f59e0b' : (exam.akses_ujian === 'otomatis' ? '#057642' : '#0a66c2'),
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {exam.sesi_status === 'berlangsung' ? 'Lanjutkan Ujian →' : (exam.akses_ujian === 'otomatis' ? 'Mulai Ujian Sekarang →' : 'Ikuti Ujian →')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* === RIGHT COLUMN: Kiosk Mode & Integrity Guidelines === */}
        <aside className="linkedin-col-right">
          <div className="linkedin-card">
            <div className="linkedin-widget-header">
              <span className="linkedin-widget-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Peraturan Integritas Siswa
              </span>
            </div>
            <div className="linkedin-widget-body" style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: '#191919', display: 'block', marginBottom: 2 }}>1. Mode Layar Penuh (Fullscreen)</strong>
                <span>Ujian wajib dikerjakan dalam layar penuh. Keluar fullscreen akan dihitung sebagai pelanggaran.</span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: '#191919', display: 'block', marginBottom: 2 }}>2. Dilarang Berpindah Tab / Window</strong>
                <span>Sistem mendeteksi saat Anda beralih ke tab browser atau aplikasi lain secara otomatis.</span>
              </div>

              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: '#191919', display: 'block', marginBottom: 2 }}>3. Penyimpanan Otomatis (Autosave)</strong>
                <span>Jawaban Anda disimpan otomatis ke server setiap 20 detik secara aman.</span>
              </div>

              <div style={{ paddingTop: 8, borderTop: '1px solid #f3f2ef' }}>
                <a href="/siswa/hasil" style={{ fontSize: 12, fontWeight: 600, color: '#0a66c2' }}>
                  Lihat Riwayat Asesmen Saya →
                </a>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <EditProfileModal
          user={currentUser}
          onClose={() => setShowEditProfile(false)}
          onUpdate={(updated) => {
            setCurrentUser(updated);
          }}
        />
      )}
    </div>
  );
}
