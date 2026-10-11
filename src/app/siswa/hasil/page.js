'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { formatTanggal } from '@/lib/utils';

export default function SiswaHasilPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('siswa');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadResults();
  }, [user]);

  const loadResults = async () => {
    try {
      const res = await authFetch('/api/hasil');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Error fetching results', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat rekap riwayat ujian...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="siswa" />

      <main className="main-content">
        <div className="page-header">
          <h1>Riwayat Hasil Ujian</h1>
          <p>Daftar evaluasi dan asesmen yang telah Anda selesaikan</p>
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="spinner" />
          </div>
        ) : results.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--gray-400)' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <h3>Belum Ada Riwayat Ujian</h3>
              <p>Anda belum menyelesaikan ujian apa pun.</p>
              <a href="/siswa/dashboard" className="btn btn-primary">
                Kembali ke Dashboard
              </a>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Judul Ujian</th>
                    <th>Mata Pelajaran</th>
                    <th>Waktu Pengumpulan</th>
                    <th>Status KKM</th>
                    <th>Nilai Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((res, idx) => {
                    const hasScore = res.tampilkan_nilai && res.total_nilai !== null;
                    const isLulus = hasScore && res.total_nilai >= (res.kkm || 75);

                    return (
                      <tr key={res.id || idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{res.judul}</strong>
                        </td>
                        <td>
                          <span className="badge badge-primary">{res.mata_pelajaran}</span>
                        </td>
                        <td className="text-xs text-muted">
                          {res.waktu_selesai ? formatTanggal(res.waktu_selesai) : '-'}
                        </td>
                        <td>
                          {hasScore ? (
                            <span className={`badge ${isLulus ? 'badge-success' : 'badge-danger'}`}>
                              {isLulus ? 'Tuntas KKM' : 'Perlu Remedial'} (KKM: {res.kkm || 75})
                            </span>
                          ) : (
                            <span className="badge badge-gray">Disimpan Guru</span>
                          )}
                        </td>
                        <td>
                          {hasScore ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                              <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: isLulus ? 'var(--success)' : 'var(--danger)' }}>
                                {res.total_nilai}
                              </span>
                              <span className="text-xs text-muted">
                                ({res.jumlah_benar || 0} Benar)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted">Belum Dipublikasikan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
