'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';

export default function GuruDashboard() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [stats, setStats] = useState({ ujian: 0, soal: 0, siswa_aktif: 0, selesai: 0 });
  const [ujianList, setUjianList] = useState([]);
  const [loading, setLoading] = useState(true);

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

      setUjianList(ujianArr.slice(0, 5));
      setStats({
        ujian: ujianArr.length,
        soal: soalArr.length,
        siswa_aktif: ujianArr.reduce((acc, u) => acc + (u.total_peserta || 0), 0),
        selesai: ujianArr.filter(u => u.status === 'selesai').length,
      });
    } catch (err) {
      console.error('Load dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat...</p></div>;
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content">
        <div className="page-header">
          <h1>Selamat Datang, {user?.nama} 👋</h1>
          <p>Kelola ujian dan pantau hasil siswa Anda</p>
        </div>

        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.ujian}</div>
            <div className="stat-label">Total Ujian</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{stats.soal}</div>
            <div className="stat-label">Bank Soal</div>
          </div>
          <div className="stat-card info">
            <div className="stat-value">{stats.siswa_aktif}</div>
            <div className="stat-label">Peserta Aktif</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{stats.selesai}</div>
            <div className="stat-label">Ujian Selesai</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="card-header">
            <h2 className="card-title">Aksi Cepat</h2>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <a href="/guru/bank-soal" className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Soal
            </a>
            <a href="/guru/ujian" className="btn btn-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Buat Ujian Baru
            </a>
            <a href="/guru/hasil" className="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10"/></svg>
              Lihat Hasil
            </a>
            <a href="/guru/audit" className="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              Audit Log
            </a>
          </div>
        </div>

        {/* Recent Exams */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Ujian Terbaru</h2>
            <a href="/guru/ujian" className="btn btn-ghost btn-sm">Lihat Semua →</a>
          </div>

          {loading ? (
            <div className="loading-page" style={{ minHeight: 200 }}>
              <div className="spinner" />
            </div>
          ) : ujianList.length === 0 ? (
            <div className="empty-state">
              <h3>Belum ada ujian</h3>
              <p>Mulai buat ujian pertama Anda</p>
              <a href="/guru/ujian" className="btn btn-primary">Buat Ujian</a>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Judul</th>
                    <th>Mata Pelajaran</th>
                    <th>Kode</th>
                    <th>Peserta</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {ujianList.map((ujian) => (
                    <tr key={ujian.id}>
                      <td><strong>{ujian.judul}</strong></td>
                      <td>{ujian.mata_pelajaran}</td>
                      <td>
                        <code style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                          {ujian.kode_ujian}
                        </code>
                      </td>
                      <td>{ujian.peserta_selesai || 0}/{ujian.total_peserta || 0}</td>
                      <td>
                        <span className={`badge ${
                          ujian.status === 'aktif' ? 'badge-success' : 
                          ujian.status === 'selesai' ? 'badge-gray' : 'badge-warning'
                        }`}>
                          {ujian.status === 'aktif' ? 'Aktif' : ujian.status === 'selesai' ? 'Selesai' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <a href={`/guru/hasil?ujian_id=${ujian.id}`} className="btn btn-ghost btn-sm">
                          Detail
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
