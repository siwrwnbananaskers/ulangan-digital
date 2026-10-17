'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import ConfirmModal, { useConfirmDialog } from '@/components/ConfirmModal';

export default function SuperadminGuruManagementPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('superadmin');
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const { dialogState, confirm: showConfirm, handleConfirm, handleClose } = useConfirmDialog();

  // Modal Tambah Guru
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ username: '', nama: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formReadOnly, setFormReadOnly] = useState(true);

  // Modal Edit Guru
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', username: '', nama: '', password: '' });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Search filter
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadTeachers();
  }, [user]);

  // Anti-autofill reset
  useEffect(() => {
    if (showAddModal) {
      setForm({ username: '', nama: '', password: '' });
      setFormReadOnly(true);
      const timer = setTimeout(() => {
        setForm((prev) => {
          if (prev.username.toLowerCase() === 'superadmin') {
            return { ...prev, username: '', password: '' };
          }
          return prev;
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddModal]);

  const handleOpenAddModal = () => {
    setForm({ username: '', nama: '', password: '' });
    setShowPassword(false);
    setFormReadOnly(true);
    setShowAddModal(true);
  };

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/superadmin/guru?_t=${Date.now()}`);
      const data = await res.json();
      if (res.ok) {
        setTeachers(data.teachers || []);
      } else {
        setAlert({ type: 'danger', message: data.error || 'Gagal memuat daftar guru' });
      }
    } catch (err) {
      setAlert({ type: 'danger', message: 'Koneksi gagal: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      setAlert({ type: 'danger', message: 'Nama lengkap & gelar guru wajib diisi' });
      return;
    }

    const cleanUsername = form.username.trim().toLowerCase();
    if (!cleanUsername) {
      setAlert({ type: 'danger', message: 'Username login guru wajib diisi' });
      return;
    }

    if (cleanUsername === 'superadmin' || cleanUsername === 'admin') {
      setAlert({
        type: 'danger',
        message: "Username 'superadmin' adalah akun administrator sistem. Silakan tentukan username khusus untuk akun guru.",
      });
      return;
    }

    setSaving(true);
    setAlert(null);

    try {
      const res = await authFetch('/api/superadmin/guru', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          username: cleanUsername,
          nama: form.nama.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'danger', message: data.error || 'Gagal membuat akun guru' });
      } else {
        setAlert({ type: 'success', message: data.message });
        setShowAddModal(false);
        setForm({ username: '', nama: '', password: '' });
        loadTeachers();
      }
    } catch {
      setAlert({ type: 'danger', message: 'Terjadi kesalahan sistem' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (guru) => {
    setEditForm({
      id: guru.id,
      username: guru.username,
      nama: guru.nama,
      password: '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setAlert(null);

    try {
      const res = await authFetch('/api/superadmin/guru', {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'danger', message: data.error || 'Gagal memperbarui akun guru' });
      } else {
        setAlert({ type: 'success', message: data.message });
        setShowEditModal(false);
        loadTeachers();
      }
    } catch {
      setAlert({ type: 'danger', message: 'Terjadi kesalahan sistem saat memperbarui' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id, nama) => {
    const ok = await showConfirm({
      title: 'Hapus Akun Guru',
      message: `Hapus akun guru "${nama}"? Data lembar ujian yang dibuat guru ini tetap aman.`,
      confirmText: 'Ya, Hapus',
      type: 'danger',
    });
    if (!ok) return;
    try {
      const res = await authFetch(`/api/superadmin/guru?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: data.message });
        loadTeachers();
      } else {
        setAlert({ type: 'danger', message: data.error || 'Gagal menghapus' });
      }
    } catch {
      setAlert({ type: 'danger', message: 'Gagal menghapus akun guru' });
    }
  };

  const filtered = teachers.filter(t =>
    t.nama?.toLowerCase().includes(search.toLowerCase()) ||
    t.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat Data Guru...</p></div>;
  }

  return (
    <div className="app-container" style={{ background: '#f4f2ee', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content">
        <div className="page-header-ribbon">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <a href="/superadmin/dashboard" style={{ fontSize: 12, color: '#0a66c2', fontWeight: 600, textDecoration: 'none' }}>
                ← Kembali ke Konsol Superadmin
              </a>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#191919', margin: 0 }}>
              Manajemen Akun Guru Terdaftar
            </h1>
            <p style={{ fontSize: 13, color: '#666666', marginTop: 4, margin: '4px 0 0' }}>
              Kelola, pantau jumlah ujian, dan atur akses seluruh dewan guru sekolah
            </p>
          </div>

          <div className="page-header-actions">
            <button
              className="btn btn-primary"
              onClick={handleOpenAddModal}
              style={{ background: '#0a66c2', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Akun Guru Baru
            </button>
          </div>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{alert.message}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setAlert(null)}>✕</button>
          </div>
        )}

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#191919' }}>
              Daftar Dewan Guru ({teachers.length} Guru Terdaftar)
            </div>
            <input
              type="text"
              placeholder="Cari nama atau username..."
              className="form-input"
              style={{ maxWidth: 280, width: '100%', flex: '1 1 200px', padding: '6px 12px', fontSize: 13 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, color: '#666666' }}>Memuat daftar guru...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 36, color: '#666666' }}>
              Belum ada guru yang sesuai dengan pencarian.
            </div>
          ) : (
            <div className="table-container">
              <table className="table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>No</th>
                    <th>Nama Lengkap Guru</th>
                    <th>Username (ID Login)</th>
                    <th>Tipe Akun</th>
                    <th>Ujian Dibuat</th>
                    <th>Bank Soal</th>
                    <th>Waktu Dibuat</th>
                    <th style={{ textAlign: 'center', width: 80 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => (
                    <tr key={t.id || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong>{t.nama}</strong>
                      </td>
                      <td>
                        <code style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                          {t.username}
                        </code>
                      </td>
                      <td>
                        {t.username === 'guru' ? (
                          <span className="badge badge-warning" style={{ fontSize: 10 }}>Akun Demo Bawaan</span>
                        ) : (
                          <span className="badge badge-success" style={{ fontSize: 10 }}>Guru Resmi (Full)</span>
                        )}
                      </td>
                      <td><strong>{t.total_ujian || 0}</strong> Lembar Ujian</td>
                      <td><strong>{t.total_soal || 0}</strong> Butir Soal</td>
                      <td style={{ fontSize: 11, color: '#666666' }}>
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#0a66c2', padding: '4px 8px', borderRadius: 6 }}
                            onClick={() => handleOpenEdit(t)}
                            title="Edit Akun Guru (Nama, Username, Password)"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {t.username !== 'guru' ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#dc2626', padding: '4px 8px', borderRadius: 6 }}
                              onClick={() => handleDelete(t.id, t.nama)}
                              title="Hapus Akun Guru"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#94a3b8', padding: '0 4px' }}>Demo</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal Tambah Guru */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
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
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleCreate} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Dummy hidden inputs to trap and prevent browser autofill hijacking */}
              <input
                type="text"
                name="prevent_chrome_autofill_username_guru"
                tabIndex={-1}
                aria-hidden="true"
                style={{ position: 'absolute', top: -9999, left: -9999, opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                autoComplete="off"
              />
              <input
                type="password"
                name="prevent_chrome_autofill_password_guru"
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
                  name="guru_nama_official_page"
                  placeholder="cth: Dra. Siti Rahmawati, M.Pd."
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
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
                  name="guru_username_official_page"
                  placeholder="cth: sitirahmawati atau NIP guru"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                  required
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  readOnly={formReadOnly}
                  onFocus={(e) => {
                    setFormReadOnly(false);
                    e.currentTarget.readOnly = false;
                    e.currentTarget.style.borderColor = '#0a66c2';
                  }}
                  onMouseEnter={(e) => {
                    setFormReadOnly(false);
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
                    type={showPassword ? 'text' : 'password'}
                    name="guru_password_official_page"
                    placeholder="••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    autoComplete="new-password"
                    readOnly={formReadOnly}
                    onFocus={(e) => {
                      setFormReadOnly(false);
                      e.currentTarget.readOnly = false;
                      e.currentTarget.style.borderColor = '#0a66c2';
                    }}
                    onMouseEnter={(e) => {
                      setFormReadOnly(false);
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
                      letterSpacing: !form.password && !showPassword ? '0.12em' : 'normal',
                      transition: 'border-color 0.15s ease',
                    }}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#cbd5e1')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
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
                    {showPassword ? (
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
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
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
                  disabled={saving}
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
                  {saving ? 'Menyimpan...' : 'Simpan Akun Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Guru */}
      {showEditModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
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
                Edit Akun Guru ({editForm.username})
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
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

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 6 }}>
                  Nama Lengkap & Gelar Guru *
                </label>
                <input
                  type="text"
                  placeholder="cth: Dra. Siti Rahmawati, M.Pd."
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
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
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })}
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
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Kosongkan jika tidak ingin mengubah password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
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
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    title={showEditPassword ? 'Sembunyikan password' : 'Lihat password'}
                    aria-label={showEditPassword ? 'Sembunyikan password' : 'Lihat password'}
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
                    {showEditPassword ? (
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
                  Biarkan kosong apabila password saat ini tidak perlu diganti.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={savingEdit}
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
                  disabled={savingEdit}
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
                  {savingEdit ? 'Memperbarui...' : 'Simpan Perubahan'}
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
