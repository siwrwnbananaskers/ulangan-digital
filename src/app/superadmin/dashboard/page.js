'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import ConfirmModal, { useConfirmDialog } from '@/components/ConfirmModal';

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

  // New Teacher Modal
  const [showAddGuruModal, setShowAddGuruModal] = useState(false);
  const [guruForm, setGuruForm] = useState({
    username: '',
    nama: '',
    password: '',
  });
  const [showGuruPassword, setShowGuruPassword] = useState(false);
  const [savingGuru, setSavingGuru] = useState(false);

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
    setSavingGuru(true);
    setAlert(null);

    try {
      const res = await authFetch('/api/superadmin/guru', {
        method: 'POST',
        body: JSON.stringify(guruForm),
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

  return (
    <div className="app-container" style={{ background: '#f4f2ee', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content">
        {/* Modern Executive Header (Anti-AI Slop, Clean & Professional) */}
        <div
          className="card page-header-ribbon"
          style={{
            padding: '20px 24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ maxWidth: 650 }}>
            {/* Meta Status Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '3px 10px',
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  border: '1px solid #1e293b',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                HAK AKSES PENUH (OWNER)
              </span>

              <span
                style={{
                  background: '#f0fdf4',
                  color: '#15803d',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: 6,
                  border: '1px solid #bbf7d0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#16a34a',
                    boxShadow: '0 0 0 2px rgba(22, 163, 74, 0.2)',
                  }}
                />
                Sistem Berjalan Normal
              </span>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: 'clamp(21px, 2.2vw, 25px)',
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.025em',
                lineHeight: 1.25,
              }}
            >
              Konsol Superadmin
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 13.5,
                color: '#64748b',
                margin: '6px 0 0',
                lineHeight: 1.5,
                fontWeight: 400,
              }}
            >
              Kelola akun guru resmi, pantau seluruh aktivitas pembuatan soal/ujian, dan audit integritas sekolah
            </p>
          </div>

          <div className="page-header-actions">
            <a
              href="/superadmin/guru"
              className="btn btn-secondary"
              style={{
                borderRadius: 8,
                padding: '9px 16px',
                fontWeight: 600,
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Kelola Guru Terdaftar
            </a>

            <button
              className="btn btn-primary"
              onClick={() => setShowAddGuruModal(true)}
              style={{
                background: '#0a66c2',
                borderRadius: 8,
                padding: '9px 18px',
                fontWeight: 600,
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(10, 102, 194, 0.25)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tambah Guru
            </button>

            <a
              href="/guru/ujian"
              className="btn btn-secondary"
              style={{
                borderRadius: 8,
                padding: '9px 16px',
                fontWeight: 600,
                fontSize: 13,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
              }}
            >
              Kelola Semua Ujian →
            </a>
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
      {showAddGuruModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddGuruModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: 17, fontWeight: 700 }}>
                Tambah Akun Guru Resmi
              </h2>
              <button className="modal-close" onClick={() => setShowAddGuruModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateGuru} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Nama Lengkap & Gelar Guru *</label>
                <input
                  className="form-input"
                  placeholder="cth: Dra. Siti Rahmawati, M.Pd."
                  value={guruForm.nama}
                  onChange={(e) => setGuruForm({ ...guruForm, nama: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Username Login *</label>
                <input
                  className="form-input"
                  placeholder="cth: sitirahmawati atau NIP guru"
                  value={guruForm.username}
                  onChange={(e) => setGuruForm({ ...guruForm, username: e.target.value.toLowerCase() })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Password Login</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showGuruPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Default jika kosong: guru123"
                    value={guruForm.password}
                    onChange={(e) => setGuruForm({ ...guruForm, password: e.target.value })}
                    style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowGuruPassword(!showGuruPassword)}
                    title={showGuruPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-label={showGuruPassword ? 'Sembunyikan password' : 'Lihat password'}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showGuruPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddGuruModal(false)}
                  disabled={savingGuru}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#0a66c2' }}
                  disabled={savingGuru}
                >
                  {savingGuru ? 'Menyimpan...' : 'Buat Akun Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Guru */}
      {showEditGuruModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditGuruModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: 17, fontWeight: 700 }}>
                Edit Akun Guru ({editGuruForm.username})
              </h2>
              <button className="modal-close" onClick={() => setShowEditGuruModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveEditGuru} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Nama Lengkap & Gelar Guru *</label>
                <input
                  className="form-input"
                  placeholder="cth: Dra. Siti Rahmawati, M.Pd."
                  value={editGuruForm.nama}
                  onChange={(e) => setEditGuruForm({ ...editGuruForm, nama: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Username Login *</label>
                <input
                  className="form-input"
                  placeholder="cth: sitirahmawati"
                  value={editGuruForm.username}
                  onChange={(e) => setEditGuruForm({ ...editGuruForm, username: e.target.value.toLowerCase() })}
                  required
                />
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
                  Username digunakan guru untuk masuk ke portal.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Ganti Password Baru</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showEditGuruPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Kosongkan jika tidak ingin mengubah password"
                    value={editGuruForm.password}
                    onChange={(e) => setEditGuruForm({ ...editGuruForm, password: e.target.value })}
                    style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditGuruPassword(!showEditGuruPassword)}
                    title={showEditGuruPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-label={showEditGuruPassword ? 'Sembunyikan password' : 'Lihat password'}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showEditGuruPassword ? (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
                  Biarkan kosong apabila password guru tidak perlu diganti.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditGuruModal(false)}
                  disabled={savingEditGuru}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#0a66c2' }}
                  disabled={savingEditGuru}
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
    </div>
  );
}
