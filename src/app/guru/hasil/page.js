'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { formatTanggal } from '@/lib/utils';

export default function GuruHasilPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [exams, setExams] = useState([]);
  const [selectedUjianId, setSelectedUjianId] = useState('');
  const [examDetail, setExamDetail] = useState(null);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadExams();
  }, [user]);

  // Read query params if any
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ujianId = params.get('ujian_id');
      if (ujianId) {
        setSelectedUjianId(ujianId);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedUjianId) {
      loadDetail(selectedUjianId);
    }
  }, [selectedUjianId]);

  const loadExams = async () => {
    try {
      const res = await authFetch('/api/hasil');
      const data = await res.json();
      const list = data.exams || [];
      setExams(list);
      if (list.length > 0 && !selectedUjianId) {
        setSelectedUjianId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load exams list', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (ujianId) => {
    setLoadingDetail(true);
    try {
      const res = await authFetch(`/api/hasil?ujian_id=${ujianId}`);
      const data = await res.json();
      setExamDetail(data.ujian || null);
      setResults(data.results || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Failed to load results detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUnfreeze = async (sesiId) => {
    if (!confirm('Apakah Anda yakin ingin memulihkan sesi ujian siswa ini agar dapat melanjutkan ujian?')) return;
    try {
      const res = await authFetch('/api/hasil', {
        method: 'PATCH',
        body: JSON.stringify({ sesi_id: sesiId, action: 'unfreeze' }),
      });
      if (res.ok) {
        alert('Sesi siswa berhasil dipulihkan!');
        loadDetail(selectedUjianId);
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal memulihkan sesi');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi');
    }
  };

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat...</p></div>;
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h1>Hasil & Evaluasi Ujian</h1>
            <p>Pantau nilai siswa, statistik kelulusan KKM, dan status pengerjaan</p>
          </div>
          {selectedUjianId && (
            <a href={`/guru/audit?ujian_id=${selectedUjianId}`} className="btn btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Lihat Audit Pelanggaran Ujian Ini
            </a>
          )}
        </div>

        {/* Filter Ujian */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 600, color: 'var(--gray-700)', minWidth: 100 }}>
              Pilih Ujian:
            </label>
            <select
              className="form-select"
              style={{ maxWidth: 450, flex: 1 }}
              value={selectedUjianId}
              onChange={(e) => setSelectedUjianId(e.target.value)}
            >
              {exams.length === 0 ? (
                <option value="">Belum ada ujian</option>
              ) : (
                exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.judul} ({ex.mata_pelajaran} - {ex.kelas_target}) [{ex.kode_ujian}]
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {loading || loadingDetail ? (
          <div className="loading-page"><div className="spinner" /><p>Memuat rekapitulasi nilai...</p></div>
        ) : !examDetail ? (
          <div className="card">
            <div className="empty-state">
              <h3>Tidak ada data ujian yang dipilih</h3>
              <p>Pilih salah satu ujian dari dropdown di atas atau buat ujian baru.</p>
              <a href="/guru/ujian" className="btn btn-primary">Ke Manajemen Ujian</a>
            </div>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            {stats && (
              <div className="stat-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="stat-card">
                  <div className="stat-value">{stats.total_peserta}</div>
                  <div className="stat-label">Total Peserta</div>
                </div>
                <div className="stat-card success">
                  <div className="stat-value">{stats.rata_rata}</div>
                  <div className="stat-label">Rata-Rata Nilai</div>
                </div>
                <div className="stat-card info">
                  <div className="stat-value">{stats.lulus_kkm} / {stats.total_selesai}</div>
                  <div className="stat-label">Lulus KKM (≥ {examDetail.kkm})</div>
                </div>
                <div className="stat-card warning">
                  <div className="stat-value">{stats.total_ditangguhkan}</div>
                  <div className="stat-label">Ditangguhkan (Pelanggaran)</div>
                </div>
              </div>
            )}

            {/* Rekap Nilai Table */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 className="card-title">Daftar Nilai Siswa</h2>
                  <p className="text-sm text-muted">
                    {examDetail.judul} • KKM: {examDetail.kkm} • {results.length} siswa terdaftar
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <span className="badge badge-primary">{examDetail.mata_pelajaran}</span>
                  <span className="badge badge-gray">{examDetail.kelas_target}</span>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="empty-state">
                  <p>Belum ada siswa yang mengikuti ujian ini.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Nama Siswa</th>
                        <th>Kelas / Absen</th>
                        <th>Status</th>
                        <th>Waktu Mulai</th>
                        <th>Benar / Salah</th>
                        <th>Nilai Akhir</th>
                        <th>Pelanggaran</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((res, idx) => {
                        const isLulus = res.total_nilai !== null && res.total_nilai >= (examDetail.kkm || 75);
                        return (
                          <tr key={res.id}>
                            <td>{idx + 1}</td>
                            <td>
                              <strong>{res.nama}</strong>
                            </td>
                            <td>{res.kelas || '-'} / {res.no_absen || '-'}</td>
                            <td>
                              <span className={`badge ${
                                res.status === 'selesai' ? 'badge-success' :
                                res.status === 'ditangguhkan' ? 'badge-danger' :
                                res.status === 'berlangsung' ? 'badge-info' : 'badge-gray'
                              }`}>
                                {res.status === 'selesai' ? 'Selesai' :
                                 res.status === 'ditangguhkan' ? 'Ditangguhkan' :
                                 res.status === 'berlangsung' ? 'Mengerjakan' : 'Belum Mulai'}
                              </span>
                            </td>
                            <td className="text-xs text-muted">
                              {res.waktu_mulai ? formatTanggal(res.waktu_mulai) : '-'}
                            </td>
                            <td>
                              {res.status === 'selesai' ? (
                                <span className="text-xs">
                                  <strong className="text-success">{res.jumlah_benar || 0} Benar</strong> •{' '}
                                  <span className="text-danger">{res.jumlah_salah || 0} Salah</span> •{' '}
                                  <span className="text-muted">{res.jumlah_kosong || 0} Kosong</span>
                                </span>
                              ) : '-'}
                            </td>
                            <td>
                              {res.total_nilai !== null ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                  <span style={{
                                    fontSize: 'var(--font-size-lg)',
                                    fontWeight: 800,
                                    color: isLulus ? 'var(--success)' : 'var(--danger)'
                                  }}>
                                    {res.total_nilai}
                                  </span>
                                  <span className={`badge ${isLulus ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>
                                    {isLulus ? 'Tuntas' : 'Remidi'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted text-xs">-</span>
                              )}
                            </td>
                            <td>
                              {res.total_pelanggaran > 0 ? (
                                <span className="badge badge-danger">
                                  {res.total_pelanggaran}x Pelanggaran
                                </span>
                              ) : (
                                <span className="badge badge-success">0 Tertib</span>
                              )}
                            </td>
                            <td>
                              {res.status === 'ditangguhkan' && (
                                <button
                                  className="btn btn-warning btn-sm"
                                  onClick={() => handleUnfreeze(res.id)}
                                  title="Buka kembali ujian siswa"
                                >
                                  Pulihkan Sesi
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
