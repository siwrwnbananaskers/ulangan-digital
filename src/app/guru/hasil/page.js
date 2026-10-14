'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { formatTanggal } from '@/lib/utils';
import { generateResultImage, downloadResultImage, copyImageToClipboard } from '@/lib/generateResultImage';

export default function GuruHasilPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [exams, setExams] = useState([]);
  const [selectedUjianId, setSelectedUjianId] = useState('');
  const [examDetail, setExamDetail] = useState(null);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [modalJawaban, setModalJawaban] = useState(null);
  const [loadingJawaban, setLoadingJawaban] = useState(false);
  const [gradingLoadingId, setGradingLoadingId] = useState(null);
  const [scoreInputs, setScoreInputs] = useState({});
  const [imageModal, setImageModal] = useState({
    open: false,
    loading: false,
    sesi: null,
    jawaban: [],
    mode: 'ringkas',
    dataUrl: null,
    copied: false,
  });

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

  const handleViewAnswers = async (resItem) => {
    setLoadingJawaban(true);
    try {
      const res = await authFetch(`/api/hasil?sesi_id=${resItem.id}`);
      const data = await res.json();
      if (res.ok) {
        setModalJawaban(data);
      } else {
        alert(data.error || 'Gagal memuat rincian jawaban siswa');
      }
    } catch {
      alert('Terjadi kesalahan koneksi saat memuat jawaban');
    } finally {
      setLoadingJawaban(false);
    }
  };

  const handleOpenImageModal = async (sesiData, jawabanData = [], initialMode = 'ringkas') => {
    setImageModal({
      open: true,
      loading: true,
      sesi: sesiData,
      jawaban: jawabanData,
      mode: initialMode,
      dataUrl: null,
      copied: false,
    });

    try {
      const dataUrl = await generateResultImage({
        sesi: sesiData,
        jawaban: jawabanData,
        mode: initialMode,
      });
      setImageModal((prev) => ({
        ...prev,
        loading: false,
        dataUrl,
      }));
    } catch (err) {
      console.error('Error generating result image', err);
      setImageModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSwitchImageMode = async (newMode) => {
    if (!imageModal.sesi || imageModal.loading) return;
    setImageModal((prev) => ({ ...prev, mode: newMode, loading: true, copied: false }));

    try {
      const dataUrl = await generateResultImage({
        sesi: imageModal.sesi,
        jawaban: imageModal.jawaban,
        mode: newMode,
      });
      setImageModal((prev) => ({ ...prev, mode: newMode, loading: false, dataUrl }));
    } catch (err) {
      console.error('Error switching image mode', err);
      setImageModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleQuickExportImage = async (resItem) => {
    setLoadingJawaban(true);
    try {
      const res = await authFetch(`/api/hasil?sesi_id=${resItem.id}`);
      const data = await res.json();
      if (res.ok && data.sesi) {
        await handleOpenImageModal(data.sesi, data.jawaban || [], 'ringkas');
      } else {
        alert(data.error || 'Gagal memuat rincian sesi ujian');
      }
    } catch (err) {
      console.error('Failed to load answers for image', err);
      alert('Terjadi kesalahan saat memuat data');
    } finally {
      setLoadingJawaban(false);
    }
  };

  const handleDownloadCurrentImg = () => {
    if (!imageModal.dataUrl || !imageModal.sesi) return;
    const safeName = (imageModal.sesi.nama || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeUjian = (imageModal.sesi.ujian_judul || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadResultImage(imageModal.dataUrl, `Hasil_${safeName}_${safeUjian}.png`);
  };

  const handleCopyCurrentImg = async () => {
    if (!imageModal.dataUrl) return;
    try {
      await copyImageToClipboard(imageModal.dataUrl);
      setImageModal((prev) => ({ ...prev, copied: true }));
      setTimeout(() => {
        setImageModal((prev) => ({ ...prev, copied: false }));
      }, 3000);
    } catch {
      handleDownloadCurrentImg();
    }
  };

  const handleScoreInputChange = (soalId, val) => {
    setScoreInputs((prev) => ({ ...prev, [soalId]: val }));
  };

  const handleKoreksi = async (item, scoreVal, isBenarParam = undefined) => {
    if (!modalJawaban?.sesi?.id) return;
    const maxScore = Number(item.bobot) || 10;
    const numScore = Math.max(0, Math.min(maxScore, Number(scoreVal) || 0));
    const isBenar = isBenarParam !== undefined ? (isBenarParam ? 1 : 0) : (numScore > 0 ? 1 : 0);

    setGradingLoadingId(item.soal_id);
    try {
      const res = await authFetch('/api/hasil', {
        method: 'PATCH',
        body: JSON.stringify({
          sesi_id: modalJawaban.sesi.id,
          action: 'koreksi_soal',
          jawaban_id: item.jawaban_id || null,
          soal_id: item.soal_id,
          is_benar: isBenar,
          nilai_soal: numScore,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setScoreInputs((prev) => ({ ...prev, [item.soal_id]: numScore }));
        setModalJawaban((prev) => {
          if (!prev) return prev;
          const updatedJawaban = prev.jawaban.map((j) =>
            j.soal_id === item.soal_id
              ? {
                  ...j,
                  jawaban_id: data.jawaban_id || j.jawaban_id,
                  is_benar: isBenar,
                  nilai_soal: numScore,
                }
              : j
          );
          return {
            ...prev,
            sesi: {
              ...prev.sesi,
              total_nilai: data.total_nilai,
              jumlah_benar: data.jumlah_benar,
              jumlah_salah: data.jumlah_salah,
              jumlah_kosong: data.jumlah_kosong,
            },
            jawaban: updatedJawaban,
          };
        });
        loadDetail(selectedUjianId);
      } else {
        alert(data.error || 'Gagal memperbarui nilai');
      }
    } catch {
      alert('Terjadi kesalahan koneksi saat mengoreksi soal');
    } finally {
      setGradingLoadingId(null);
    }
  };

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat...</p></div>;
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content">
        <div className="page-header-ribbon">
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#191919', margin: 0 }}>Hasil & Evaluasi Ujian</h1>
            <p style={{ fontSize: 13, color: '#666666', marginTop: 4, margin: '4px 0 0' }}>Pantau nilai siswa, statistik kelulusan KKM, dan status pengerjaan</p>
          </div>
          {selectedUjianId && (
            <div className="page-header-actions">
              <a href={`/guru/audit?ujian_id=${selectedUjianId}`} className="btn btn-secondary" style={{ borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Lihat Audit Pelanggaran Ujian Ini
              </a>
            </div>
          )}
        </div>

        {/* Filter Ujian */}
        <div className="card" style={{ marginBottom: 'var(--space-xl)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 600, color: 'var(--gray-700)', minWidth: 90 }}>
              Pilih Ujian:
            </label>
            <select
              className="form-select"
              style={{ maxWidth: 450, flex: '1 1 220px', width: '100%' }}
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
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleViewAnswers(res)}
                                  disabled={loadingJawaban}
                                  title="Buka dan periksa lembar jawaban siswa ini"
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  Cek Jawaban
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleQuickExportImage(res)}
                                  disabled={loadingJawaban}
                                  title="Cetak dan bagikan kartu hasil siswa ini dalam bentuk gambar (PNG)"
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontWeight: 600 }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                  </svg>
                                  Cetak Gambar
                                </button>
                                {res.status === 'ditangguhkan' && (
                                  <button
                                    type="button"
                                    className="btn btn-warning btn-sm"
                                    onClick={() => handleUnfreeze(res.id)}
                                    title="Buka kembali ujian siswa"
                                  >
                                    Pulihkan Sesi
                                  </button>
                                )}
                              </div>
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

      {/* Modal Cek Jawaban Siswa */}
      {modalJawaban && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalJawaban(null)}>
          <div className="modal modal-lg" style={{ maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ paddingBottom: 'var(--space-md)', borderBottom: '1px solid var(--gray-200)', marginBottom: 'var(--space-md)' }}>
              <div>
                <h3 className="modal-title" style={{ fontSize: 'var(--font-size-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                  <span>Lembar Jawaban Siswa</span>
                  <span className={`badge ${modalJawaban.sesi?.status === 'selesai' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: 'var(--font-size-xs)' }}>
                    {modalJawaban.sesi?.status === 'selesai' ? 'Selesai Dikumpulkan' : 'Sedang Mengerjakan'}
                  </span>
                </h3>
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                  <strong>{modalJawaban.sesi?.nama}</strong> • Kelas {modalJawaban.sesi?.kelas || '-'} (Absen: {modalJawaban.sesi?.no_absen || '-'}) • Ujian: <strong>{modalJawaban.sesi?.ujian_judul}</strong> ({modalJawaban.sesi?.mata_pelajaran})
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => handleOpenImageModal(modalJawaban.sesi, modalJawaban.jawaban, 'ringkas')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                  title="Cetak kartu hasil siswa dalam format gambar siap kirim ke WhatsApp"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Cetak Gambar (PNG)
                </button>
                <button className="modal-close" onClick={() => setModalJawaban(null)} title="Tutup">✕</button>
              </div>
            </div>

            {/* Score Summary Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 'var(--space-sm)',
              background: 'var(--gray-50)',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 'var(--space-lg)',
              border: '1px solid var(--gray-200)',
              textAlign: 'center'
            }}>
              <div>
                <div className="text-xs text-muted">Nilai Akhir</div>
                <div style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 800,
                  color: (modalJawaban.sesi?.total_nilai || 0) >= (modalJawaban.sesi?.kkm || 75) ? 'var(--success)' : 'var(--danger)'
                }}>
                  {modalJawaban.sesi?.total_nilai ?? '-'}
                </div>
                <span className={`badge ${(modalJawaban.sesi?.total_nilai || 0) >= (modalJawaban.sesi?.kkm || 75) ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 10 }}>
                  KKM: {modalJawaban.sesi?.kkm || 75}
                </span>
              </div>
              <div>
                <div className="text-xs text-muted">Jawaban Benar</div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--success)' }}>
                  {modalJawaban.sesi?.jumlah_benar ?? 0}
                </div>
                <span className="text-xs text-muted">Butir Soal</span>
              </div>
              <div>
                <div className="text-xs text-muted">Jawaban Salah</div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--danger)' }}>
                  {modalJawaban.sesi?.jumlah_salah ?? 0}
                </div>
                <span className="text-xs text-muted">Butir Soal</span>
              </div>
              <div>
                <div className="text-xs text-muted">Tidak Dijawab</div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--gray-500)' }}>
                  {modalJawaban.sesi?.jumlah_kosong ?? 0}
                </div>
                <span className="text-xs text-muted">Butir Kosong</span>
              </div>
              <div>
                <div className="text-xs text-muted">Pelanggaran</div>
                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: (modalJawaban.sesi?.jumlah_pelanggaran || 0) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {modalJawaban.sesi?.jumlah_pelanggaran ?? 0}x
                </div>
                <span className="text-xs text-muted">Terdeteksi</span>
              </div>
            </div>

            {/* Questions List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 'var(--space-xs)' }}>
              {!modalJawaban.jawaban || modalJawaban.jawaban.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
                  <p>Tidak ada butir soal dalam lembar ujian ini.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  {modalJawaban.jawaban.map((item, idx) => {
                    const isBenar = item.is_benar === 1;
                    const isSalah = item.is_benar === 0;
                    const isKosong = !item.jawaban_siswa || item.jawaban_siswa.trim() === '';
                    const isUraian = item.tipe === 'uraian';

                    return (
                      <div
                        key={item.soal_id}
                        style={{
                          border: `1px solid ${isBenar ? '#86efac' : isSalah ? '#fca5a5' : 'var(--gray-200)'}`,
                          borderLeft: `5px solid ${isBenar ? 'var(--success)' : isSalah ? 'var(--danger)' : 'var(--gray-400)'}`,
                          borderRadius: 'var(--radius-lg)',
                          padding: 'var(--space-md)',
                          background: isBenar ? '#f0fdf4' : isSalah ? '#fef2f2' : '#ffffff',
                        }}
                      >
                        {/* Question Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)', flexWrap: 'wrap', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <span style={{ fontWeight: 800, fontSize: 'var(--font-size-md)', color: 'var(--gray-900)' }}>
                              Soal #{item.urutan || (idx + 1)}
                            </span>
                            <span className="badge badge-gray" style={{ fontSize: 10 }}>
                              {item.tipe === 'pg' ? 'Pilihan Ganda' :
                               item.tipe === 'isian' ? 'Isian Singkat' :
                               item.tipe === 'benar_salah' ? 'Benar / Salah' : 'Uraian'}
                            </span>
                            <span className="text-xs text-muted">
                              (Bobot: {item.bobot || 10} poin)
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            {Number(item.nilai_soal) >= Number(item.bobot) && (
                              <span className="badge badge-success">Nilai Maksimal: {item.nilai_soal} Poin</span>
                            )}
                            {Number(item.nilai_soal) > 0 && Number(item.nilai_soal) < Number(item.bobot) && (
                              <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                                Nilai Parsial: {item.nilai_soal} / {item.bobot} Poin
                              </span>
                            )}
                            {(Number(item.nilai_soal) === 0 || item.nilai_soal === null) && !isKosong && (
                              <span className="badge badge-danger">0 / {item.bobot} Poin</span>
                            )}
                            {isKosong && (Number(item.nilai_soal) === 0 || item.nilai_soal === null) && (
                              <span className="badge badge-gray">Tidak Dijawab</span>
                            )}
                            {isUraian && item.is_benar === null && (
                              <span className="badge badge-warning">Perlu Penilaian Guru</span>
                            )}
                          </div>
                        </div>

                        {/* Question Text */}
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--gray-800)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                          {item.pertanyaan}
                        </div>

                        {/* PG choices view */}
                        {item.tipe === 'pg' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 'var(--space-sm)' }}>
                            {['a', 'b', 'c', 'd', 'e'].map((opt) => {
                              const text = item[`pilihan_${opt}`];
                              if (!text) return null;
                              const isStudentChoice = (item.jawaban_siswa || '').trim().toLowerCase() === opt;
                              const isKeyChoice = (item.kunci_jawaban || '').trim().toLowerCase() === opt;

                              let bg = 'var(--gray-50)';
                              let border = '1px solid var(--gray-200)';
                              let label = null;

                              if (isKeyChoice && isStudentChoice) {
                                bg = '#dcfce7';
                                border = '2px solid var(--success)';
                                label = <span className="badge badge-success" style={{ fontSize: 9 }}>Jawaban Siswa (Tepat)</span>;
                              } else if (isStudentChoice && !isKeyChoice) {
                                bg = '#fee2e2';
                                border = '2px solid var(--danger)';
                                label = <span className="badge badge-danger" style={{ fontSize: 9 }}>Jawaban Siswa (Salah)</span>;
                              } else if (isKeyChoice) {
                                bg = '#ecfdf5';
                                border = '1px solid var(--success)';
                                label = <span className="badge badge-success" style={{ fontSize: 9 }}>Kunci Jawaban</span>;
                              }

                              return (
                                <div
                                  key={opt}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '6px 10px',
                                    borderRadius: 'var(--radius-md)',
                                    background: bg,
                                    border,
                                    fontSize: 'var(--font-size-xs)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 700, width: 16 }}>{opt.toUpperCase()}.</span>
                                    <span>{text}</span>
                                  </div>
                                  {label}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Non-PG view (Isian, Benar/Salah, Uraian) */}
                        {item.tipe !== 'pg' && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                            <div style={{
                              background: Number(item.nilai_soal) > 0 ? '#dcfce7' : '#fee2e2',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: Number(item.nilai_soal) > 0 ? '1px solid var(--success)' : '1px solid var(--danger)'
                            }}>
                              <div className="text-xs" style={{ fontWeight: 700, color: 'var(--gray-600)', marginBottom: 2 }}>
                                Jawaban Siswa:
                              </div>
                              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--gray-900)' }}>
                                {item.jawaban_siswa ? item.jawaban_siswa : <em className="text-muted">(Kosong / Tidak Menjawab)</em>}
                              </div>
                            </div>

                            <div style={{
                              background: '#eff6ff',
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid #bfdbfe'
                            }}>
                              <div className="text-xs" style={{ fontWeight: 700, color: 'var(--primary-700)', marginBottom: 2 }}>
                                Kunci Jawaban Guru:
                              </div>
                              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--primary-900)' }}>
                                {item.kunci_jawaban || '-'}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Teacher Manual Grading / Custom Score Toolbar */}
                        {(item.tipe === 'isian' || item.tipe === 'uraian') ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 10,
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: '1px dashed rgba(0,0,0,0.1)'
                          }}>
                            {/* Input manual skor 0-10 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--gray-700)' }}>
                                Beri Skor (0 - {item.bobot || 10}):
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.bobot || 10}
                                  step="0.5"
                                  className="form-input"
                                  style={{
                                    width: 68,
                                    height: 32,
                                    padding: '2px 6px',
                                    fontSize: 13,
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    borderRadius: 'var(--radius-md)'
                                  }}
                                  value={scoreInputs[item.soal_id] !== undefined ? scoreInputs[item.soal_id] : (item.nilai_soal ?? 0)}
                                  onChange={(e) => handleScoreInputChange(item.soal_id, e.target.value)}
                                />
                                <span className="text-xs text-muted">/ {item.bobot || 10} poin</span>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-xs"
                                  onClick={() => handleKoreksi(item, scoreInputs[item.soal_id] !== undefined ? scoreInputs[item.soal_id] : (item.nilai_soal ?? 0))}
                                  disabled={gradingLoadingId === item.soal_id}
                                  style={{ height: 32, padding: '0 10px', fontWeight: 600 }}
                                >
                                  {gradingLoadingId === item.soal_id ? 'Menyimpan...' : 'Simpan Skor'}
                                </button>
                              </div>
                            </div>

                            {/* Tombol cepat: 0 (Salah), Setengah, Penuh (Benar) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              <span className="text-xs text-muted" style={{ marginRight: 2 }}>Pilihan Cepat:</span>
                              <button
                                type="button"
                                className="btn btn-xs btn-secondary"
                                onClick={() => handleKoreksi(item, 0, false)}
                                disabled={gradingLoadingId === item.soal_id || Number(item.nilai_soal) === 0}
                                title="Beri skor 0 (Salah)"
                              >
                                0 Poin
                              </button>
                              {(item.bobot || 10) >= 2 && (
                                <button
                                  type="button"
                                  className="btn btn-xs"
                                  onClick={() => handleKoreksi(item, Math.round((item.bobot || 10) / 2), true)}
                                  disabled={gradingLoadingId === item.soal_id || Number(item.nilai_soal) === Math.round((item.bobot || 10) / 2)}
                                  title={`Beri nilai setengah (${Math.round((item.bobot || 10) / 2)} poin)`}
                                  style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                                >
                                  ½ ({Math.round((item.bobot || 10) / 2)} Poin)
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-xs btn-success"
                                onClick={() => handleKoreksi(item, item.bobot || 10, true)}
                                disabled={gradingLoadingId === item.soal_id || Number(item.nilai_soal) === (item.bobot || 10)}
                                title={`Beri skor penuh (${item.bobot || 10} poin)`}
                              >
                                Penuh ({item.bobot || 10})
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 'var(--space-xs)',
                            marginTop: 6,
                            paddingTop: 6,
                            borderTop: '1px dashed rgba(0,0,0,0.1)'
                          }}>
                            <span className="text-xs text-muted" style={{ marginRight: 6 }}>
                              Koreksi Guru:
                            </span>
                            <button
                              type="button"
                              className={`btn btn-xs ${isBenar ? 'btn-success' : 'btn-secondary'}`}
                              onClick={() => handleKoreksi(item, item.bobot || 10, true)}
                              disabled={gradingLoadingId === item.soal_id || isBenar}
                              title="Tandai jawaban ini sebagai Benar (Penuh)"
                            >
                              Benar (+{item.bobot || 10})
                            </button>
                            <button
                              type="button"
                              className={`btn btn-xs ${isSalah ? 'btn-danger' : 'btn-secondary'}`}
                              onClick={() => handleKoreksi(item, 0, false)}
                              disabled={gradingLoadingId === item.soal_id || (isSalah && !isKosong)}
                              title="Tandai jawaban ini sebagai Salah (0 poin)"
                            >
                              Salah (0)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--gray-200)', marginTop: 'var(--space-md)', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => handleOpenImageModal(modalJawaban.sesi, modalJawaban.jawaban, 'ringkas')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                  title="Cetak hasil siswa dalam format gambar untuk dibagikan ke siswa/wali"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Cetak / Bagikan Gambar (PNG)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Cetak Dokumen
                </button>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setModalJawaban(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Gambar Hasil Siswa */}
      {imageModal.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setImageModal((prev) => ({ ...prev, open: false }))}>
          <div className="modal modal-lg" style={{ maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ paddingBottom: 12, borderBottom: '1px solid var(--gray-200)', marginBottom: 14 }}>
              <div>
                <h3 className="modal-title" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Kartu Hasil Ujian (Format Gambar)</span>
                  <span className="badge badge-success" style={{ fontSize: 11 }}>Siap Dibagikan</span>
                </h3>
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Hasil ujian <strong>{imageModal.sesi?.nama}</strong> siap diunduh atau disalin langsung untuk dikirim ke WhatsApp siswa/orang tua.
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setImageModal((prev) => ({ ...prev, open: false }))}
                title="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${imageModal.mode === 'ringkas' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSwitchImageMode('ringkas')}
                disabled={imageModal.loading}
                style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>📸 Kartu Ringkas (Ideal untuk WhatsApp)</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${imageModal.mode === 'lengkap' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSwitchImageMode('lengkap')}
                disabled={imageModal.loading}
                style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>📄 Lembar Rekap Lengkap (Detail Soal)</span>
              </button>
            </div>

            {/* Image Preview Box */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: '#0f172a',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 280,
              maxHeight: '56vh',
            }}>
              {imageModal.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#ffffff' }}>
                  <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#ffffff' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Sedang menyusun gambar hasil ujian...</span>
                </div>
              ) : imageModal.dataUrl ? (
                <img
                  src={imageModal.dataUrl}
                  alt="Kartu Hasil Ujian Siswa"
                  style={{
                    width: '100%',
                    maxWidth: 580,
                    height: 'auto',
                    borderRadius: 8,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    display: 'block',
                  }}
                />
              ) : (
                <p style={{ color: '#94a3b8' }}>Gagal memuat gambar.</p>
              )}
            </div>

            {/* Toast Alert when Copied */}
            {imageModal.copied && (
              <div className="alert alert-success" style={{ marginTop: 12, padding: '8px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✔ <strong>Gambar Berhasil Disalin!</strong> Buka WhatsApp Web lalu tekan <strong>Ctrl + V</strong> (Paste) untuk mengirim langsung ke siswa.</span>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 14,
              borderTop: '1px solid var(--gray-200)',
              marginTop: 14,
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadCurrentImg}
                  disabled={imageModal.loading || !imageModal.dataUrl}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Unduh Gambar (PNG)
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCopyCurrentImg}
                  disabled={imageModal.loading || !imageModal.dataUrl}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                  title="Salin gambar ke clipboard agar bisa langsung di-paste di WhatsApp"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  {imageModal.copied ? 'Tersalin ke Clipboard!' : 'Salin Gambar (Untuk WA)'}
                </button>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setImageModal((prev) => ({ ...prev, open: false }))}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
