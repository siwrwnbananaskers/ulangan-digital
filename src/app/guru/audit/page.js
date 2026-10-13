'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { formatTanggal } from '@/lib/utils';

export default function GuruAuditPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [exams, setExams] = useState([]);
  const [selectedUjianId, setSelectedUjianId] = useState('');
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [filterType, setFilterType] = useState('semua');

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
      loadViolations(selectedUjianId);
    }
  }, [selectedUjianId]);

  const loadExams = async () => {
    try {
      const res = await authFetch('/api/ujian');
      const data = await res.json();
      const list = data.ujian || [];
      setExams(list);
      if (list.length > 0 && !selectedUjianId) {
        setSelectedUjianId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load exams', err);
    } finally {
      setLoading(false);
    }
  };

  const loadViolations = async (ujianId) => {
    setLoadingLogs(true);
    try {
      const res = await authFetch(`/api/ujian/${ujianId}/violation`);
      const data = await res.json();
      setViolations(data.violations || []);
    } catch (err) {
      console.error('Failed to load violation logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleUnfreeze = async (sesiId) => {
    if (!confirm('Pulihkan status ujian siswa ini agar dapat melanjutkan kembali tanpa reload browser?')) return;
    try {
      const res = await authFetch('/api/hasil', {
        method: 'PATCH',
        body: JSON.stringify({ sesi_id: sesiId, action: 'unfreeze' }),
      });
      if (res.ok) {
        // Optimistically update all violation records of this session to restored
        setViolations(prev => prev.map(v => v.sesi_id === sesiId ? { ...v, sesi_status: 'berlangsung', jumlah_pelanggaran: 0 } : v));
        loadViolations(selectedUjianId);
      } else {
        const d = await res.json();
        alert(d.error || 'Gagal memulihkan');
      }
    } catch {
      alert('Terjadi kesalahan koneksi');
    }
  };

  const filteredViolations = violations.filter(v => {
    if (filterType === 'semua') return true;
    return v.tipe_pelanggaran === filterType;
  });

  const getViolationBadge = (type) => {
    switch (type) {
      case 'tab_switch':
        return <span className="badge badge-warning">Berpindah Tab</span>;
      case 'window_blur':
        return <span className="badge badge-danger">Keluar Fokus Jendela</span>;
      case 'exit_fullscreen':
        return <span className="badge badge-danger">Keluar Fullscreen</span>;
      default:
        return <span className="badge badge-gray">{type}</span>;
    }
  };

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat...</p></div>;
  }

  const currentExam = exams.find(e => e.id === selectedUjianId);

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content">
        <div className="page-header-ribbon">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#191919', margin: 0 }}>Audit Log Integritas Ujian</h1>
            <p style={{ fontSize: 13, color: '#666666', marginTop: 4, margin: '4px 0 0' }}>Rekam jejak real-time aktivitas siswa (Page Visibility, Blur Focus, Exit Fullscreen)</p>
          </div>
          {selectedUjianId && (
            <div className="page-header-actions">
              <a href={`/guru/hasil?ujian_id=${selectedUjianId}`} className="btn btn-secondary" style={{ borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
                </svg>
                Lihat Rekap Nilai
              </a>
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)', padding: 16 }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0, width: '100%' }}>
              <label className="form-label" style={{ marginBottom: 'var(--space-xs)' }}>Pilih Ujian:</label>
              <select
                className="form-select"
                value={selectedUjianId}
                onChange={(e) => setSelectedUjianId(e.target.value)}
              >
                {exams.length === 0 ? (
                  <option value="">Belum ada ujian</option>
                ) : (
                  exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.judul} ({ex.mata_pelajaran}) [{ex.kode_ujian}]
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ flex: '1 1 180px', minWidth: 0, width: '100%' }}>
              <label className="form-label" style={{ marginBottom: 'var(--space-xs)' }}>Tipe Pelanggaran:</label>
              <select
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="semua">Semua Aktivitas ({violations.length})</option>
                <option value="tab_switch">Berpindah Tab</option>
                <option value="window_blur">Window Blur / Minim</option>
                <option value="exit_fullscreen">Keluar Fullscreen</option>
              </select>
            </div>
          </div>
        </div>

        {loading || loadingLogs ? (
          <div className="loading-page"><div className="spinner" /><p>Memuat rekaman log pelanggaran...</p></div>
        ) : !selectedUjianId ? (
          <div className="card">
            <div className="empty-state">
              <h3>Pilih Ujian</h3>
              <p>Pilih ujian untuk melihat riwayat audit integritas siswa.</p>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className="card-title">Riwayat Log Kejadian</h2>
                <p className="text-sm text-muted">
                  Batas pelanggaran ujian ini: {currentExam?.batas_pelanggaran || 3}x kejadian sebelum ditangguhkan
                </p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <span className="badge badge-danger">
                  Total Kejadian: {violations.length}
                </span>
              </div>
            </div>

            {filteredViolations.length === 0 ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--success)' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3>Tidak Ada Pelanggaran Terdeteksi</h3>
                <p>Seluruh peserta ujian mematuhi mode ujian dengan tertib dan fokus.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Waktu Kejadian</th>
                      <th>Siswa</th>
                      <th>Kelas</th>
                      <th>Jenis Pelanggaran</th>
                      <th>Detail & Keterangan</th>
                      <th>Tindakan Pengawas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredViolations.map((v, idx) => (
                      <tr key={v.id || idx}>
                        <td>{idx + 1}</td>
                        <td className="text-xs" style={{ whiteSpace: 'nowrap' }}>
                          <strong>{formatTanggal(v.timestamp)}</strong>
                        </td>
                        <td>
                          <strong>{v.siswa_nama || 'Siswa'}</strong>
                        </td>
                        <td>
                          <span className="badge badge-gray">{v.siswa_kelas || '-'}</span>
                        </td>
                        <td>{getViolationBadge(v.tipe_pelanggaran)}</td>
                        <td style={{ maxWidth: 360 }}>
                          <span className="text-sm" style={{ color: 'var(--gray-700)' }}>
                            {String(v.detail || '-').replace(/&#x2F;/g, '/').replace(/&amp;/g, '&')}
                          </span>
                        </td>
                        <td>
                          {(() => {
                            const batas = Number(currentExam?.batas_pelanggaran) || 3;
                            const vCount = Number(v.jumlah_pelanggaran) || 0;
                            const isSuspended = v.sesi_status === 'ditangguhkan' || vCount >= batas;
                            const isRestored = v.sesi_status === 'berlangsung' && vCount === 0;

                            if (isSuspended) {
                              return (
                                <button
                                  className="btn btn-warning btn-sm"
                                  style={{ fontSize: 11, padding: '5px 12px', fontWeight: 600, borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                                  onClick={() => handleUnfreeze(v.sesi_id)}
                                  title="Buka kembali kunci ujian siswa"
                                >
                                  <span>🔓</span> Pulihkan Ujian
                                </button>
                              );
                            }

                            if (isRestored) {
                              return (
                                <span
                                  className="badge"
                                  style={{ fontSize: 11, padding: '4px 10px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontWeight: 600, whiteSpace: 'nowrap' }}
                                >
                                  ✓ Sudah Dipulihkan
                                </span>
                              );
                            }

                            if (v.sesi_status === 'selesai') {
                              return (
                                <span className="badge badge-gray" style={{ fontSize: 11, padding: '3px 8px', whiteSpace: 'nowrap' }}>
                                  Ujian Selesai
                                </span>
                              );
                            }

                            return (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  className="badge"
                                  style={{ fontSize: 11, padding: '3px 8px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', whiteSpace: 'nowrap' }}
                                >
                                  Peringatan ({vCount}/{batas})
                                </span>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}
                                  onClick={() => handleUnfreeze(v.sesi_id)}
                                  title="Reset hitungan pelanggaran menjadi 0"
                                >
                                  Reset
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
