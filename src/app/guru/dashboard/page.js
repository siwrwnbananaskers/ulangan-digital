'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';

export default function GuruDashboard() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [stats, setStats] = useState({ ujian: 0, soal: 0, siswa_aktif: 0, selesai: 0 });
  const [ujianList, setUjianList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('semua');

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [ujianRes, soalRes] = await Promise.all([
        authFetch('/api/ujian'),
        authFetch('/api/soal'),
      ]);
      const ujianData = await ujianRes.json();
      const soalData = await soalRes.json();

      const ujianArr = ujianData.ujian || [];
      const soalArr = soalData.soal || [];

      setUjianList(ujianArr);
      setStats({
        ujian: ujianArr.length,
        soal: soalArr.length,
        siswa_aktif: ujianArr.reduce((acc, u) => acc + (u.total_peserta || 0), 0),
        selesai: ujianArr.filter((u) => u.status === 'selesai').length,
      });
    } catch (err) {
      console.error('Load dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUjian = () => {
    if (activeTab === 'semua') return ujianList;
    return ujianList.filter((u) => u.status === activeTab);
  };

  if (authLoading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat dasbor pengawas...</p>
      </div>
    );
  }

  const filteredExams = getFilteredUjian();

  return (
    <div className="app-container" style={{ background: '#f4f2ee', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={logout} role="guru" />

      {/* 3-Column LinkedIn Style Layout */}
      <main className="linkedin-grid-layout">
        {/* === LEFT COLUMN: Profile & Quick Nav === */}
        <aside className="linkedin-col-left">
          {/* User Profile Card */}
          <div className="linkedin-card">
            <div className="linkedin-cover-banner" />
            <div className="linkedin-profile-header">
              <div className="linkedin-profile-avatar-large">
                {user?.nama?.charAt(0)?.toUpperCase() || 'G'}
              </div>
              <h3 className="linkedin-profile-name">{user?.nama || 'Guru Pengawas'}</h3>
              <p className="linkedin-profile-headline">
                Pendidik & Pengawas Asesmen Digital
              </p>
            </div>

            <div style={{ borderTop: '1px solid #f3f2ef', padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: '#666666' }}>Total Ujian Dibuat</span>
                <strong style={{ color: '#0a66c2' }}>{stats.ujian}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: '#666666' }}>Bank Butir Soal</span>
                <strong style={{ color: '#0a66c2' }}>{stats.soal}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#666666' }}>Peserta Mengikuti</span>
                <strong style={{ color: '#057642' }}>{stats.siswa_aktif}</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f3f2ef', padding: '10px 16px', background: '#fafafa' }}>
              <a href="/guru/ujian" style={{ fontSize: 12, fontWeight: 600, color: '#0a66c2', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Kelola Lembar Ujian</span>
                <span>→</span>
              </a>
            </div>
          </div>

          {/* Quick Menu List */}
          <div className="linkedin-card">
            <div className="linkedin-widget-header">
              <span className="linkedin-widget-title">Pintasan Menu</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              <a
                href="/guru/bank-soal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  textDecoration: 'none',
                }}
                className="hover-bg-link"
              >
                <span style={{ color: '#0a66c2' }}>📝</span>
                <span>Bank Soal ({stats.soal})</span>
              </a>

              <a
                href="/guru/hasil"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  textDecoration: 'none',
                }}
                className="hover-bg-link"
              >
                <span style={{ color: '#057642' }}>📊</span>
                <span>Rekap Hasil & Nilai KKM</span>
              </a>

              <a
                href="/guru/audit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  textDecoration: 'none',
                }}
                className="hover-bg-link"
              >
                <span style={{ color: '#b91c1c' }}>🛡️</span>
                <span>Log Integritas & Kiosk Mode</span>
              </a>
            </div>
          </div>
        </aside>

        {/* === CENTER COLUMN: Hero Card & Exams List === */}
        <section className="linkedin-col-main">
          {/* Hero Banner Card (Softr / LinkedIn style profile hero card) */}
          <div className="linkedin-card">
            {/* Visual Cover Header */}
            <div
              style={{
                height: 120,
                background: 'linear-gradient(135deg, #0a66c2 0%, #004182 50%, #1e3a8a 100%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <div style={{ textAlign: 'center', padding: '0 20px' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  Platform Asesmen Digital & Kiosk Security
                </h2>
                <p style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
                  Ujian berbasis web terproteksi, responsif, dan terintegrasi Cloudflare D1
                </p>
              </div>
            </div>

            {/* Profile Bar below banner */}
            <div style={{ padding: '16px 20px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: '#191919' }}>
                    Selamat Datang, {user?.nama} 👋
                  </h1>
                  <p style={{ fontSize: 13, color: '#666666', marginTop: 2 }}>
                    Kelola lembar asesmen, pantau kepatuhan Kiosk Mode, dan rekapitulasi nilai siswa
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a
                    href="/guru/ujian"
                    className="btn btn-primary btn-sm"
                    style={{ background: '#0a66c2', borderColor: '#0a66c2', borderRadius: 9999, padding: '6px 16px', fontWeight: 600 }}
                  >
                    + Buat Ujian Baru
                  </a>
                  <a
                    href="/guru/bank-soal"
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: 9999, padding: '6px 16px', fontWeight: 600, border: '1px solid #0a66c2', color: '#0a66c2' }}
                  >
                    + Tambah Soal
                  </a>
                </div>
              </div>

              {/* Tab Navigation row inside card */}
              <div style={{ display: 'flex', gap: 6, marginTop: 16, paddingTop: 12, borderTop: '1px solid #f3f2ef', overflowX: 'auto' }}>
                {[
                  { key: 'semua', label: `Semua Ujian (${stats.ujian})` },
                  { key: 'aktif', label: 'Sedang Aktif' },
                  { key: 'selesai', label: 'Selesai' },
                  { key: 'draft', label: 'Draft' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    className={`linkedin-pill-badge ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Exam Post Cards (Feed items style) */}
          {loading ? (
            <div className="linkedin-card" style={{ padding: 40, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, color: '#666666' }}>Memuat daftar ujian...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="linkedin-card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#191919', marginBottom: 6 }}>
                Belum Ada Ujian {activeTab !== 'semua' ? `(${activeTab})` : ''}
              </h3>
              <p style={{ fontSize: 13, color: '#666666', marginBottom: 16 }}>
                Mulai susun lembar asesmen pertama Anda dengan butir soal yang sudah ada.
              </p>
              <a href="/guru/ujian" className="btn btn-primary btn-sm" style={{ borderRadius: 9999 }}>
                Buat Ujian Sekarang
              </a>
            </div>
          ) : (
            filteredExams.map((exam) => (
              <div key={exam.id} className="linkedin-card" style={{ transition: 'box-shadow 150ms ease' }}>
                <div style={{ padding: '16px 20px' }}>
                  {/* Card Header with Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 8,
                          background: '#edf3f8',
                          color: '#0a66c2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 16,
                        }}
                      >
                        {exam.mata_pelajaran?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#191919', margin: 0 }}>
                          {exam.judul}
                        </h3>
                        <p style={{ fontSize: 12, color: '#666666', margin: 0 }}>
                          {exam.mata_pelajaran} • Kelas: <strong>{exam.kelas_target}</strong>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`badge ${
                        exam.status === 'aktif'
                          ? 'badge-success'
                          : exam.status === 'selesai'
                          ? 'badge-gray'
                          : 'badge-warning'
                      }`}
                      style={{ padding: '4px 10px', fontSize: 11 }}
                    >
                      {exam.status === 'aktif' ? 'Sedang Aktif' : exam.status === 'selesai' ? 'Selesai' : 'Draft'}
                    </span>
                  </div>

                  {/* Description / Instructions */}
                  {exam.deskripsi && (
                    <p style={{ fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.5 }}>
                      {exam.deskripsi}
                    </p>
                  )}

                  {/* Meta Chips */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: 8,
                      marginBottom: 14,
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ color: '#666666' }}>Kode Token:</span>
                      <code
                        style={{
                          background: '#dbeafe',
                          color: '#1d4ed8',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {exam.kode_ujian}
                      </code>
                    </div>

                    <span style={{ color: '#cbd5e1' }}>•</span>

                    <span style={{ fontSize: 12, color: '#475569' }}>
                      ⏱️ {exam.durasi_menit} Menit
                    </span>

                    <span style={{ color: '#cbd5e1' }}>•</span>

                    <span style={{ fontSize: 12, color: '#475569' }}>
                      📝 {exam.jumlah_soal} Soal
                    </span>

                    <span style={{ color: '#cbd5e1' }}>•</span>

                    <span style={{ fontSize: 12, color: '#475569' }}>
                      🎯 KKM: {exam.kkm}
                    </span>

                    <span style={{ color: '#cbd5e1' }}>•</span>

                    <span style={{ fontSize: 12, color: '#475569' }}>
                      🛡️ Batas Pelanggaran: {exam.batas_pelanggaran}x
                    </span>
                  </div>

                  {/* Action buttons (LinkedIn style interaction bar) */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 10,
                      borderTop: '1px solid #f3f2ef',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 12, color: '#666666' }}>
                      Peserta: <strong>{exam.peserta_selesai || 0}</strong> selesai dari{' '}
                      <strong>{exam.total_peserta || 0}</strong> terdaftar
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={`/guru/hasil?ujian_id=${exam.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 9999, fontSize: 12, fontWeight: 600 }}
                      >
                        📊 Rekap Nilai
                      </a>
                      <a
                        href={`/guru/audit?ujian_id=${exam.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 9999, fontSize: 12, fontWeight: 600 }}
                      >
                        🛡️ Log Pelanggaran
                      </a>
                      <a
                        href="/guru/ujian"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 12, color: '#0a66c2' }}
                      >
                        Kelola Status →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        {/* === RIGHT COLUMN: Widgets & Guidelines (Softr / LinkedIn Right Rail) === */}
        <aside className="linkedin-col-right">
          {/* Widget 1: System Health & Stats (Like "Products people also use") */}
          <div className="linkedin-card">
            <div className="linkedin-widget-header">
              <span className="linkedin-widget-title">Ringkasan Sistem</span>
              <span className="badge badge-success" style={{ fontSize: 10 }}>Aktif 24/7</span>
            </div>
            <div className="linkedin-widget-body" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  D1
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#191919' }}>Cloudflare D1</h4>
                  <p style={{ fontSize: 11, color: '#666666', margin: 0 }}>Database Serverless SQL Terkoneksi</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  ⏱️
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#191919' }}>Sinkronisasi Waktu</h4>
                  <p style={{ fontSize: 11, color: '#666666', margin: 0 }}>Timer Otomatis Jam Server</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  🛡️
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#191919' }}>Kiosk & Integrity Mode</h4>
                  <p style={{ fontSize: 11, color: '#666666', margin: 0 }}>Fullscreen & Tab Switch Detection</p>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 2: Security Guidelines */}
          <div className="linkedin-card">
            <div className="linkedin-widget-header">
              <span className="linkedin-widget-title">Panduan Pengawas</span>
            </div>
            <div className="linkedin-widget-body" style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              <p style={{ marginBottom: 10 }}>
                💡 <strong>Tips Kode Ujian:</strong> Bagikan kode token (misal: <code>{ujianList[0]?.kode_ujian || 'MAT123'}</code>) kepada siswa sesaat sebelum asesmen dimulai.
              </p>
              <p style={{ marginBottom: 10 }}>
                ⚠️ <strong>Penangguhan Otomatis:</strong> Siswa yang berpindah tab atau keluar fullscreen lebih dari batas akan otomatis ditangguhkan. Anda dapat membuka kembali statusnya di menu <strong>Audit Log</strong>.
              </p>
              <div style={{ paddingTop: 8, borderTop: '1px solid #f3f2ef' }}>
                <a href="/guru/audit" style={{ fontSize: 12, fontWeight: 600, color: '#0a66c2' }}>
                  Pantau Pelanggaran Real-time →
                </a>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
