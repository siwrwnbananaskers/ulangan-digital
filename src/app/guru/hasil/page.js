'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import { formatTanggal } from '@/lib/utils';
import { generateResultImage, downloadResultImage, copyImageToClipboard } from '@/lib/generateResultImage';
import {
  exportRekapToExcel,
  generateRekapTableImage,
  downloadRekapImage,
  copyRekapImageToClipboard,
  printRekapDocument,
} from '@/lib/generateRekapNilai';

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
  const [batchModal, setBatchModal] = useState({
    open: false,
    loading: false,
    progress: 0,
    total: 0,
    statusText: '',
    filterStatus: 'all',
    mode: 'ringkas',
    items: [],
    zipping: false,
  });
  const [rekapModal, setRekapModal] = useState({
    open: false,
    loading: false,
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
        guruNama: user?.nama || examDetail?.guru_nama || 'Guru Pengampu',
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
        guruNama: user?.nama || examDetail?.guru_nama || 'Guru Pengampu',
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

  const handleOpenRekapModal = async () => {
    if (!examDetail) return;
    setRekapModal({
      open: true,
      loading: true,
      dataUrl: null,
      copied: false,
    });

    try {
      const dataUrl = await generateRekapTableImage({
        examDetail,
        results,
        guruNama: user?.nama || examDetail?.guru_nama || 'Guru Pengampu',
      });
      setRekapModal((prev) => ({
        ...prev,
        loading: false,
        dataUrl,
      }));
    } catch (err) {
      console.error('Failed to generate rekap table image', err);
      setRekapModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleExportExcelQuick = () => {
    if (!examDetail) return;
    exportRekapToExcel({
      examDetail,
      results,
      guruNama: user?.nama || examDetail?.guru_nama || 'Guru Pengampu',
    });
  };

  const handleDownloadRekapImg = () => {
    if (!rekapModal.dataUrl) return;
    const safeJudul = (examDetail?.judul || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeKelas = (examDetail?.kelas_target || 'Kelas').replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadRekapImage(rekapModal.dataUrl, `Leger_Rekap_Nilai_${safeJudul}_${safeKelas}.png`);
  };

  const handleCopyRekapImg = async () => {
    if (!rekapModal.dataUrl) return;
    try {
      await copyRekapImageToClipboard(rekapModal.dataUrl);
      setRekapModal((prev) => ({ ...prev, copied: true }));
      setTimeout(() => {
        setRekapModal((prev) => ({ ...prev, copied: false }));
      }, 3000);
    } catch {
      handleDownloadRekapImg();
    }
  };

  const handlePrintRekap = () => {
    if (!examDetail) return;
    printRekapDocument({
      examDetail,
      results,
      guruNama: user?.nama || examDetail?.guru_nama || 'Guru Pengampu',
    });
  };

  const handleOpenBatchModal = () => {
    setBatchModal({
      open: true,
      loading: false,
      progress: 0,
      total: results.length,
      statusText: '',
      filterStatus: 'all',
      mode: 'ringkas',
      items: [],
      zipping: false,
    });
  };

  const handleStartBatchGeneration = async (modeParam = null, filterParam = null) => {
    const targetMode = modeParam || batchModal.mode;
    const targetFilter = filterParam || batchModal.filterStatus;

    let targetResults = [...results];
    if (targetFilter === 'selesai') {
      targetResults = targetResults.filter((r) => r.status === 'selesai');
    } else if (targetFilter === 'lulus') {
      targetResults = targetResults.filter((r) => r.status === 'selesai' && Number(r.total_nilai) >= (examDetail?.kkm || 75));
    } else if (targetFilter === 'tidak_lulus') {
      targetResults = targetResults.filter((r) => r.status === 'selesai' && Number(r.total_nilai) < (examDetail?.kkm || 75));
    }

    if (targetResults.length === 0) {
      alert('Tidak ada siswa yang sesuai dengan filter yang dipilih.');
      return;
    }

    setBatchModal((prev) => ({
      ...prev,
      loading: true,
      progress: 0,
      total: targetResults.length,
      statusText: 'Memuat data butir jawaban seluruh siswa...',
      items: [],
      mode: targetMode,
      filterStatus: targetFilter,
    }));

    try {
      const res = await authFetch(`/api/hasil?ujian_id=${selectedUjianId}&all_jawaban=1`);
      const data = await res.json();
      const allJawaban = data.allJawaban || [];

      const answersBySesi = {};
      allJawaban.forEach((item) => {
        if (!answersBySesi[item.sesi_id]) {
          answersBySesi[item.sesi_id] = [];
        }
        answersBySesi[item.sesi_id].push(item);
      });

      const generatedItems = [];

      for (let i = 0; i < targetResults.length; i++) {
        const student = targetResults[i];
        const studentAnswers = answersBySesi[student.id] || [];

        setBatchModal((prev) => ({
          ...prev,
          progress: i + 1,
          statusText: `Membuat gambar untuk ${student.nama} (${i + 1}/${targetResults.length})...`,
        }));

        const dataUrl = await generateResultImage({
          sesi: {
            nama: student.nama,
            kelas: student.kelas,
            no_absen: student.no_absen,
            ujian_judul: examDetail?.judul || 'Ujian',
            mata_pelajaran: examDetail?.mata_pelajaran || '-',
            kkm: examDetail?.kkm || 75,
            total_nilai: student.total_nilai,
            jumlah_benar: student.jumlah_benar,
            jumlah_salah: student.jumlah_salah,
            jumlah_kosong: student.jumlah_kosong,
            jumlah_pelanggaran: student.total_pelanggaran,
            status: student.status,
            waktu_selesai: student.waktu_selesai,
          },
          jawaban: studentAnswers,
          mode: targetMode,
          guruNama: user?.nama || examDetail?.guru_nama || 'Guru Pengampu',
        });

        generatedItems.push({
          student,
          dataUrl,
        });

        await new Promise((r) => setTimeout(r, 10));
      }

      setBatchModal((prev) => ({
        ...prev,
        loading: false,
        statusText: `Selesai! Berhasil membuat ${generatedItems.length} gambar kartu hasil siswa.`,
        items: generatedItems,
      }));
    } catch (err) {
      console.error('Failed batch generation', err);
      alert('Terjadi kesalahan saat memproses gambar massal.');
      setBatchModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDownloadAllZip = async () => {
    if (batchModal.items.length === 0) return;

    setBatchModal((prev) => ({ ...prev, zipping: true }));
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const folderName = `Hasil_${(examDetail?.judul || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const folder = zip.folder(folderName);

      batchModal.items.forEach(({ student, dataUrl }, idx) => {
        if (!dataUrl) return;
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const absenStr = student.no_absen ? String(student.no_absen).padStart(2, '0') : String(idx + 1).padStart(2, '0');
        const safeName = (student.nama || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${absenStr}_${safeName}.png`;
        folder.file(filename, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Hasil_Ujian_${(examDetail?.judul || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_')}_Semua_Siswa.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
      alert('Gagal membuat file ZIP arsip gambar.');
    } finally {
      setBatchModal((prev) => ({ ...prev, zipping: false }));
    }
  };

  const handlePrintAllImages = () => {
    if (batchModal.items.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan di browser.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Semua Hasil Siswa - ${examDetail?.judul || 'Ujian'}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { margin: 0; padding: 0; font-family: sans-serif; background: #fff; }
            .page-break { page-break-after: always; break-after: page; display: flex; justify-content: center; align-items: center; min-height: 95vh; padding: 10px 0; }
            .page-break:last-child { page-break-after: avoid; break-after: avoid; }
            img { max-width: 100%; max-height: 95vh; object-fit: contain; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; }
          </style>
        </head>
        <body>
          ${batchModal.items.map(({ dataUrl }) => `
            <div class="page-break">
              <img src="${dataUrl}" alt="Hasil Ujian" />
            </div>
          `).join('')}
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() { window.print(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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
            <div className="page-header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenBatchModal}
                disabled={results.length === 0}
                style={{ borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                title="Cetak kartu hasil semua siswa dalam bentuk gambar (ZIP / Cetak Sekaligus)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Cetak Semua Gambar Siswa
              </button>
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
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 className="card-title">Daftar Nilai Siswa</h2>
                  <p className="text-sm text-muted">
                    {examDetail.judul} • KKM: {examDetail.kkm} • {results.length} siswa terdaftar
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleOpenRekapModal}
                    disabled={results.length === 0}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: '1px solid #0f172a',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    title="Buka rekapitulasi nilai seluruh siswa format leger raport (bisa ekspor ke Excel dan Gambar PNG)"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="3" y1="15" x2="21" y2="15" />
                      <line x1="9" y1="9" x2="9" y2="21" />
                      <line x1="15" y1="9" x2="15" y2="21" />
                    </svg>
                    Rekap Nilai Siswa (Leger)
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportExcelQuick}
                    disabled={results.length === 0}
                    style={{
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                    }}
                    title="Unduh rekapitulasi nilai siswa dalam format file Excel (.xlsx)"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="8" y1="13" x2="16" y2="13" />
                      <line x1="8" y1="17" x2="16" y2="17" />
                    </svg>
                    Unduh Excel (.xlsx)
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleOpenBatchModal}
                    disabled={results.length === 0}
                    style={{
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                    }}
                    title="Cetak kartu hasil per siswa sekaligus (Format Gambar PNG / ZIP)"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Cetak Semua Kartu Siswa
                  </button>

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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Kartu Ringkas WA</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${imageModal.mode === 'lengkap' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSwitchImageMode('lengkap')}
                disabled={imageModal.loading}
                style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>Lembar Rekap Lengkap</span>
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span><strong>Gambar Berhasil Disalin!</strong> Buka WhatsApp Web lalu tekan <strong>Ctrl + V</strong> (Paste) untuk mengirim langsung ke siswa.</span>
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
      {/* Modal Cetak Semua Gambar Siswa (Batch Export) */}
      {batchModal.open && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !batchModal.loading && !batchModal.zipping && setBatchModal((prev) => ({ ...prev, open: false }))}>
          <div className="modal modal-lg" style={{ maxWidth: 880, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ paddingBottom: 12, borderBottom: '1px solid var(--gray-200)', marginBottom: 14 }}>
              <div>
                <h3 className="modal-title" style={{ fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Cetak Semua Hasil Siswa (Format Gambar)</span>
                  <span className="badge badge-gray" style={{ fontSize: 11, fontWeight: 700 }}>Ekspor Massal</span>
                </h3>
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Ujian: <strong>{examDetail?.judul}</strong> • {examDetail?.mata_pelajaran} • {results.length} Siswa Terdaftar
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setBatchModal((prev) => ({ ...prev, open: false }))}
                disabled={batchModal.loading || batchModal.zipping}
                title="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Filter & Options Bar */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    FORMAT KARTU:
                  </label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className={`btn btn-xs ${batchModal.mode === 'ringkas' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setBatchModal((prev) => ({ ...prev, mode: 'ringkas' }))}
                      disabled={batchModal.loading || batchModal.zipping}
                      style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      Kartu Ringkas WA
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${batchModal.mode === 'lengkap' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setBatchModal((prev) => ({ ...prev, mode: 'lengkap' }))}
                      disabled={batchModal.loading || batchModal.zipping}
                      style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      Rekap Lengkap
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>
                    FILTER SISWA:
                  </label>
                  <select
                    className="form-select"
                    style={{ fontSize: 12, height: 30, padding: '2px 8px', minWidth: 160 }}
                    value={batchModal.filterStatus}
                    onChange={(e) => setBatchModal((prev) => ({ ...prev, filterStatus: e.target.value }))}
                    disabled={batchModal.loading || batchModal.zipping}
                  >
                    <option value="all">Semua Siswa ({results.length})</option>
                    <option value="selesai">Hanya Selesai ({results.filter(r => r.status === 'selesai').length})</option>
                    <option value="lulus">Lulus KKM ({results.filter(r => r.status === 'selesai' && Number(r.total_nilai) >= (examDetail?.kkm || 75)).length})</option>
                    <option value="tidak_lulus">Remidial ({results.filter(r => r.status === 'selesai' && Number(r.total_nilai) < (examDetail?.kkm || 75)).length})</option>
                  </select>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleStartBatchGeneration()}
                  disabled={batchModal.loading || batchModal.zipping}
                  style={{
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#0f172a',
                    color: '#ffffff',
                    border: '1px solid #0f172a',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  {batchModal.loading ? 'Memproses...' : batchModal.items.length > 0 ? 'Proses Ulang Gambar' : 'Mulai Buat Semua Gambar'}
                </button>
              </div>
            </div>

            {/* Progress Bar (Visible when loading or after completion) */}
            {(batchModal.loading || batchModal.statusText) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                  <span>{batchModal.statusText}</span>
                  {batchModal.total > 0 && (
                    <span>{batchModal.progress} / {batchModal.total} ({Math.round((batchModal.progress / batchModal.total) * 100)}%)</span>
                  )}
                </div>
                <div className="progress-bar" style={{ height: 8, background: '#e2e8f0', borderRadius: 4 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${batchModal.total > 0 ? Math.round((batchModal.progress / batchModal.total) * 100) : 0}%`,
                      transition: 'width 0.2s ease',
                      background: 'linear-gradient(90deg, #0a66c2, #10b981)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Content Gallery / Preview Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: '#f1f5f9',
              borderRadius: 12,
              padding: 14,
              maxHeight: '52vh',
              minHeight: 220,
            }}>
              {batchModal.loading && batchModal.items.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 30 }}>
                  <div className="spinner" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    Menghasilkan gambar beresolusi tinggi untuk setiap siswa...
                  </span>
                </div>
              ) : batchModal.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 10px', color: '#94a3b8' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 6px', color: '#1e293b' }}>
                    Belum ada gambar yang dibuat
                  </p>
                  <p style={{ fontSize: 12, margin: 0 }}>
                    Klik tombol <strong>"Mulai Buat Semua Gambar"</strong> di atas untuk memproses gambar kartu hasil seluruh siswa.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 12,
                }}>
                  {batchModal.items.map(({ student, dataUrl }, idx) => {
                    const isLulus = Number(student.total_nilai) >= (examDetail?.kkm || 75);
                    return (
                      <div
                        key={student.id || idx}
                        style={{
                          background: '#ffffff',
                          borderRadius: 10,
                          padding: 10,
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {student.no_absen ? `${student.no_absen}. ` : ''}{student.nama}
                            </div>
                            <span style={{ fontSize: 10, color: '#64748b' }}>
                              Kelas {student.kelas || '-'}
                            </span>
                          </div>
                          <span
                            className={`badge ${isLulus ? 'badge-success' : 'badge-danger'}`}
                            style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px' }}
                          >
                            {student.total_nilai ?? 0}
                          </span>
                        </div>

                        <div style={{ background: '#0f172a', borderRadius: 6, overflow: 'hidden', height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img
                            src={dataUrl}
                            alt={student.nama}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => {
                              const safeName = (student.nama || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
                              const safeUjian = (examDetail?.judul || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
                              downloadResultImage(dataUrl, `Hasil_${safeName}_${safeUjian}.png`);
                            }}
                            style={{ flex: 1, fontSize: 11, padding: '3px 6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                            title="Unduh file gambar siswa ini"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Unduh
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={async () => {
                              try {
                                await copyImageToClipboard(dataUrl);
                                alert(`Gambar ${student.nama} berhasil disalin! Anda bisa langsung Paste (Ctrl+V) di WhatsApp.`);
                              } catch {
                                const safeName = (student.nama || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
                                downloadResultImage(dataUrl, `Hasil_${safeName}.png`);
                              }
                            }}
                            style={{
                              fontSize: 11,
                              padding: '3px 8px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Salin gambar untuk ditempel di WhatsApp"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                            Salin
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
                  onClick={handleDownloadAllZip}
                  disabled={batchModal.loading || batchModal.items.length === 0 || batchModal.zipping}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 700,
                    background: '#0f172a',
                    color: '#ffffff',
                    border: '1px solid #0f172a',
                  }}
                  title="Unduh seluruh gambar hasil siswa dalam 1 file arsip ZIP"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {batchModal.zipping ? 'Membuat Arsip ZIP...' : `Unduh Semua Gambar (.ZIP) [${batchModal.items.length}]`}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrintAllImages}
                  disabled={batchModal.loading || batchModal.items.length === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 600,
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                  }}
                  title="Cetak semua gambar siswa sekaligus ke printer atau simpan sebagai PDF"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Cetak Semua Lembar (Print/PDF)
                </button>
              </div>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setBatchModal((prev) => ({ ...prev, open: false }))}
                disabled={batchModal.loading || batchModal.zipping}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rekap Nilai Siswa (Leger Raport) */}
      {rekapModal.open && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && !rekapModal.loading && setRekapModal((prev) => ({ ...prev, open: false }))}
        >
          <div
            className="modal modal-lg"
            style={{
              maxWidth: 980,
              maxHeight: '94vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 28px',
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                paddingBottom: 14,
                borderBottom: '1px solid var(--gray-200)',
                marginBottom: 16,
              }}
            >
              <div>
                <h3
                  className="modal-title"
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#0f172a',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="3" y1="15" x2="21" y2="15" />
                    <line x1="9" y1="9" x2="9" y2="21" />
                    <line x1="15" y1="9" x2="15" y2="21" />
                  </svg>
                  <span>Rekapitulasi Nilai Siswa (Leger Raport)</span>
                  <span
                    className="badge badge-gray"
                    style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', letterSpacing: '0.3px' }}
                  >
                    Resmi
                  </span>
                </h3>
                <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                  Mata Pelajaran: <strong>{examDetail?.mata_pelajaran}</strong> • Ujian: <strong>{examDetail?.judul}</strong> • Standar KKM: <strong>{examDetail?.kkm || 75}</strong> • Guru Pengampu: <strong>{user?.nama || examDetail?.guru_nama || 'Guru Pengampu'}</strong>
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setRekapModal((prev) => ({ ...prev, open: false }))}
                disabled={rekapModal.loading}
                title="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions Toolbar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 14,
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
              }}
            >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleExportExcelQuick}
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: '1px solid #0f172a',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title="Unduh seluruh rekap nilai siswa ke lembar kerja Excel (.xlsx)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="8" y1="13" x2="16" y2="13" />
                    <line x1="8" y1="17" x2="16" y2="17" />
                  </svg>
                  Unduh Excel (.xlsx)
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleDownloadRekapImg}
                  disabled={rekapModal.loading || !rekapModal.dataUrl}
                  style={{
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                  }}
                  title="Unduh dokumen rekap nilai dalam resolusi tinggi (.png)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Unduh Gambar (.png)
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyRekapImg}
                  disabled={rekapModal.loading || !rekapModal.dataUrl}
                  style={{
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                  }}
                  title="Salin gambar rekap nilai ke clipboard"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {rekapModal.copied ? 'Tersalin!' : 'Salin Gambar'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handlePrintRekap}
                  style={{
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ffffff',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                  }}
                  title="Cetak langsung ke printer atau simpan sebagai PDF"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Cetak (Print / PDF)
                </button>
              </div>

              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                {results.length} Siswa Terdaftar
              </div>
            </div>

            {/* Toast Alert */}
            {rekapModal.copied && (
              <div
                className="alert alert-success"
                style={{
                  marginBottom: 12,
                  padding: '8px 14px',
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Gambar Leger Raport berhasil disalin ke clipboard! Siap ditempel (Paste).</span>
              </div>
            )}

            {/* Preview Viewport */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                background: '#334155',
                borderRadius: 10,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 360,
                maxHeight: '60vh',
              }}
            >
              {rekapModal.loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#ffffff' }}>
                  <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#ffffff' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Menyusun berkas leger rekap nilai siswa...</span>
                </div>
              ) : rekapModal.dataUrl ? (
                <img
                  src={rekapModal.dataUrl}
                  alt="Leger Rekap Nilai Siswa"
                  style={{
                    width: '100%',
                    maxWidth: 860,
                    height: 'auto',
                    borderRadius: 4,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    display: 'block',
                    background: '#ffffff',
                  }}
                />
              ) : (
                <p style={{ color: '#94a3b8' }}>Gagal memuat rekap nilai.</p>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 14,
                borderTop: '1px solid var(--gray-200)',
                marginTop: 14,
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Guru Pengampu: <strong>{user?.nama || examDetail?.guru_nama || 'Guru Pengampu'}</strong>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRekapModal((prev) => ({ ...prev, open: false }))}
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
