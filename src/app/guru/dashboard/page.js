'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import EditProfileModal from '@/components/EditProfileModal';
import { useAuth } from '@/hooks/useAuth';

export default function GuruDashboard() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [currentUser, setCurrentUser] = useState(user);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [stats, setStats] = useState({ ujian: 0, soal: 0, siswa_aktif: 0, selesai: 0 });
  const [ujianList, setUjianList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 1;

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
    let list = ujianList;
    if (activeTab !== 'semua') {
      list = list.filter((u) => u.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((u) =>
        (u.judul && u.judul.toLowerCase().includes(q)) ||
        (u.mata_pelajaran && u.mata_pelajaran.toLowerCase().includes(q)) ||
        (u.kelas_target && String(u.kelas_target).toLowerCase().includes(q)) ||
        (u.kode_ujian && u.kode_ujian.toLowerCase().includes(q)) ||
        (u.deskripsi && u.deskripsi.toLowerCase().includes(q))
      );
    }
    return list;
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
  const totalPages = Math.ceil(filteredExams.length / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedExams = filteredExams.slice(
    (validCurrentPage - 1) * ITEMS_PER_PAGE,
    validCurrentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="app-container" style={{ background: '#f4f2ee', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={logout} role="guru" />

      {/* 3-Column LinkedIn Grid Layout */}
      <main className="linkedin-grid-layout">
        {/* === LEFT COLUMN: Profile & Quick Nav === */}
        <aside className="linkedin-col-left">
          {/* User Profile Card */}
          <div className="linkedin-card">
            <div className="linkedin-cover-banner" />
            <div className="linkedin-profile-header">
              <div
                className="linkedin-profile-avatar-large"
                style={{ cursor: 'pointer', overflow: 'hidden' }}
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
                  currentUser?.nama?.charAt(0)?.toUpperCase() || 'G'
                )}
              </div>
              <h3 className="linkedin-profile-name">{currentUser?.nama || 'Guru Pengawas'}</h3>
              <p className="linkedin-profile-headline" style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                Pendidik & Pengawas Asesmen
              </p>
              {currentUser?.role === 'superadmin' && (
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                      color: '#f8fafc',
                      fontWeight: 800,
                      fontSize: 10,
                      padding: '2.5px 10px',
                      borderRadius: 4,
                      letterSpacing: '0.08em',
                      border: '1px solid #334155',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    OWNER
                  </span>
                </div>
              )}
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
                <span style={{ color: '#666666' }}>Total Ujian Dibuat</span>
                <strong style={{ color: '#191919' }}>{stats.ujian}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <span style={{ color: '#666666' }}>Bank Butir Soal</span>
                <strong style={{ color: '#191919' }}>{stats.soal}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#666666' }}>Peserta Mengikuti</span>
                <strong style={{ color: '#0f172a' }}>{stats.siswa_aktif}</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f3f2ef', padding: '10px 16px', background: '#fafafa' }}>
              <a href="/guru/ujian" style={{ fontSize: 12, fontWeight: 600, color: '#0a66c2', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                <span>Kelola Lembar Ujian</span>
                <span>→</span>
              </a>
            </div>
          </div>

          {/* Quick Menu List (Clean Monochrome Icons) */}
          <div className="linkedin-card">
            <div className="linkedin-widget-header">
              <span className="linkedin-widget-title">Pintasan Menu</span>
            </div>
            <div style={{ padding: '6px 0' }}>
              <a
                href="/guru/bank-soal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  textDecoration: 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>Bank Soal ({stats.soal})</span>
              </a>

              <a
                href="/guru/hasil"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  textDecoration: 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span>Rekap Hasil & Nilai KKM</span>
              </a>

              <a
                href="/guru/siswa"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  textDecoration: 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Kelola Siswa & Cetak Kartu</span>
              </a>

              <a
                href="/guru/audit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  textDecoration: 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Catatan Pelanggaran Siswa</span>
              </a>
            </div>
          </div>
        </aside>

        {/* === CENTER COLUMN: Hero Card & Exams List === */}
        <section className="linkedin-col-main">
          {/* Hero Banner Card */}
          <div className="linkedin-card">
            <div
              style={{
                height: 100,
                background: '#0a66c2',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <div style={{ textAlign: 'center', padding: '0 20px' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
                  Ruang Pengawas &amp; Ujian Digital
                </h2>
                <p style={{ fontSize: 12, opacity: 0.9, marginTop: 4, margin: '4px 0 0' }}>
                  Platform ujian daring sekolah yang tertib, aman, dan terkoreksi otomatis
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 20px', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h1 style={{ fontSize: 18, fontWeight: 700, color: '#191919', margin: 0 }}>
                    Selamat Datang, {currentUser?.nama || 'Guru Pengawas'}
                  </h1>
                  <p style={{ fontSize: 13, color: '#666666', marginTop: 2, margin: '2px 0 0' }}>
                    Kelola lembar ujian, pantau ketertiban siswa, dan periksa hasil nilai dengan mudah
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
                    style={{ borderRadius: 9999, padding: '6px 16px', fontWeight: 600, border: '1px solid #cbd5e1', color: '#1e293b' }}
                  >
                    + Tambah Soal
                  </a>
                </div>
              </div>

              {/* Search Bar & Tab Navigation */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f2ef', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari judul ujian, mata pelajaran, kelas, atau kode token..."
                    style={{
                      width: '100%',
                      padding: '9px 36px 9px 36px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: 13,
                      background: '#f8fafc',
                      outline: 'none',
                      boxSizing: 'border-box',
                      color: '#0f172a',
                      fontFamily: 'inherit',
                      transition: 'all 150ms ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.background = '#ffffff';
                      e.target.style.borderColor = '#0a66c2';
                      e.target.style.boxShadow = '0 0 0 2px rgba(10, 102, 194, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Hapus pencarian"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Tab Row & Results Count */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {[
                      { key: 'semua', label: `Semua (${ujianList.length})` },
                      { key: 'aktif', label: `Sedang Aktif (${ujianList.filter((u) => u.status === 'aktif').length})` },
                      { key: 'selesai', label: `Selesai (${ujianList.filter((u) => u.status === 'selesai').length})` },
                      { key: 'draft', label: `Draft (${ujianList.filter((u) => u.status === 'draft').length})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        className={`linkedin-pill-badge ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => {
                          setActiveTab(tab.key);
                          setCurrentPage(1);
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                    {filteredExams.length} ujian ditemukan
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Exam Cards */}
          {loading ? (
            <div className="linkedin-card" style={{ padding: 36, textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: '#666666', margin: 0 }}>Memuat daftar ujian...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="linkedin-card" style={{ padding: 36, textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#191919', marginBottom: 6 }}>
                {searchQuery ? `Tidak ada ujian yang cocok dengan "${searchQuery}"` : `Belum Ada Ujian ${activeTab !== 'semua' ? `(${activeTab})` : ''}`}
              </h3>
              <p style={{ fontSize: 13, color: '#666666', marginBottom: 14 }}>
                {searchQuery ? 'Coba periksa kata kunci atau reset filter pencarian.' : 'Mulai susun lembar asesmen pertama Anda dengan butir soal yang sudah ada.'}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ borderRadius: 9999 }}
                >
                  Reset Pencarian
                </button>
              ) : (
                <a href="/guru/ujian" className="btn btn-primary btn-sm" style={{ borderRadius: 9999, background: '#0a66c2' }}>
                  Buat Ujian Sekarang
                </a>
              )}
            </div>
          ) : (
            <>
              {paginatedExams.map((exam) => (
                <div key={exam.id} className="linkedin-card">
                  <div style={{ padding: '16px 20px' }}>
                    {/* Card Header with Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 8,
                            background: '#eff6ff',
                            color: '#0a66c2',
                            border: '1px solid #dbeafe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                          title={exam.mata_pelajaran}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                            <path d="m9 14 2 2 4-4" />
                          </svg>
                        </div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#191919', margin: 0 }}>
                          {exam.judul}
                        </h3>
                        <p style={{ fontSize: 12, color: '#666666', margin: 0 }}>
                          {exam.mata_pelajaran} • Kelas: <strong>{exam.kelas_target}</strong>
                        </p>
                        {(exam.nama_guru || user?.role === 'superadmin') && (
                          <div style={{ marginTop: 4 }}>
                            <span
                              className="badge"
                              style={{
                                background: '#ede9fe',
                                color: '#6d28d9',
                                border: '1px solid #ddd6fe',
                                fontWeight: 700,
                                fontSize: 10,
                                padding: '2px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                              </svg>
                              Dibuat oleh: {exam.nama_guru || exam.username_guru || 'Dewan Guru'}
                            </span>
                          </div>
                        )}
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
                      style={{ padding: '3px 10px', fontSize: 11 }}
                    >
                      {exam.status === 'aktif' ? 'Sedang Aktif' : exam.status === 'selesai' ? 'Selesai' : 'Draft'}
                    </span>
                  </div>

                  {/* Description */}
                  {exam.deskripsi && (
                    <p style={{ fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                      {exam.deskripsi}
                    </p>
                  )}

                  {/* Meta Information (Clean Monochrome Icons) */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 12,
                      alignItems: 'center',
                      background: '#f8fafc',
                      padding: '8px 12px',
                      borderRadius: 6,
                      marginBottom: 12,
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      <span style={{ color: '#666666' }}>Kode Token:</span>
                      <code
                        style={{
                          background: '#e0f2fe',
                          color: '#0369a1',
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

                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                      {exam.durasi_menit} Menit
                    </span>

                    <span style={{ color: '#cbd5e1' }}>•</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {exam.jumlah_soal} Soal
                    </span>

                    <span style={{ color: '#cbd5e1' }}>•</span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#475569' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
                      </svg>
                      KKM: {exam.kkm}
                    </span>

                    <span style={{ color: '#cbd5e1' }}>•</span>

                    {exam.mode_exambro === 0 ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#057642', fontWeight: 600 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                        Mode Fleksibel (Tugas/Harian)
                      </span>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#b45309', fontWeight: 600 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Exambro Ketat ({exam.batas_pelanggaran}x)
                      </span>
                    )}
                  </div>

                  {/* Actions Bar */}
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
                        style={{ borderRadius: 9999, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        Rekap Nilai
                      </a>
                      <a
                        href={`/guru/audit?ujian_id=${exam.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: 9999, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Log Pelanggaran
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
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: '12px 18px',
                  background: '#ffffff',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  marginTop: 6,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, color: '#1e293b', fontWeight: 700 }}>
                    Ujian ke-{validCurrentPage} dari {filteredExams.length}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    (Halaman {validCurrentPage} dari {totalPages})
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="btn btn-secondary btn-sm"
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      borderRadius: 6,
                      opacity: validCurrentPage <= 1 ? 0.5 : 1,
                      cursor: validCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span>Sebelumnya</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((pageNum) => {
                      return (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        Math.abs(pageNum - validCurrentPage) <= 1
                      );
                    })
                    .map((pageNum, idx, arr) => {
                      const prev = arr[idx - 1];
                      return (
                        <span key={pageNum} style={{ display: 'inline-flex', alignItems: 'center' }}>
                          {prev && pageNum - prev > 1 && (
                            <span style={{ padding: '0 4px', color: '#94a3b8', fontSize: 12 }}>...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            style={{
                              minWidth: 32,
                              height: 32,
                              padding: '0 8px',
                              borderRadius: 6,
                              border: pageNum === validCurrentPage ? '1px solid #0a66c2' : '1px solid #cbd5e1',
                              background: pageNum === validCurrentPage ? '#0a66c2' : '#ffffff',
                              color: pageNum === validCurrentPage ? '#ffffff' : '#334155',
                              fontWeight: pageNum === validCurrentPage ? 700 : 500,
                              fontSize: 12,
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                            }}
                          >
                            {pageNum}
                          </button>
                        </span>
                      );
                    })}

                  <button
                    type="button"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="btn btn-secondary btn-sm"
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      borderRadius: 6,
                      opacity: validCurrentPage >= totalPages ? 0.5 : 1,
                      cursor: validCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>Selanjutnya</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </section>

        {/* === RIGHT COLUMN: Clean Enterprise Widgets === */}
        <aside className="linkedin-col-right">
          <div className="linkedin-card">
            <div className="linkedin-widget-header">
              <span className="linkedin-widget-title">Ringkasan Sistem</span>
              <span className="badge badge-success" style={{ fontSize: 10 }}>Aktif 24/7</span>
            </div>
            <div className="linkedin-widget-body" style={{ padding: '12px 16px' }}>
              {/* Status Sistem 1: Penyimpanan Data */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#191919' }}>Penyimpanan Nilai</h4>
                  <p style={{ fontSize: 11, color: '#666666', margin: 0 }}>Tersimpan Otomatis &amp; Aman</p>
                </div>
              </div>

              {/* Status Sistem 2: Waktu Ujian */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#191919' }}>Waktu Ujian Akurat</h4>
                  <p style={{ fontSize: 11, color: '#666666', margin: 0 }}>Penghitung Waktu Otomatis</p>
                </div>
              </div>

              {/* Status Sistem 3: Pengawasan Ketertiban */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#191919' }}>Pengawasan Siswa</h4>
                  <p style={{ fontSize: 11, color: '#666666', margin: 0 }}>Deteksi Pindah Tab &amp; Aplikasi</p>
                </div>
              </div>
            </div>
          </div>

          <div className="linkedin-card">
            <div className="linkedin-widget-header">
              <span className="linkedin-widget-title">Panduan Pengawas</span>
            </div>
            <div className="linkedin-widget-body" style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              <p style={{ marginBottom: 10 }}>
                <strong>Kode Ujian:</strong> Bagikan kode token kepada siswa sesaat sebelum asesmen dimulai.
              </p>
              <p style={{ marginBottom: 10 }}>
                <strong>Penangguhan Otomatis:</strong> Siswa yang melanggar fullscreen atau berpindah tab melebihi batas akan ditangguhkan otomatis dan dapat dipulihkan di menu Audit Log.
              </p>
              <div style={{ paddingTop: 8, borderTop: '1px solid #f3f2ef' }}>
                <a href="/guru/audit" style={{ fontSize: 12, fontWeight: 600, color: '#0a66c2', textDecoration: 'none' }}>
                  Lihat Audit Integritas →
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
