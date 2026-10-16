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
  const [form, setForm] = useState({ username: '', nama: '', password: 'guru123' });
  const [saving, setSaving] = useState(false);

  // Modal Edit Guru
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', username: '', nama: '', password: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Search filter
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    loadTeachers();
  }, [user]);

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
    setSaving(true);
    setAlert(null);

    try {
      const res = await authFetch('/api/superadmin/guru', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'danger', message: data.error || 'Gagal membuat akun guru' });
      } else {
        setAlert({ type: 'success', message: data.message });
        setShowAddModal(false);
        setForm({ username: '', nama: '', password: 'guru123' });
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
              onClick={() => setShowAddModal(true)}
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
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: 17, fontWeight: 700 }}>
                Tambah Akun Guru Resmi
              </h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Nama Lengkap & Gelar Guru *</label>
                <input
                  className="form-input"
                  placeholder="cth: Dra. Siti Rahmawati, M.Pd."
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Username Login *</label>
                <input
                  className="form-input"
                  placeholder="cth: sitirahmawati atau NIP guru"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Password Login</label>
                <input
                  className="form-input"
                  placeholder="Default jika kosong: guru123"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
                  Default password: guru123
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#0a66c2' }}
                  disabled={saving}
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
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: 17, fontWeight: 700 }}>
                Edit Akun Guru ({editForm.username})
              </h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: 20 }}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Nama Lengkap & Gelar Guru *</label>
                <input
                  className="form-input"
                  placeholder="cth: Dra. Siti Rahmawati, M.Pd."
                  value={editForm.nama}
                  onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Username Login *</label>
                <input
                  className="form-input"
                  placeholder="cth: sitirahmawati"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })}
                  required
                />
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
                  Username digunakan guru untuk masuk ke sistem DigiAsesmen.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 12 }}>Ganti Password Baru</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Kosongkan jika tidak ingin mengubah password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                />
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
                  Biarkan kosong apabila password saat ini tidak perlu diganti.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={savingEdit}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#0a66c2' }}
                  disabled={savingEdit}
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
