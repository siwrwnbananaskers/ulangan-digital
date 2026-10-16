'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { formatTanggal } from '@/lib/utils';
import { generateResultImage, downloadResultImage } from '@/lib/generateResultImage';

export default function SiswaHasilPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('siswa');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

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

  const handleDownloadCard = async (resItem) => {
    setDownloadingId(resItem.id);
    try {
      const dataUrl = await generateResultImage({
        sesi: {
          nama: user?.nama || 'Siswa',
          kelas: user?.kelas || '-',
          no_absen: user?.no_absen || '-',
          ujian_judul: resItem.judul,
          mata_pelajaran: resItem.mata_pelajaran,
          kkm: resItem.kkm || 75,
          total_nilai: resItem.total_nilai,
          jumlah_benar: resItem.jumlah_benar,
          jumlah_salah: resItem.jumlah_salah,
          jumlah_kosong: resItem.jumlah_kosong,
          jumlah_pelanggaran: resItem.total_pelanggaran,
          status: 'selesai',
          waktu_selesai: resItem.waktu_selesai,
        },
        jawaban: [],
        mode: 'ringkas',
      });
      const safeName = (user?.nama || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeJudul = (resItem.judul || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadResultImage(dataUrl, `Hasil_${safeName}_${safeJudul}.png`);
    } catch (err) {
      console.error('Failed to generate student card', err);
    } finally {
      setDownloadingId(null);
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
          <div>
            {/* Desktop Table View */}
            <div className="card hasil-table-desktop">
              <div className="table-container">
                <table className="table" style={{ minWidth: 680 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>No</th>
                      <th>Judul Ujian</th>
                      <th>Mata Pelajaran</th>
                      <th>Waktu Pengumpulan</th>
                      <th>Status KKM</th>
                      <th style={{ minWidth: 160, whiteSpace: 'nowrap' }}>Nilai Akhir</th>
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
                          <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>
                            {res.waktu_selesai ? formatTanggal(res.waktu_selesai) : '-'}
                          </td>
                          <td>
                            {res.menunggu_koreksi ? (
                              <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', whiteSpace: 'nowrap' }}>
                                Menunggu Koreksi
                              </span>
                            ) : hasScore ? (
                              <span className={`badge ${isLulus ? 'badge-success' : 'badge-danger'}`} style={{ whiteSpace: 'nowrap' }}>
                                {isLulus ? 'Tuntas KKM' : 'Perlu Remedial'} (KKM: {res.kkm || 75})
                              </span>
                            ) : (
                              <span className="badge badge-gray" style={{ whiteSpace: 'nowrap' }}>Disimpan Guru</span>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {res.menunggu_koreksi ? (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>
                                  Proses Penilaian
                                </span>
                                <span className="text-xs text-muted">
                                  ({res.jumlah_benar || 0} PG Benar)
                                </span>
                              </div>
                            ) : hasScore ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                                  <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 800, color: isLulus ? 'var(--success)' : 'var(--danger)' }}>
                                    {res.total_nilai}
                                  </span>
                                  <span className="text-xs text-muted">
                                    ({res.jumlah_benar || 0} Benar)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-xs"
                                  onClick={() => handleDownloadCard(res)}
                                  disabled={downloadingId === res.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    whiteSpace: 'nowrap',
                                    fontWeight: 600,
                                    padding: '4px 10px',
                                    fontSize: 11,
                                    borderRadius: 6,
                                  }}
                                  title="Unduh kartu hasil ujian ini dalam format gambar"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                  </svg>
                                  {downloadingId === res.id ? 'Menyusun...' : 'Unduh Gambar'}
                                </button>
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

            {/* Mobile Cards View */}
            <div className="hasil-cards-mobile">
              {results.map((res, idx) => {
                const hasScore = res.tampilkan_nilai && res.total_nilai !== null;
                const isLulus = hasScore && res.total_nilai >= (res.kkm || 75);

                return (
                  <div
                    key={res.id || idx}
                    className="card"
                    style={{
                      padding: '16px',
                      background: '#ffffff',
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-primary" style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6 }}>
                        {res.mata_pelajaran}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {res.waktu_selesai ? formatTanggal(res.waktu_selesai) : '-'}
                      </span>
                    </div>

                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 6px', lineHeight: 1.35 }}>
                        {res.judul}
                      </h3>
                      <div>
                        {res.menunggu_koreksi ? (
                          <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: 11 }}>
                            Menunggu Koreksi Guru
                          </span>
                        ) : hasScore ? (
                          <span className={`badge ${isLulus ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                            {isLulus ? 'Tuntas KKM' : 'Perlu Remedial'} (KKM: {res.kkm || 75})
                          </span>
                        ) : (
                          <span className="badge badge-gray" style={{ fontSize: 11 }}>Disimpan Guru</span>
                        )}
                      </div>
                    </div>

                    {/* Score & Action Row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: 12,
                        borderTop: '1px solid #f1f5f9',
                        marginTop: 2,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Nilai Akhir
                        </div>
                        {hasScore ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 24, fontWeight: 900, color: isLulus ? 'var(--success)' : 'var(--danger)', lineHeight: 1 }}>
                              {res.total_nilai}
                            </span>
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                              ({res.jumlah_benar || 0} Benar)
                            </span>
                          </div>
                        ) : res.menunggu_koreksi ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>
                            Proses Penilaian
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>Belum Dipublikasikan</span>
                        )}
                      </div>

                      {hasScore && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleDownloadCard(res)}
                          disabled={downloadingId === res.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '8px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            borderRadius: 8,
                            whiteSpace: 'nowrap',
                            height: 38,
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                          {downloadingId === res.id ? 'Menyusun...' : 'Unduh Gambar'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
