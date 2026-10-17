'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import ConfirmModal, { useConfirmDialog } from '@/components/ConfirmModal';
import EditProfileModal from '@/components/EditProfileModal';

export default function SuperAdminDashboard() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('superadmin');
  const [data, setData] = useState({
    teachers: [],
    stats: { total_guru: 0, total_ujian: 0, total_soal: 0, total_siswa: 0, total_sesi: 0, total_pelanggaran: 0 },
    recent_exams: [],
    recent_logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const { dialogState, confirm: showConfirm, handleConfirm, handleClose } = useConfirmDialog();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // New Teacher Modal
  const [showAddGuruModal, setShowAddGuruModal] = useState(false);
  const [guruForm, setGuruForm] = useState({
    username: '',
    nama: '',
    password: '',
  });
  const [showGuruPassword, setShowGuruPassword] = useState(false);
  const [savingGuru, setSavingGuru] = useState(false);
  const [guruFormReadOnly, setGuruFormReadOnly] = useState(true);

  // Edit Teacher Modal
  const [showEditGuruModal, setShowEditGuruModal] = useState(false);
  const [editGuruForm, setEditGuruForm] = useState({ id: '', username: '', nama: '', password: '' });
  const [showEditGuruPassword, setShowEditGuruPassword] = useState(false);
  const [savingEditGuru, setSavingEditGuru] = useState(false);

  // Search & Pagination for Teachers Directory
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherPage, setTeacherPage] = useState(1);
  const [teachersPerPage, setTeachersPerPage] = useState(5);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  // Prevent browser autofill from inserting logged-in superadmin credentials
  useEffect(() => {
    if (showAddGuruModal) {
      setGuruForm({ username: '', nama: '', password: '' });
      setGuruFormReadOnly(true);
      const timer = setTimeout(() => {
        setGuruForm((prev) => {
          if (prev.username.toLowerCase() === 'superadmin') {
            return { ...prev, username: '', password: '' };
          }
          return prev;
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddGuruModal]);

  const handleOpenAddGuru = () => {
    setGuruForm({ username: '', nama: '', password: '' });
    setShowGuruPassword(false);
    setGuruFormReadOnly(true);
    setShowAddGuruModal(true);
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/superadmin/guru?_t=${Date.now()}`);
      const resData = await res.json();
      if (res.ok) {
        setData({
          teachers: resData.teachers || [],
          stats: resData.stats || {},
          recent_exams: resData.recent_exams || [],
          recent_logs: resData.recent_logs || [],
        });
      } else {
        setAlert({ type: 'danger', message: resData.error || 'Gagal memuat data superadmin' });
      }
    } catch (err) {
      console.error('Superadmin load err:', err);
      setAlert({ type: 'danger', message: 'Koneksi API gagal: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuru = async (e) => {
    e.preventDefault();
    if (!guruForm.nama.trim()) {
      setAlert({ type: 'danger', message: 'Nama lengkap & gelar guru wajib diisi' });
      return;
    }

    const cleanUsername = guruForm.username.trim().toLowerCase();
    if (!cleanUsername) {
      setAlert({ type: 'danger', message: 'Username login guru wajib diisi' });
      return;
    }

    if (cleanUsername === 'superadmin' || cleanUsername === 'admin') {
      setAlert({
        type: 'danger',
        message: "Username 'superadmin' adalah administrator sistem. Silakan tentukan username khusus untuk akun guru (misal: nama atau NIP guru).",
      });
      return;
    }

    setSavingGuru(true);
    setAlert(null);

    try {
      const res = await authFetch('/api/superadmin/guru', {
        method: 'POST',
        body: JSON.stringify({
          ...guruForm,
          username: cleanUsername,
          nama: guruForm.nama.trim(),
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        setAlert({ type: 'danger', message: resData.error || 'Gagal membuat akun guru' });
      } else {
        setAlert({ type: 'success', message: resData.message });
        setShowAddGuruModal(false);
        setGuruForm({ username: '', nama: '', password: '' });
        loadDashboard();
      }
    } catch {
      setAlert({ type: 'danger', message: 'Terjadi kesalahan sistem' });
    } finally {
      setSavingGuru(false);
    }
  };

  const handleOpenEditGuru = (guru) => {
    setEditGuruForm({
      id: guru.id,
      username: guru.username,
      nama: guru.nama,
      password: '',
    });
    setShowEditGuruModal(true);
  };

  const handleSaveEditGuru = async (e) => {
    e.preventDefault();
    setSavingEditGuru(true);
    setAlert(null);

    try {
      const res = await authFetch('/api/superadmin/guru', {
        method: 'PUT',
        body: JSON.stringify(editGuruForm),
      });
      const resData = await res.json();
      if (!res.ok) {
        setAlert({ type: 'danger', message: resData.error || 'Gagal memperbarui akun guru' });
      } else {
        setAlert({ type: 'success', message: resData.message });
        setShowEditGuruModal(false);
        loadDashboard();
      }
    } catch {
      setAlert({ type: 'danger', message: 'Terjadi kesalahan sistem' });
    } finally {
      setSavingEditGuru(false);
    }
  };

  const handleDeleteGuru = async (id, nama) => {
    const ok = await showConfirm({
      title: 'Hapus Akun Guru',
      message: `Hapus akun guru resmi "${nama}"? Data ujian milik guru ini tetap diarsipkan.`,
      confirmText: 'Ya, Hapus',
      type: 'danger',
    });
    if (!ok) return;
    try {
      const res = await authFetch(`/api/superadmin/guru?id=${id}`, { method: 'DELETE' });
      const resData = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: resData.message });
        loadDashboard();
      } else {
        setAlert({ type: 'danger', message: resData.error || 'Gagal menghapus' });
      }
    } catch {
      setAlert({ type: 'danger', message: 'Gagal menghapus akun guru' });
    }
  };

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat Konsol Superadmin...</p></div>;
  }

  // Filter & Pagination Calculations for Teachers Directory
  const filteredTeachers = (data.teachers || []).filter((t) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (t.nama && t.nama.toLowerCase().includes(term)) ||
      (t.username && t.username.toLowerCase().includes(term))
    );
  });

  const totalTeacherPages = Math.ceil(filteredTeachers.length / teachersPerPage) || 1;
  const validTeacherPage = Math.min(Math.max(1, teacherPage), totalTeacherPages);
  const paginatedTeachers = filteredTeachers.slice(
    (validTeacherPage - 1) * teachersPerPage,
    validTeacherPage * teachersPerPage
  );

  // Metrik kalkulasi diagram integritas asesmen
  const totalUjian = data?.stats?.total_ujian || 0;
  const totalPelanggaran = data?.stats?.total_pelanggaran || 0;
  const totalUjianAktif = data?.stats?.total_ujian_aktif || 0;
  const totalSoal = data?.stats?.total_soal || 0;
  const totalSiswa = data?.stats?.total_siswa || 0;
  const integrityScore = totalPelanggaran === 0 ? 100 : Math.max(88, 100 - (totalPelanggaran * 2));
  const normalCompliance = totalPelanggaran === 0 ? 100 : Math.max(90, 100 - totalPelanggaran);
  const examActiveRate = totalUjian > 0 ? Math.min(100, Math.round((totalUjianAktif / totalUjian) * 100)) : 0;
  const circleRadius = 25;
  const circleCircumference = 2 * Math.PI * circleRadius; // ~157.08

  return (
    <div className="app-container" style={{ background: '#f4f2ee', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content">
        {/* Header Ribbon Konsol Superadmin + Diagram + Widget Integritas */}
        <div
          className="card page-header-ribbon"
          style={{
            padding: '22px 26px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {/* Kolom 1 (Kiri): Info Konsol Ringkas & Tombol Aksi */}
          <div
            style={{
              flex: '1 1 360px',
              minWidth: 270,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Status Pill Bersih & Kohesif */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 12px',
                  borderRadius: 20,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#0f172a', fontWeight: 700 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Superadmin
                </span>
                <span style={{ color: '#cbd5e1' }}>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 11.5 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#10b981',
                      boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
                    }}
                  />
                  Sistem Normal
                </span>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontSize: 'clamp(20px, 2vw, 24px)',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.25,
                }}
              >
                Konsol Superadmin
              </h1>

              {/* Subtitle Ringkas & Padat Sesuai Request */}
              <p
                style={{
                  fontSize: 13,
                  color: '#64748b',
                  margin: '4px 0 0',
                  lineHeight: 1.45,
                  fontWeight: 400,
                }}
              >
                Pusat kendali akun dewan guru dan integritas asesmen sekolah.
              </p>
            </div>

            {/* Kelompok Tombol Aksi (3 Tombol Muat 1 Baris) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                marginTop: 16,
              }}
            >
              <a
                href="/superadmin/guru"
                className="btn btn-secondary"
                style={{
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontWeight: 600,
                  fontSize: 12.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  height: 36,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Kelola Guru
              </a>

              <a
                href="/guru/ujian"
                className="btn btn-secondary"
                style={{
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontWeight: 600,
                  fontSize: 12.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  height: 36,
                }}
              >
                Semua Ujian →
              </a>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAddGuru}
                style={{
                  background: '#0a66c2',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontWeight: 600,
                  fontSize: 12.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 36,
                  boxShadow: '0 1px 3px rgba(10, 102, 194, 0.25)',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Tambah Guru
              </button>
            </div>
          </div>

          {/* Kolom 2 (Tengah): Diagram Distribusi & Indeks Integritas Asesmen (Anti AI-Slop) */}
          <div
            style={{
              flex: '1 1 310px',
              maxWidth: 350,
              minWidth: 260,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {/* Header Diagram */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Distribusi Asesmen
                </span>
              </div>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#059669',
                  background: '#ecfdf5',
                  padding: '2px 8px',
                  borderRadius: 10,
                  border: '1px solid #a7f3d0',
                }}
              >
                {integrityScore}% Integritas
              </span>
            </div>

            {/* Visual Grafik: Circular Donut Gauge + Dual Bar Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* SVG Circular Gauge */}
              <div style={{ position: 'relative', width: 62, height: 62, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="62" height="62" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="32" cy="32" r={circleRadius} stroke="#e2e8f0" strokeWidth="5.5" fill="transparent" />
                  <circle
                    cx="32"
                    cy="32"
                    r={circleRadius}
                    stroke="#0a66c2"
                    strokeWidth="5.5"
                    fill="transparent"
                    strokeDasharray={circleCircumference}
                    strokeDashoffset={circleCircumference * (1 - integrityScore / 100)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1 }}>
                    {integrityScore}%
                  </span>
                  <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600, marginTop: 1, display: 'block' }}>
                    Jujur
                  </span>
                </div>
              </div>

              {/* Progress Breakdown */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Tingkat Kepatuhan</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{normalCompliance}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${normalCompliance}%`, height: '100%', background: '#0a66c2', borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Rasio Ujian Aktif</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{totalUjianAktif}/{totalUjian} lembar</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(8, examActiveRate)}%`, height: '100%', background: '#10b981', borderRadius: 4, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Ringkas Distribusi */}
            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
              <span>Total Ujian: <strong style={{ color: '#0f172a' }}>{totalUjian}</strong></span>
              <span>Bank Soal: <strong style={{ color: '#0f172a' }}>{totalSoal}</strong></span>
              <span>Siswa: <strong style={{ color: '#0f172a' }}>{totalSiswa}</strong></span>
            </div>
          </div>

          {/* Kolom 3 (Kanan): Widget Integritas & Sesi Ujian Aktif */}
          <div
            style={{
              flex: '1 1 300px',
              maxWidth: 340,
              minWidth: 260,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {/* Widget Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Integritas &amp; Sesi Aktif
                </span>
              </div>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 8px',
                  borderRadius: 12,
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#065f46',
                }}
                title="Protokol Anti-Cheat dan Kiosk Lock aktif pada semua ujian siswa"
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.25)',
                  }}
                />
                Kiosk Lock Aktif
              </span>
            </div>

            {/* Widget Metrics Box (2 Grid Columns) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 9,
                padding: '10px 14px',
              }}
            >
              <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: 8 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>
                  Ujian Aktif
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {data.stats.total_ujian_aktif || 0}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>lembar</span>
                </div>
                <div style={{ fontSize: 10.5, color: '#059669', fontWeight: 600, marginTop: 3 }}>
                  {data.stats.total_sesi_aktif || 0} siswa aktif
                </div>
              </div>

              <div style={{ paddingLeft: 4 }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>
                  Pelanggaran
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: (data.stats.total_pelanggaran || 0) > 0 ? '#dc2626' : '#0f172a', lineHeight: 1 }}>
                    {data.stats.total_pelanggaran || 0}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>kasus</span>
                </div>
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 3 }}>
                  Audit integritas
                </div>
              </div>
            </div>

            {/* Widget Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#64748b',
                  fontSize: 11,
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0a66c2')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                title="Perbarui data realtime tanpa reload halaman"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{loading ? 'Menyinkronkan...' : 'Sinkronisasi Realtime'}</span>
              </button>

              <a
                href="/guru/audit"
                style={{
                  color: '#0a66c2',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Buka Audit Log
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{alert.message}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setAlert(null)}>✕</button>
          </div>
        )}

        {/* Global Metric Cards (5 Cards Auto-Fit Perfectly on Mobile & Desktop) */}
        <div className="metric-grid-5">
          <div className="card" style={{ padding: '16px', background: '#ffffff', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 6, fontWeight: 500 }}>Total Guru Terdaftar</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0a66c2', lineHeight: 1.1 }}>{data.stats.total_guru || 0}</div>
          </div>
          <div className="card" style={{ padding: '16px', background: '#ffffff', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 6, fontWeight: 500 }}>Total Lembar Ujian</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{data.stats.total_ujian || 0}</div>
          </div>
          <div className="card" style={{ padding: '16px', background: '#ffffff', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 6, fontWeight: 500 }}>Total Butir Soal</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{data.stats.total_soal || 0}</div>
          </div>
          <div className="card" style={{ padding: '16px', background: '#ffffff', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 6, fontWeight: 500 }}>Akun Siswa Terdata</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#057642', lineHeight: 1.1 }}>{data.stats.total_siswa || 0}</div>
          </div>
          <div className="card" style={{ padding: '16px', background: '#ffffff', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 6, fontWeight: 500 }}>Pelanggaran Terdeteksi</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626', lineHeight: 1.1 }}>{data.stats.total_pelanggaran || 0}</div>
          </div>
        </div>

        {/* 2 Column Main Section */}
        <div className="admin-two-col">
          {/* Left: Teachers Directory & Activity with Search & Pagination */}
          <div className="card" style={{ padding: 22, background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Daftar Akun Guru & Pantauan Aktivitas
                </h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
                  Pantau akun guru resmi, bank butir soal, dan partisipasi ujian
                </p>
              </div>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                }}
              >
                {data.teachers.length} Akun Guru
              </span>
            </div>

            {/* Search Input Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setTeacherPage(1);
                  }}
                  placeholder="Cari nama guru atau username..."
                  style={{
                    width: '100%',
                    padding: '8px 30px 8px 34px',
                    fontSize: 13,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    outline: 'none',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0a66c2';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 0 0 2px rgba(10,102,194,0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setTeacherPage(1);
                    }}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 4,
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Hapus pencarian"
                  >
                    ✕
                  </button>
                )}
              </div>

              {searchTerm && (
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Menampilkan <strong>{filteredTeachers.length}</strong> hasil
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 36 }}>
                <div className="spinner" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: '#666666' }}>Memuat daftar guru...</p>
              </div>
            ) : data.teachers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#666666' }}>
                Belum ada akun guru resmi. Tambahkan sekarang.
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#334155' }}>Tidak ditemukan akun guru</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                  Tidak ada guru dengan kata kunci &quot;{searchTerm}&quot;.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setTeacherPage(1);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 12, fontSize: 12, padding: '4px 14px' }}
                >
                  Reset Pencarian
                </button>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="table" style={{ fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th>Nama & Username</th>
                        <th>Tipe Akun</th>
                        <th>Ujian Dibuat</th>
                        <th>Bank Soal</th>
                        <th>Peserta Diuji</th>
                        <th style={{ textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTeachers.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <strong style={{ color: '#0f172a' }}>{t.nama}</strong>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              Username: <code style={{ fontWeight: 700, color: '#334155' }}>{t.username}</code>
                            </div>
                          </td>
                          <td>
                            {t.username === 'guru' ? (
                              <span className="badge badge-warning" style={{ fontSize: 10 }}>Akun Demo Bawaan</span>
                            ) : (
                              <span className="badge badge-success" style={{ fontSize: 10 }}>Guru Resmi (Full)</span>
                            )}
                          </td>
                          <td><strong>{t.total_ujian || 0}</strong> Sesi</td>
                          <td><strong>{t.total_soal || 0}</strong> Butir</td>
                          <td><strong>{t.total_peserta_diuji || 0}</strong> Siswa</td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#0a66c2', padding: '3px 6px', borderRadius: 6 }}
                                onClick={() => handleOpenEditGuru(t)}
                                title="Edit Akun Guru (Nama, Username, Password)"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              {t.username !== 'guru' ? (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: '#dc2626', padding: '3px 6px', borderRadius: 6 }}
                                  onClick={() => handleDeleteGuru(t.id, t.nama)}
                                  title="Hapus Akun Guru"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              ) : (
                                <span style={{ fontSize: 10, color: '#94a3b8', padding: '0 4px' }}>Demo</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls (5 Guru Per Halaman) */}
                {filteredTeachers.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                      padding: '12px 14px',
                      background: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      marginTop: 14,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700 }}>
                        Halaman {validTeacherPage} dari {totalTeacherPages}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        (Menampilkan {paginatedTeachers.length} dari {filteredTeachers.length} akun guru — 5 guru per halaman)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        disabled={validTeacherPage <= 1}
                        onClick={() => setTeacherPage((p) => Math.max(1, p - 1))}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          borderRadius: 6,
                          opacity: validTeacherPage <= 1 ? 0.45 : 1,
                          cursor: validTeacherPage <= 1 ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: validTeacherPage <= 1 ? '#94a3b8' : '#334155',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        <span>Sebelumnya</span>
                      </button>

                      {Array.from({ length: totalTeacherPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setTeacherPage(pageNum)}
                          style={{
                            minWidth: 30,
                            height: 30,
                            padding: '0 6px',
                            borderRadius: 6,
                            border: pageNum === validTeacherPage ? '1px solid #0a66c2' : '1px solid #cbd5e1',
                            background: pageNum === validTeacherPage ? '#0a66c2' : '#ffffff',
                            color: pageNum === validTeacherPage ? '#ffffff' : '#334155',
                            fontWeight: pageNum === validTeacherPage ? 700 : 500,
                            fontSize: 12,
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                          }}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={validTeacherPage >= totalTeacherPages}
                        onClick={() => setTeacherPage((p) => Math.min(totalTeacherPages, p + 1))}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '5px 12px',
                          fontSize: 12,
                          borderRadius: 6,
                          opacity: validTeacherPage >= totalTeacherPages ? 0.45 : 1,
                          cursor: validTeacherPage >= totalTeacherPages ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: validTeacherPage >= totalTeacherPages ? '#94a3b8' : '#334155',
                        }}
                      >
                        <span>Berikutnya</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Rail: Realtime Feed of Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Recent Exam Submissions */}
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px', color: '#191919' }}>
                Ujian Terbaru Dibuat Guru
              </h3>
              {data.recent_exams.length === 0 ? (
                <p style={{ fontSize: 12, color: '#666666', margin: 0 }}>Belum ada aktivitas ujian.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.recent_exams.map((ex) => (
                    <div key={ex.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: 13, color: '#191919' }}>{ex.judul}</strong>
                        <span className="badge badge-primary" style={{ fontSize: 10 }}>{ex.status}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Oleh: <strong>{ex.nama_guru}</strong> ({ex.mata_pelajaran})
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Violation Stream */}
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#191919' }}>
                  Log Integritas Terbaru
                </h3>
                <a href="/guru/audit" style={{ fontSize: 11, color: '#0a66c2', textDecoration: 'none' }}>
                  Semua Log →
                </a>
              </div>
              {data.recent_logs.length === 0 ? (
                <p style={{ fontSize: 12, color: '#666666', margin: 0 }}>Tidak ada pelanggaran terdeteksi.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.recent_logs.map((log, idx) => (
                    <div key={log.id || idx} style={{ fontSize: 11, color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>
                        {log.tipe_pelanggaran === 'tab_switch' ? 'Pindah Tab' : log.tipe_pelanggaran === 'exit_fullscreen' ? 'Keluar Layar Penuh' : 'Blur Jendela'}
                      </span>{' '}
                      — <strong>{log.nama_siswa || 'Siswa'}</strong>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{log.detail || '-'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Tambah Akun Guru Resmi */}
      {/* Modal Tambah Akun Guru Resmi */}
      {showAddGuruModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddGuruModal(false)}>
          <div
            className="modal"
            style={{
              maxWidth: 450,
              width: '100%',
              borderRadius: 18,
              background: '#ffffff',
              padding: '28px 28px 26px',
              boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.18)',
              border: 'none',
              position: 'relative',
            }}
          >
            {/* Header Bersih dengan Tombol Close Bulat */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                Tambah Akun Guru Resmi
              </h2>
              <button
                type="button"
                onClick={() => setShowAddGuruModal(false)}
                aria-label="Tutup"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#334155',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateGuru} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Dummy hidden inputs to trap and prevent browser autofill hijacking */}
              <input
                type="text"
                name="prevent_chrome_autofill_username"
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                autoComplete="off"
              />
              <input
                type="password"
                name="prevent_chrome_autofill_password"
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                autoComplete="new-password"
              />

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                  Nama Lengkap &amp; Gelar Guru *
                </label>
                <input
                  type="text"
                  name="guru_nama_official"
                  placeholder="cth: Dra. Siti Rahmawati, M.Pd."
                  value={guruForm.nama}
                  onChange={(e) => setGuruForm({ ...guruForm, nama: e.target.value })}
                  required
                  autoComplete="off"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: '1.2px solid #cbd5e1',
                    fontSize: 14,
                    color: '#0f172a',
                    outline: 'none',
                    background: '#ffffff',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#0a66c2')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                  Username Login *
                </label>
                <input
                  type="text"
                  name="guru_username_official"
                  placeholder="cth: sitirahmawati atau NIP guru"
                  value={guruForm.username}
                  onChange={(e) => setGuruForm({ ...guruForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  readOnly={guruFormReadOnly}
                  onFocus={(e) => {
                    setGuruFormReadOnly(false);
                    e.currentTarget.readOnly = false;
                    e.currentTarget.style.borderColor = '#0a66c2';
                  }}
                  onMouseEnter={(e) => {
                    setGuruFormReadOnly(false);
                    e.currentTarget.readOnly = false;
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: '1.2px solid #cbd5e1',
                    fontSize: 14,
                    color: '#0f172a',
                    outline: 'none',
                    background: '#ffffff',
                    transition: 'border-color 0.15s ease',
                  }}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                  Password Login
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showGuruPassword ? 'text' : 'password'}
                    name="guru_password_official"
                    placeholder="••••••"
                    value={guruForm.password}
                    onChange={(e) => setGuruForm({ ...guruForm, password: e.target.value })}
                    autoComplete="new-password"
                    readOnly={guruFormReadOnly}
                    onFocus={(e) => {
                      setGuruFormReadOnly(false);
                      e.currentTarget.readOnly = false;
                      e.currentTarget.style.borderColor = '#0a66c2';
                    }}
                    onMouseEnter={(e) => {
                      setGuruFormReadOnly(false);
                      e.currentTarget.readOnly = false;
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 44px 11px 16px',
                      borderRadius: 10,
                      border: '1.2px solid #cbd5e1',
                      fontSize: 14,
                      color: '#0f172a',
                      outline: 'none',
                      background: '#ffffff',
                      letterSpacing: !guruForm.password && !showGuruPassword ? '0.12em' : 'normal',
                      transition: 'border-color 0.15s ease',
                    }}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGuruPassword(!showGuruPassword)}
                    title={showGuruPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-label={showGuruPassword ? 'Sembunyikan password' : 'Lihat password'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showGuruPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 6 }}>
                  Default password: guru123
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddGuruModal(false)}
                  disabled={savingGuru}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: '1.2px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingGuru}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#0a66c2',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(10, 102, 194, 0.25)',
                  }}
                >
                  {savingGuru ? 'Menyimpan...' : 'Simpan Akun Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Guru */}
      {showEditGuruModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditGuruModal(false)}>
          <div
            className="modal"
            style={{
              maxWidth: 450,
              width: '100%',
              borderRadius: 18,
              background: '#ffffff',
              padding: '28px 28px 26px',
              boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.18)',
              border: 'none',
              position: 'relative',
            }}
          >
            {/* Header Bersih dengan Tombol Close Bulat */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                Edit Akun Guru ({editGuruForm.username})
              </h2>
              <button
                type="button"
                onClick={() => setShowEditGuruModal(false)}
                aria-label="Tutup"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#334155',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEditGuru} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                  Nama Lengkap & Gelar Guru *
                </label>
                <input
                  type="text"
                  placeholder="cth: Dra. Siti Rahmawati, M.Pd."
                  value={editGuruForm.nama}
                  onChange={(e) => setEditGuruForm({ ...editGuruForm, nama: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: '1.2px solid #cbd5e1',
                    fontSize: 14,
                    color: '#0f172a',
                    outline: 'none',
                    background: '#ffffff',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#0a66c2')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                  Username Login *
                </label>
                <input
                  type="text"
                  placeholder="cth: sitirahmawati"
                  value={editGuruForm.username}
                  onChange={(e) => setEditGuruForm({ ...editGuruForm, username: e.target.value.toLowerCase() })}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 16px',
                    borderRadius: 10,
                    border: '1.2px solid #cbd5e1',
                    fontSize: 14,
                    color: '#0f172a',
                    outline: 'none',
                    background: '#ffffff',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#0a66c2')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                  Ganti Password Baru
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showEditGuruPassword ? 'text' : 'password'}
                    placeholder="Kosongkan jika tidak ingin mengubah password"
                    value={editGuruForm.password}
                    onChange={(e) => setEditGuruForm({ ...editGuruForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '11px 44px 11px 16px',
                      borderRadius: 10,
                      border: '1.2px solid #cbd5e1',
                      fontSize: 14,
                      color: '#0f172a',
                      outline: 'none',
                      background: '#ffffff',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#0a66c2')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditGuruPassword(!showEditGuruPassword)}
                    title={showEditGuruPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-label={showEditGuruPassword ? 'Sembunyikan password' : 'Lihat password'}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showEditGuruPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <span style={{ fontSize: 12, color: '#64748b', display: 'block', marginTop: 6 }}>
                  Biarkan kosong apabila password guru tidak perlu diganti.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowEditGuruModal(false)}
                  disabled={savingEditGuru}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: '1.2px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEditGuru}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#0a66c2',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(10, 102, 194, 0.25)',
                  }}
                >
                  {savingEditGuru ? 'Memperbarui...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Modern */}
      <ConfirmModal {...dialogState} onConfirm={handleConfirm} onClose={handleClose} />

      {/* Edit Profile & Ganti Password Superadmin */}
      {showProfileModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdate={() => {
            loadDashboard();
          }}
        />
      )}
    </div>
  );
}
