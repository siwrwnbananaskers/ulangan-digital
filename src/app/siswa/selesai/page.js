'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { formatTanggal } from '@/lib/utils';

function SelesaiContent() {
  const searchParams = useSearchParams();
  const ujianId = searchParams.get('ujian_id');
  const sesiId = searchParams.get('sesi_id');

  const { user, loading: authLoading, logout, authFetch } = useAuth('siswa');
  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadResult();
  }, [user]);

  const loadResult = async () => {
    try {
      const res = await authFetch('/api/hasil');
      const data = await res.json();
      const list = data.results || [];
      const current = list.find((r) => r.ujian_id === ujianId || r.id === sesiId);
      setResultData(current || null);
    } catch (err) {
      console.error('Error fetching result', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat konfirmasi selesai...</p>
      </div>
    );
  }

  const canShowScore = resultData && resultData.tampilkan_nilai && resultData.total_nilai !== null;
  const isLulus = canShowScore && resultData.total_nilai >= (resultData.kkm || 75);

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="siswa" />

      <main className="main-content">
        <div className="completion-page">
          <div className="card completion-card">
            <div className="completion-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1>Ujian Berhasil Dikumpulkan!</h1>
            <p>
              Jawaban Anda untuk <strong>{resultData?.judul || 'Asesmen'}</strong> telah tersimpan aman di sistem.
            </p>

            {resultData?.menunggu_koreksi ? (
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: 20, borderRadius: 12, margin: '20px 0', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#854d0e', fontWeight: 700, marginBottom: 6 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>Menunggu Penilaian Guru Pengawas</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#713f12', lineHeight: 1.5 }}>
                  Lembar ujian memuat butir soal <strong>Isian / Uraian</strong> yang dinilai manual langsung oleh Guru Pengawas Anda sesuai bobot.
                  Nilai akhir resmi dan status kelulusan KKM akan diperbarui setelah guru menyelesaikan koreksi.
                </p>
                <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 13, color: '#854d0e', flexWrap: 'wrap' }}>
                  <span>Pilihan Ganda: <strong>{resultData.jumlah_benar || 0} Benar</strong></span>
                  <span>•</span>
                  <span>Status Esai: <strong>Sedang Dinilai Guru</strong></span>
                </div>
              </div>
            ) : canShowScore ? (
              <>
                <div className="completion-stats">
                  <div className="completion-stat">
                    <div className="completion-stat-value" style={{ color: isLulus ? 'var(--success)' : 'var(--danger)' }}>
                      {resultData.total_nilai}
                    </div>
                    <div className="completion-stat-label">Nilai Akhir (KKM: {resultData.kkm || 75})</div>
                  </div>
                  <div className="completion-stat">
                    <div className="completion-stat-value text-success">
                      {resultData.jumlah_benar || 0}
                    </div>
                    <div className="completion-stat-label">Jawaban Benar</div>
                  </div>
                  <div className="completion-stat">
                    <div className="completion-stat-value text-danger">
                      {resultData.jumlah_salah || 0}
                    </div>
                    <div className="completion-stat-label">Jawaban Salah</div>
                  </div>
                </div>

                <div style={{ marginBottom: 'var(--space-xl)' }}>
                  <span className={`badge ${isLulus ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 'var(--font-size-sm)', padding: '6px 16px' }}>
                    {isLulus ? 'Tuntas Melampaui KKM' : 'Belum Mencapai KKM (Perlu Remedial)'}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ background: 'var(--primary-50)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', margin: 'var(--space-xl) 0', border: '1px solid var(--primary-200)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', color: 'var(--primary-700)', fontWeight: 600 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Hasil Evaluasi Ditutup</span>
                </div>
                <p className="text-xs text-muted" style={{ marginTop: 'var(--space-xs)' }}>
                  Guru pengawas mengatur pengumuman nilai setelah seluruh sesi asesmen selesai dikoreksi.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/siswa/dashboard" className="btn btn-primary btn-lg">
                Kembali ke Dashboard
              </a>
              <a href="/siswa/hasil" className="btn btn-secondary btn-lg">
                Lihat Riwayat Ujian
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SiswaSelesaiPage() {
  return (
    <Suspense fallback={<div className="loading-page"><div className="spinner" /><p>Memuat...</p></div>}>
      <SelesaiContent />
    </Suspense>
  );
}
