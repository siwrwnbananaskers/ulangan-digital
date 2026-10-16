'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import * as XLSX from 'xlsx-js-style';
import { downloadSoalTemplateFile } from '@/lib/generateSoalTemplate';
import UpgradeModal from '@/components/UpgradeModal';
import ConfirmModal, { useConfirmDialog } from '@/components/ConfirmModal';

const TIPE_SOAL = [
  { value: 'pg', label: 'Pilihan Ganda' },
  { value: 'isian', label: 'Isian Singkat' },
  { value: 'benar_salah', label: 'Benar/Salah' },
  { value: 'uraian', label: 'Uraian' },
];

export default function BankSoal() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const { dialogState, confirm: showConfirm, handleConfirm, handleClose } = useConfirmDialog();
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSoal, setEditingSoal] = useState(null);
  const [filterMapel, setFilterMapel] = useState('');
  const [filterTipe, setFilterTipe] = useState('');
  const [alert, setAlert] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  // Import Excel States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importDefaultMapel, setImportDefaultMapel] = useState('');
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParsedSoal, setExcelParsedSoal] = useState([]);
  const [excelError, setExcelError] = useState(null);
  const [importProcessing, setImportProcessing] = useState(false);

  const [form, setForm] = useState({
    mata_pelajaran: '',
    tipe: 'pg',
    pertanyaan: '',
    pilihan_a: '',
    pilihan_b: '',
    pilihan_c: '',
    pilihan_d: '',
    pilihan_e: '',
    kunci_jawaban: '',
    bobot: 1,
  });

  useEffect(() => {
    if (!user) return;
    loadSoal();
  }, [user]);

  const loadSoal = async () => {
    try {
      let url = `/api/soal?_t=${Date.now()}&`;
      if (filterMapel) url += `mapel=${encodeURIComponent(filterMapel)}&`;
      if (filterTipe) url += `tipe=${encodeURIComponent(filterTipe)}`;
      const res = await authFetch(url);
      const data = await res.json();
      setSoalList(data.soal || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      mata_pelajaran: '',
      tipe: 'pg',
      pertanyaan: '',
      pilihan_a: '',
      pilihan_b: '',
      pilihan_c: '',
      pilihan_d: '',
      pilihan_e: '',
      kunci_jawaban: '',
      bobot: 1,
    });
    setEditingSoal(null);
  };

  const handleOpenCreate = () => {
    if (user?.username === 'guru' && soalList.length >= 5) {
      setUpgradeMsg('Batas Akun Demo Tercapai! Anda hanya dapat menyimpan maksimal 5 butir soal di Bank Soal pada versi demo.');
      setShowUpgradeModal(true);
      return;
    }
    resetForm();
    setShowModal(true);
  };

  const handleOpenImport = () => {
    if (user?.username === 'guru' && soalList.length >= 5) {
      setUpgradeMsg('Batas Akun Demo Tercapai! Anda hanya dapat menyimpan maksimal 5 butir soal di Bank Soal pada versi demo.');
      setShowUpgradeModal(true);
      return;
    }
    setExcelParsedSoal([]);
    setExcelFileName('');
    setExcelError(null);
    setShowImportModal(true);
  };

  const handleDownloadTemplate = () => {
    try {
      downloadSoalTemplateFile();
    } catch {
      window.location.href = '/api/soal/template';
    }
  };

  const handleDefaultMapelChange = (newMapel) => {
    setImportDefaultMapel(newMapel);
    if (excelParsedSoal.length > 0) {
      setExcelParsedSoal((prev) =>
        prev.map((item) => {
          const effectiveMapel = item.rawMapel || newMapel;
          const remainingErrors = item.errors.filter((e) => !e.includes('Mata pelajaran'));
          if (!effectiveMapel) {
            remainingErrors.push('Mata pelajaran belum terisi');
          }
          return {
            ...item,
            mata_pelajaran: effectiveMapel,
            isValid: remainingErrors.length === 0,
            errors: remainingErrors,
          };
        })
      );
    }
  };

  const handleExcelFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setExcelError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const targetSheetName =
          workbook.SheetNames.find((name) => name.toLowerCase().includes('soal')) ||
          workbook.SheetNames[0];
        const worksheet = workbook.Sheets[targetSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          setExcelError('File Excel tidak memiliki baris data soal.');
          setExcelParsedSoal([]);
          return;
        }

        const parsed = [];
        rows.forEach((rawRow, idx) => {
          const row = {};
          Object.entries(rawRow).forEach(([k, v]) => {
            const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            row[cleanKey] = typeof v === 'string' ? v.trim() : v;
          });

          const rawMapel = String(
            row['matapelajaran'] ||
            row['mapel'] ||
            row['subject'] ||
            ''
          ).trim();

          const mapel = rawMapel || importDefaultMapel || '';

          const tipeRaw = String(row['tipesoal'] || row['tipe'] || row['jenis'] || 'pg').toLowerCase().trim();
          let tipe = 'pg';
          if (tipeRaw.includes('pg') || tipeRaw.includes('ganda') || tipeRaw.includes('pilihan')) {
            tipe = 'pg';
          } else if (tipeRaw.includes('benar') || tipeRaw.includes('b/s') || tipeRaw.includes('bs') || tipeRaw.includes('false')) {
            tipe = 'benar_salah';
          } else if (tipeRaw.includes('singkat') || tipeRaw.includes('isian')) {
            tipe = 'isian';
          } else if (tipeRaw.includes('uraian') || tipeRaw.includes('esai') || tipeRaw.includes('essay')) {
            tipe = 'uraian';
          }

          const pertanyaan = String(row['pertanyaan'] || row['soal'] || row['butirsoal'] || row['question'] || '').trim();

          const pilA = String(row['pilihana'] || row['opsia'] || row['a'] || '').trim();
          const pilB = String(row['pilihanb'] || row['opsib'] || row['b'] || '').trim();
          const pilC = String(row['pilihanc'] || row['opsic'] || row['c'] || '').trim();
          const pilD = String(row['pilihand'] || row['opsid'] || row['d'] || '').trim();
          const pilE = String(row['pilihane'] || row['opsie'] || row['e'] || '').trim();

          let kunciRaw = String(row['kuncijawaban'] || row['kunci'] || row['jawaban'] || row['key'] || '').trim();
          let kunci = kunciRaw;
          if (tipe === 'pg') {
            kunci = kunciRaw ? kunciRaw.charAt(0).toLowerCase() : '';
          } else if (tipe === 'benar_salah') {
            const kl = kunciRaw.toLowerCase();
            if (kl.includes('benar') || kl === 'b' || kl === 'true' || kl === 't' || kl === '1') {
              kunci = 'benar';
            } else if (kl.includes('salah') || kl === 's' || kl === 'false' || kl === 'f' || kl === '0') {
              kunci = 'salah';
            }
          }

          const bobotRaw = parseInt(row['bobot'] || row['poin'] || row['skor'] || 1);
          const bobot = !isNaN(bobotRaw) && bobotRaw > 0 ? bobotRaw : 1;

          // If row is completely empty, skip it
          if (!pertanyaan && !pilA && !pilB && !kunciRaw && !rawMapel) {
            return;
          }

          // Validation
          const errors = [];
          if (!pertanyaan) errors.push('Teks pertanyaan kosong');
          if (!mapel) errors.push('Mata pelajaran belum terisi');
          if (tipe === 'pg') {
            if (!pilA || !pilB) errors.push('Pilihan A & B wajib diisi untuk PG');
            if (!kunci || !['a', 'b', 'c', 'd', 'e'].includes(kunci)) {
              errors.push('Kunci jawaban PG harus A, B, C, D, atau E');
            }
          } else if (tipe === 'benar_salah') {
            if (!kunci || !['benar', 'salah'].includes(kunci)) {
              errors.push('Kunci jawaban Benar/Salah harus "Benar" atau "Salah"');
            }
          }

          parsed.push({
            rowNum: idx + 2,
            rawMapel,
            mata_pelajaran: mapel,
            tipe,
            pertanyaan,
            pilihan_a: pilA,
            pilihan_b: pilB,
            pilihan_c: pilC,
            pilihan_d: pilD,
            pilihan_e: pilE,
            kunci_jawaban: kunci,
            bobot,
            isValid: errors.length === 0,
            errors,
          });
        });

        if (parsed.length === 0) {
          setExcelError('Tidak ditemukan baris data soal yang terbaca pada file ini.');
          setExcelParsedSoal([]);
        } else {
          setExcelParsedSoal(parsed);
        }
      } catch (err) {
        console.error('Error reading excel file:', err);
        setExcelError('Gagal membaca file Excel. Pastikan berkas berformat .xlsx, .xls, atau .csv yang valid.');
        setExcelParsedSoal([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportSubmit = async (e) => {
    if (e) e.preventDefault();
    const validSoal = excelParsedSoal.filter((s) => s.isValid);
    if (validSoal.length === 0) {
      setExcelError('Tidak ada butir soal valid yang siap diimpor. Silakan periksa kembali file Anda.');
      return;
    }

    setImportProcessing(true);
    try {
      const res = await authFetch('/api/soal', {
        method: 'POST',
        body: JSON.stringify({
          soal: validSoal.map((s) => ({
            mata_pelajaran: s.mata_pelajaran || importDefaultMapel,
            tipe: s.tipe,
            pertanyaan: s.pertanyaan,
            pilihan_a: s.pilihan_a,
            pilihan_b: s.pilihan_b,
            pilihan_c: s.pilihan_c,
            pilihan_d: s.pilihan_d,
            pilihan_e: s.pilihan_e,
            kunci_jawaban: s.kunci_jawaban,
            bobot: s.bobot,
          })),
          default_mapel: importDefaultMapel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade_required || data.error === 'LIMIT_DEMO_REACHED') {
          setUpgradeMsg(data.message || 'Batas Akun Demo Tercapai! Anda hanya dapat menyimpan maksimal 5 butir soal di Bank Soal pada versi demo.');
          setShowUpgradeModal(true);
          setShowImportModal(false);
          return;
        }
        setAlert({ type: 'danger', message: data.error || 'Gagal mengimpor soal' });
      } else {
        setAlert({
          type: 'success',
          message: data.message || `Berhasil mengimpor ${data.created_count || validSoal.length} butir soal ke Bank Soal.`,
        });
        setShowImportModal(false);
        setExcelParsedSoal([]);
        setExcelFileName('');
        setExcelError(null);
        loadSoal();
      }
    } catch (err) {
      console.error(err);
      setAlert({ type: 'danger', message: 'Terjadi kesalahan saat mengimpor butir soal' });
    } finally {
      setImportProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = editingSoal ? 'PUT' : 'POST';
      const body = editingSoal ? { ...form, id: editingSoal.id } : form;

      const res = await authFetch('/api/soal', {
        method,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.upgrade_required || data.error === 'LIMIT_DEMO_REACHED') {
          setUpgradeMsg(data.message || 'Batas Akun Demo Tercapai! Anda hanya dapat menyimpan maksimal 5 butir soal di Bank Soal pada versi demo.');
          setShowUpgradeModal(true);
          setShowModal(false);
          return;
        }
        setAlert({ type: 'danger', message: data.error });
        return;
      }

      setAlert({ type: 'success', message: editingSoal ? 'Soal berhasil diupdate' : 'Soal berhasil ditambahkan' });
      setShowModal(false);
      resetForm();
      loadSoal();
    } catch (err) {
      setAlert({ type: 'danger', message: 'Gagal menyimpan soal' });
    }
  };

  const handleEdit = (soal) => {
    setForm({
      mata_pelajaran: soal.mata_pelajaran,
      tipe: soal.tipe,
      pertanyaan: soal.pertanyaan,
      pilihan_a: soal.pilihan_a || '',
      pilihan_b: soal.pilihan_b || '',
      pilihan_c: soal.pilihan_c || '',
      pilihan_d: soal.pilihan_d || '',
      pilihan_e: soal.pilihan_e || '',
      kunci_jawaban: soal.kunci_jawaban || '',
      bobot: soal.bobot || 1,
    });
    setEditingSoal(soal);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const ok = await showConfirm({
      title: 'Hapus Butir Soal',
      message: 'Apakah Anda yakin ingin menghapus butir soal ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Hapus Soal',
      type: 'danger',
    });
    if (!ok) return;

    try {
      await authFetch(`/api/soal?id=${id}`, { method: 'DELETE' });
      setAlert({ type: 'success', message: 'Soal berhasil dihapus' });
      loadSoal();
    } catch {
      setAlert({ type: 'danger', message: 'Gagal menghapus soal' });
    }
  };

  const getMapelList = () => [...new Set(soalList.map(s => s.mata_pelajaran).filter(Boolean))];

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat...</p></div>;
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content">
        <div className="page-header-ribbon">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#191919', margin: 0 }}>Bank Soal</h1>
              {user?.role === 'superadmin' && (
                <span className="badge" style={{ background: '#0f172a', color: '#ffffff', fontSize: 11, padding: '3px 10px', fontWeight: 700 }}>
                  Mode Superadmin — Seluruh Guru
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#666666', marginTop: 4, margin: '4px 0 0' }}>
              {user?.role === 'superadmin' 
                ? 'Memantau seluruh butir soal yang dibuat oleh semua dewan guru' 
                : 'Kelola koleksi butir soal untuk asesmen dan lembar ujian siswa'}
            </p>
          </div>
          <div className="page-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenImport}
              style={{
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Import Excel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
              style={{ borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#0a66c2', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Tambah Soal Baru
            </button>
          </div>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type}`}>
            {alert.message}
            <button className="btn btn-ghost btn-sm" onClick={() => setAlert(null)} style={{ marginLeft: 'auto' }}>✕</button>
          </div>
        )}

        {/* Filters */}
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
              <label className="form-label">Mata Pelajaran</label>
              <select className="form-select" value={filterMapel} onChange={(e) => setFilterMapel(e.target.value)}>
                <option value="">Semua</option>
                {getMapelList().map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
              <label className="form-label">Tipe Soal</label>
              <select className="form-select" value={filterTipe} onChange={(e) => setFilterTipe(e.target.value)}>
                <option value="">Semua</option>
                {TIPE_SOAL.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <button className="btn btn-secondary" onClick={loadSoal} style={{ height: 42 }}>
              Filter
            </button>
          </div>
        </div>

        {/* Soal List */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Daftar Soal ({soalList.length})</h2>
          </div>

          {loading ? (
            <div className="loading-page" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : soalList.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: '#f1f5f9',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28, marginBottom: 0, opacity: 1 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>Belum ada butir soal</h3>
              <p style={{ fontSize: 13, color: '#64748b', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.5 }}>
                Mulai susun butir soal secara manual atau gunakan fitur import masal langsung dari file Excel.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleOpenImport}
                  style={{
                    height: 42,
                    padding: '0 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, margin: 0, opacity: 1 }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Import dari Excel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenCreate}
                  style={{
                    height: 42,
                    padding: '0 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: '#0a66c2',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 1px 2px rgba(10,102,194,0.2)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, margin: 0, opacity: 1 }}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Tambah Soal Baru
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {soalList.map((soal, idx) => (
                <div key={soal.id} className="card" style={{ padding: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge badge-primary">{soal.mata_pelajaran}</span>
                        <span className="badge badge-gray">
                          {TIPE_SOAL.find(t => t.value === soal.tipe)?.label || soal.tipe}
                        </span>
                        <span className="badge badge-info">Bobot: {soal.bobot}</span>
                        {(soal.nama_guru || user?.role === 'superadmin') && (
                          <span
                            className="badge"
                            style={{
                              background: '#ede9fe',
                              color: '#6d28d9',
                              border: '1px solid #ddd6fe',
                              fontWeight: 700,
                              fontSize: 11,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12, margin: 0, opacity: 1 }}>
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            Guru: {soal.nama_guru || soal.username_guru || 'Dewan Guru'}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--gray-800)', lineHeight: 1.6 }}>
                        <strong>#{idx + 1}</strong> — {soal.pertanyaan}
                      </p>
                      {soal.tipe === 'pg' && (
                        <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)' }}>
                          {['a', 'b', 'c', 'd', 'e'].map(opt => soal[`pilihan_${opt}`] && (
                            <div key={opt} style={{ 
                              padding: '2px 0',
                              fontWeight: soal.kunci_jawaban?.toLowerCase() === opt ? 700 : 400,
                              color: soal.kunci_jawaban?.toLowerCase() === opt ? 'var(--success)' : 'inherit'
                            }}>
                              {opt.toUpperCase()}. {soal[`pilihan_${opt}`]}
                              {soal.kunci_jawaban?.toLowerCase() === opt && ' ✓'}
                            </div>
                          ))}
                        </div>
                      )}
                      {soal.tipe !== 'pg' && soal.kunci_jawaban && (
                        <div style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--success)' }}>
                          Kunci: {soal.kunci_jawaban}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(soal)} title="Edit Soal">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(soal.id)} style={{ color: 'var(--danger)' }} title="Hapus Soal">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">{editingSoal ? 'Edit Soal' : 'Tambah Soal Baru'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mata Pelajaran *</label>
                  <input
                    className="form-input"
                    value={form.mata_pelajaran}
                    onChange={(e) => setForm({ ...form, mata_pelajaran: e.target.value })}
                    placeholder="cth: Matematika"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipe Soal *</label>
                  <select
                    className="form-select"
                    value={form.tipe}
                    onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                  >
                    {TIPE_SOAL.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Pertanyaan *</label>
                <textarea
                  className="form-textarea"
                  value={form.pertanyaan}
                  onChange={(e) => setForm({ ...form, pertanyaan: e.target.value })}
                  placeholder="Tulis pertanyaan di sini..."
                  required
                />
              </div>

              {form.tipe === 'pg' && (
                <>
                  {['a', 'b', 'c', 'd', 'e'].map(opt => (
                    <div className="form-group" key={opt}>
                      <label className="form-label">Pilihan {opt.toUpperCase()} {opt <= 'b' ? '*' : ''}</label>
                      <input
                        className="form-input"
                        value={form[`pilihan_${opt}`]}
                        onChange={(e) => setForm({ ...form, [`pilihan_${opt}`]: e.target.value })}
                        placeholder={`Pilihan ${opt.toUpperCase()}`}
                        required={opt <= 'b'}
                      />
                    </div>
                  ))}
                  <div className="form-group">
                    <label className="form-label">Kunci Jawaban (A/B/C/D/E) *</label>
                    <select
                      className="form-select"
                      value={form.kunci_jawaban}
                      onChange={(e) => setForm({ ...form, kunci_jawaban: e.target.value })}
                      required
                    >
                      <option value="">Pilih kunci...</option>
                      {['a', 'b', 'c', 'd', 'e'].map(opt => (
                        <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {form.tipe === 'benar_salah' && (
                <div className="form-group">
                  <label className="form-label">Kunci Jawaban *</label>
                  <select
                    className="form-select"
                    value={form.kunci_jawaban}
                    onChange={(e) => setForm({ ...form, kunci_jawaban: e.target.value })}
                    required
                  >
                    <option value="">Pilih...</option>
                    <option value="benar">Benar</option>
                    <option value="salah">Salah</option>
                  </select>
                </div>
              )}

              {form.tipe === 'isian' && (
                <div className="form-group">
                  <label className="form-label">Kunci Jawaban *</label>
                  <input
                    className="form-input"
                    value={form.kunci_jawaban}
                    onChange={(e) => setForm({ ...form, kunci_jawaban: e.target.value })}
                    placeholder="Jawaban yang benar"
                    required
                  />
                </div>
              )}

              {form.tipe === 'uraian' && (
                <div className="form-group">
                  <label className="form-label">Panduan Jawaban (opsional)</label>
                  <textarea
                    className="form-textarea"
                    value={form.kunci_jawaban}
                    onChange={(e) => setForm({ ...form, kunci_jawaban: e.target.value })}
                    placeholder="Panduan jawaban untuk koreksi manual..."
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Bobot Nilai</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.bobot}
                  onChange={(e) => setForm({ ...form, bobot: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="10"
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', marginTop: 'var(--space-lg)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">
                  {editingSoal ? 'Update Soal' : 'Simpan Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Soal Masal dari Excel */}
      {showImportModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)}>
          <div
            className="modal"
            style={{
              maxWidth: 880,
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              borderRadius: 12,
            }}
          >
            {/* Header Modal */}
            <div
              className="modal-header"
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Import Soal Masal dari Excel
                </h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
                  Unggah banyak butir soal sekaligus melalui format spreadsheet .xlsx atau .xls standar
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowImportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 6,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Konten Modal */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {/* Langkah 1: Unduh Format Template */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '14px 18px',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ maxWidth: 520 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    Langkah 1: Unduh Format Template Resmi
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                    File spreadsheet resmi sudah mencakup kolom terstandar, petunjuk pengisian, dan contoh soal (Pilihan Ganda, Benar/Salah, Isian, Uraian).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="btn btn-secondary btn-sm"
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    fontWeight: 600,
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Unduh Template Excel (.xlsx)
                </button>
              </div>

              {/* Langkah 2: Mata Pelajaran Default (Opsional) */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '14px 18px',
                  marginBottom: 16,
                }}
              >
                <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 2 }}>
                  Langkah 2: Mata Pelajaran Default (Opsional)
                </label>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px', lineHeight: 1.4 }}>
                  Nilai ini akan otomatis diterapkan bila ada baris butir soal di file Excel yang kolom Mata Pelajarannya dikosongkan.
                </p>
                <input
                  className="form-input"
                  placeholder="cth: Informatika / Koding dan Kecerdasan Artifisial"
                  value={importDefaultMapel}
                  onChange={(e) => handleDefaultMapelChange(e.target.value)}
                  style={{ fontSize: 13, borderRadius: 6, maxWidth: 440 }}
                />
              </div>

              {/* Langkah 3: Upload File Excel */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '14px 18px',
                  marginBottom: 16,
                }}
              >
                <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>
                  Langkah 3: Unggah File Excel Yang Telah Diisi
                </label>
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 8,
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelFileChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      background: '#0f172a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 10px',
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <polyline points="9 15 12 12 15 15" />
                    </svg>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                    {excelFileName ? `Berkas Terpilih: ${excelFileName}` : 'Klik atau Tarik File Excel ke Sini (.xlsx, .xls)'}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
                    Sistem akan membaca sheet &apos;Template Soal&apos; atau lembar kerja pertama yang terisi data.
                  </p>
                </div>
              </div>

              {/* Notifikasi Error */}
              {excelError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    padding: '10px 14px',
                    color: '#991b1b',
                    fontSize: 12,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{excelError}</span>
                </div>
              )}

              {/* Langkah 4: Tabel Pratinjau & Validasi */}
              {excelParsedSoal.length > 0 && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '14px 18px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Pratinjau Butir Soal ({excelParsedSoal.length} Baris Terdeteksi)
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>
                        Periksa kembali butir soal sebelum dikonfirmasi masuk ke Bank Soal.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: '#f0fdf4',
                          color: '#166534',
                          border: '1px solid #bbf7d0',
                        }}
                      >
                        Valid: {excelParsedSoal.filter((s) => s.isValid).length}
                      </span>
                      {excelParsedSoal.filter((s) => !s.isValid).length > 0 && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: '#fef2f2',
                            color: '#991b1b',
                            border: '1px solid #fecaca',
                          }}
                        >
                          Perlu Diperiksa: {excelParsedSoal.filter((s) => !s.isValid).length}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: 260,
                      overflowY: 'auto',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#0f172a', color: '#ffffff', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, width: 44, textAlign: 'center' }}>NO</th>
                          <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, width: 100 }}>TIPE</th>
                          <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, width: 110 }}>MAPEL</th>
                          <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600 }}>PERTANYAAN</th>
                          <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, width: 80, textAlign: 'center' }}>KUNCI</th>
                          <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, width: 55, textAlign: 'center' }}>BOBOT</th>
                          <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, width: 85, textAlign: 'center' }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelParsedSoal.map((item, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid #f1f5f9',
                              background: item.isValid ? (idx % 2 === 0 ? '#ffffff' : '#f8fafc') : '#fef2f2',
                            }}
                          >
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: '#334155' }}>
                              {item.tipe === 'pg' ? 'Pilihan Ganda' : item.tipe === 'benar_salah' ? 'Benar/Salah' : item.tipe === 'isian' ? 'Isian' : 'Uraian'}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#475569' }}>
                              {item.mata_pelajaran || '-'}
                            </td>
                            <td style={{ padding: '8px 10px', color: '#0f172a' }}>
                              <div style={{ maxHeight: 36, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.pertanyaan}
                              </div>
                              {!item.isValid && (
                                <div style={{ fontSize: 10, color: '#b91c1c', marginTop: 2, fontWeight: 600 }}>
                                  Catatan: {item.errors.join(', ')}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                              {item.tipe === 'pg' ? item.kunci_jawaban?.toUpperCase() || '-' : item.kunci_jawaban || '-'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>
                              {item.bobot}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              {item.isValid ? (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: '#dcfce7',
                                    color: '#15803d',
                                    display: 'inline-block',
                                  }}
                                >
                                  VALID
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    display: 'inline-block',
                                  }}
                                >
                                  ERROR
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {excelParsedSoal.length > 0 ? (
                  <span>
                    Siap mengimpor{' '}
                    <strong style={{ color: '#0f172a' }}>
                      {excelParsedSoal.filter((s) => s.isValid).length} dari {excelParsedSoal.length}
                    </strong>{' '}
                    butir soal yang berstatus valid.
                  </span>
                ) : (
                  <span>Silakan pilih berkas Excel template untuk melihat pratinjau soal.</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowImportModal(false)}
                  disabled={importProcessing}
                  style={{ borderRadius: 6, fontSize: 13, padding: '7px 14px' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleImportSubmit}
                  disabled={excelParsedSoal.filter((s) => s.isValid).length === 0 || importProcessing}
                  style={{
                    borderRadius: 6,
                    fontSize: 13,
                    padding: '7px 16px',
                    fontWeight: 600,
                    background: '#0a66c2',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {importProcessing ? (
                    <>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      <span>Mengimpor...</span>
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>
                        Import {excelParsedSoal.filter((s) => s.isValid).length > 0 ? `${excelParsedSoal.filter((s) => s.isValid).length} ` : ''}Soal Sekarang
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade WhatsApp Modal when Demo Limit Reached */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Batas Kuota Bank Soal"
        message={upgradeMsg}
      />

      {/* Modern Confirmation Dialog */}
      <ConfirmModal
        {...dialogState}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    </div>
  );
}
