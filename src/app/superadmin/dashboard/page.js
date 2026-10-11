'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';

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

  // New Teacher Modal
  const [showAddGuruModal, setShowAddGuruModal] = useState(false);
  const [guruForm, setGuruForm] = useState({
    username: '',
    nama: '',
    password: '',
  });
  const [savingGuru, setSavingGuru] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/superadmin/guru');
      const resData = await res.json();
      if (res.ok) {
        setData({
          teachers: resData.teachers || [],
          stats: resData.stats || {},
          recent_exams: resData.recent_exams || [],
          recent_logs: resData.recent_logs || [],
        });
      }
    } catch (err) {
      console.error('Superadmin load err:', err);
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

  const handleDeleteGuru = async (id, nama) => {
    if (!confirm(`Hapus akun guru resmi "${nama}"? Data ujian milik guru ini tetap diarsipkan.`)) return;
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

  return (
    <div className="app-container" style={{ background: '#f4f2ee', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content" style={{ maxWidth: 1128, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header Ribbon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge badge-primary" style={{ background: '#0f172a', color: '#ffffff', fontSize: 11, padding: '3px 10px' }}>
                HAK AKSES PENUH (OWNER)
              </span>
              <span className="badge badge-success" style={{ fontSize: 11 }}>Sistem Berjalan Normal</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#191919', margin: 0 }}>
              Konsol Superadmin
            </h1>
            <p style={{ fontSize: 13, color: '#666666', marginTop: 4, margin: '4px 0 0' }}>
              Kelola akun guru resmi, pantau seluruh aktivitas pembuatan soal/ujian, dan audit integritas sekolah
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddGuruModal(true)}
              style={{ background: '#0a66c2', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              + Tambah Akun Guru Resmi
            </button>
            <a
              href="/guru/ujian"
              className="btn btn-secondary"
              style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13 }}
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

        {/* Global Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div className="card" style={{ padding: '16px', background: '#ffffff' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 4 }}>Total Guru Terdaftar</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0a66c2' }}>{data.stats.total_guru || 0}</div>
          </div>
          <div className="card" style={{ padding: '16px', background: '#ffffff' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 4 }}>Total Lembar Ujian</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{data.stats.total_ujian || 0}</div>
          </div>
          <div className="card" style={{ padding: '16px', background: '#ffffff' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 4 }}>Total Butir Soal</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>{data.stats.total_soal || 0}</div>
          </div>
          <div className="card" style={{ padding: '16px', background: '#ffffff' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 4 }}>Akun Siswa Terdata</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#057642' }}>{data.stats.total_siswa || 0}</div>
          </div>
          <div className="card" style={{ padding: '16px', background: '#ffffff' }}>
            <div style={{ fontSize: 12, color: '#666666', marginBottom: 4 }}>Pelanggaran Terdeteksi</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626' }}>{data.stats.total_pelanggaran || 0}</div>
          </div>
        </div>

        {/* 2 Column Main Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* Left: Teachers Directory & Activity */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#191919' }}>
                Daftar Akun Guru & Pantauan Aktivitas
              </h2>
              <span className="badge badge-gray" style={{ fontSize: 11 }}>
                {data.teachers.length} Akun Guru
              </span>
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
            ) : (
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
                    {data.teachers.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.nama}</strong>
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Username: <code style={{ fontWeight: 700 }}>{t.username}</code>
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
                        <td style={{ textAlign: 'center' }}>
                          {t.username !== 'guru' ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#dc2626', padding: '2px 8px' }}
                              onClick={() => handleDeleteGuru(t.id, t.nama)}
                              title="Hapus Akun Guru"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                <input
                  className="form-input"
                  placeholder="Default jika kosong: guru123"
                  value={guruForm.password}
                  onChange={(e) => setGuruForm({ ...guruForm, password: e.target.value })}
                />
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
    </div>
  );
}
