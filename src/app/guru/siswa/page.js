'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import UpgradeModal from '@/components/UpgradeModal';

export default function SiswaManagementPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [siswaList, setSiswaList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [filterKelas, setFilterKelas] = useState('');
  const [filterGuru, setFilterGuru] = useState('');
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  // Single Add Form
  const [singleForm, setSingleForm] = useState({
    username: '',
    nama: '',
    kelas: '',
    no_absen: '',
    password: '123456',
  });

  // Edit Student Modal (CRUD)
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Bulk Input Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkTab, setBulkTab] = useState('excel'); // 'excel' | 'paste'
  const [excelParsedStudents, setExcelParsedStudents] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelError, setExcelError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkDefaultKelas, setBulkDefaultKelas] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Print Mode State
  const [printKelas, setPrintKelas] = useState('');

  useEffect(() => {
    if (!user) return;
    loadSiswa();
  }, [user, filterKelas, filterGuru]);

  const loadSiswa = async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const qParams = [];
      if (filterKelas) qParams.push(`kelas=${encodeURIComponent(filterKelas)}`);
      if (filterGuru) qParams.push(`guru_id=${encodeURIComponent(filterGuru)}`);
      const url = `/api/siswa${qParams.length > 0 ? '?' + qParams.join('&') : ''}`;
      const res = await authFetch(url);
      const data = await res.json();
      setSiswaList(data.siswa || []);
      if (data.kelas_options) setKelasList(data.kelas_options);
      if (data.is_superadmin) setIsSuperadmin(true);
      if (data.teacher_options) setTeacherOptions(data.teacher_options);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSingle = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/siswa', {
        method: 'POST',
        body: JSON.stringify(singleForm),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade_required || data.error === 'LIMIT_DEMO_REACHED') {
          setShowUpgradeModal(true);
          setUpgradeMsg(data.message || 'Batas Akun Demo Tercapai! Anda hanya dapat menambah 1 siswa untuk uji coba.');
          return;
        }
        setAlert({ type: 'danger', message: data.error || 'Gagal menambahkan siswa' });
        return;
      }
      setAlert({ type: 'success', message: `Siswa "${singleForm.nama}" (${singleForm.username}) berhasil ditambahkan!` });
      setSingleForm({ username: '', nama: '', kelas: singleForm.kelas, no_absen: '', password: '123456' });
      loadSiswa();
    } catch {
      setAlert({ type: 'danger', message: 'Terjadi kesalahan sistem' });
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    setBulkProcessing(true);
    // Parse lines: Username, Nama, [Kelas], [No Absen], [Password]
    const lines = bulkText.split('\n').filter(l => l.trim().length > 0);
    const parsed = [];

    for (const line of lines) {
      // Split by tab or comma
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const username = parts[0]?.trim();
      const nama = parts[1]?.trim();
      const kelas = parts[2]?.trim() || bulkDefaultKelas || 'XII-IPA-1';
      const no_absen = parseInt(parts[3]?.trim()) || null;
      const password = parts[4]?.trim() || '123456';

      if (username && nama) {
        parsed.push({ username, nama, kelas, no_absen, password });
      }
    }

    if (parsed.length === 0) {
      setAlert({ type: 'danger', message: 'Format data masal tidak sesuai' });
      setBulkProcessing(false);
      return;
    }

    try {
      const res = await authFetch('/api/siswa', {
        method: 'POST',
        body: JSON.stringify({ siswa: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade_required || data.error === 'LIMIT_DEMO_REACHED') {
          setShowBulkModal(false);
          setShowUpgradeModal(true);
          setUpgradeMsg(data.message || 'Batas Akun Demo Tercapai! Anda hanya dapat menambah 1 siswa untuk uji coba.');
          setBulkProcessing(false);
          return;
        }
        setAlert({ type: 'danger', message: data.error || 'Gagal impor data' });
      } else {
        setAlert({ type: 'success', message: data.message });
        setShowBulkModal(false);
        setBulkText('');
        loadSiswa();
      }
    } catch {
      setAlert({ type: 'danger', message: 'Gagal mengunggah data siswa' });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleExcelFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelError('');
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          setExcelError('File Excel kosong atau tidak memiliki baris data.');
          setExcelParsedStudents([]);
          return;
        }

        const parsed = [];
        for (const row of rows) {
          const rowNorm = {};
          for (const [k, v] of Object.entries(row)) {
            rowNorm[k.trim().toLowerCase()] = typeof v === 'string' ? v.trim() : v;
          }

          const username = rowNorm['username'] || rowNorm['user'] || rowNorm['nis'] || rowNorm['nisn'] || rowNorm['id'] || '';
          const nama = rowNorm['nama siswa'] || rowNorm['nama lengkap'] || rowNorm['nama'] || rowNorm['name'] || '';
          const kelas = rowNorm['kelas'] || rowNorm['class'] || bulkDefaultKelas || '';
          const noAbsenRaw = rowNorm['no absen'] || rowNorm['no. absen'] || rowNorm['absen'] || rowNorm['no'] || null;
          const no_absen = noAbsenRaw !== null ? parseInt(noAbsenRaw) || null : null;
          const password = rowNorm['password'] || rowNorm['sandi'] || '123456';

          if (username && nama) {
            parsed.push({
              username: String(username).toLowerCase().replace(/\s+/g, ''),
              nama: String(nama),
              kelas: String(kelas),
              no_absen,
              password: String(password),
            });
          }
        }

        if (parsed.length === 0) {
          setExcelError('Format kolom tidak cocok. Pastikan file memiliki kolom "Username" dan "Nama Siswa". Silakan unduh template resmi di atas.');
          setExcelParsedStudents([]);
        } else {
          setExcelParsedStudents(parsed);
        }
      } catch (err) {
        console.error('Error reading excel:', err);
        setExcelError('Gagal membaca file Excel. Pastikan file berformat .xlsx, .xls, atau .csv yang valid.');
        setExcelParsedStudents([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/siswa/template';
  };

  const handleBulkExcelSubmit = async (e) => {
    e.preventDefault();
    if (excelParsedStudents.length === 0) return;

    setBulkProcessing(true);
    try {
      const res = await authFetch('/api/siswa', {
        method: 'POST',
        body: JSON.stringify({ siswa: excelParsedStudents }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.upgrade_required || data.error === 'LIMIT_DEMO_REACHED') {
          setShowBulkModal(false);
          setShowUpgradeModal(true);
          setUpgradeMsg(data.message || 'Batas Akun Demo Tercapai! Anda hanya dapat menambah 1 siswa untuk uji coba.');
          return;
        }
        setAlert({ type: 'danger', message: data.error || 'Gagal mengimpor siswa' });
      } else {
        setAlert({ type: 'success', message: data.message });
        setShowBulkModal(false);
        setExcelParsedStudents([]);
        setExcelFileName('');
        loadSiswa();
      }
    } catch {
      setAlert({ type: 'danger', message: 'Gagal mengunggah data siswa' });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleDelete = async (id, nama) => {
    if (!confirm(`Hapus data siswa "${nama}"? Semua data sesi ujian dan nilai siswa ini juga akan terhapus.`)) return;
    try {
      const res = await authFetch(`/api/siswa?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlert({ type: 'success', message: `Data siswa "${nama}" berhasil dihapus` });
        loadSiswa();
      } else {
        const d = await res.json();
        setAlert({ type: 'danger', message: d.error || 'Gagal menghapus' });
      }
    } catch {
      setAlert({ type: 'danger', message: 'Gagal menghapus siswa' });
    }
  };

  const handleOpenEdit = (siswa) => {
    setEditingStudent({
      id: siswa.id,
      username: siswa.username || '',
      nama: siswa.nama || '',
      kelas: siswa.kelas || '',
      no_absen: siswa.no_absen !== null && siswa.no_absen !== undefined ? siswa.no_absen : '',
      password: siswa.password_plain || '123456',
    });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditSubmitting(true);
    try {
      const res = await authFetch('/api/siswa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStudent),
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'danger', message: data.error || 'Gagal mengubah data siswa' });
      } else {
        setAlert({ type: 'success', message: data.message || 'Data siswa berhasil diperbarui' });
        setShowEditModal(false);
        setEditingStudent(null);
        loadSiswa();
      }
    } catch {
      setAlert({ type: 'danger', message: 'Gagal menghubungi server' });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(siswaList.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const isAll = selectedIds.length === siswaList.length;
    const confirmMsg = isAll
      ? `PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA (${selectedIds.length}) siswa? Seluruh riwayat ujian dan nilai siswa ini akan dihapus secara permanen.`
      : `Hapus ${selectedIds.length} siswa yang ditandai? Seluruh riwayat ujian siswa yang dipilih akan dihapus.`;

    if (!confirm(confirmMsg)) return;

    setDeletingBulk(true);
    try {
      const res = await authFetch('/api/siswa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: data.message || `Berhasil menghapus ${selectedIds.length} siswa` });
        setSelectedIds([]);
        loadSiswa();
      } else {
        setAlert({ type: 'danger', message: data.error || 'Gagal menghapus siswa terpilih' });
      }
    } catch {
      setAlert({ type: 'danger', message: 'Gagal menghubungi server' });
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleDeleteAllStudents = async () => {
    if (siswaList.length === 0) return;
    if (!confirm(`PERINGATAN KERAS: Apakah Anda yakin ingin MENGHAPUS SEMUA (${siswaList.length}) siswa sekaligus? Seluruh data nilai dan sesi ujian siswa Anda akan dihapus permanen.`)) return;

    setDeletingBulk(true);
    try {
      const res = await authFetch('/api/siswa?all=true', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: data.message || 'Semua siswa berhasil dihapus' });
        setSelectedIds([]);
        loadSiswa();
      } else {
        setAlert({ type: 'danger', message: data.error || 'Gagal menghapus seluruh siswa' });
      }
    } catch {
      setAlert({ type: 'danger', message: 'Gagal menghubungi server' });
    } finally {
      setDeletingBulk(false);
    }
  };

  const filteredPrintStudents = siswaList.filter(s => !printKelas || s.kelas === printKelas);

  const handlePrintCards = () => {
    window.print();
  };

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat...</p></div>;
  }

  return (
    <div className="app-container" style={{ background: '#f4f2ee', minHeight: '100vh' }}>
      <div className="no-print">
        <Navbar user={user} onLogout={logout} role="guru" />
      </div>

      {/* Main Screen (Hidden on print) */}
      <main className="main-content no-print">
        <div className="page-header-ribbon">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#191919', margin: 0 }}>Kelola Akun Siswa & Kartu Ujian</h1>
              {isSuperadmin && (
                <span className="badge badge-primary" style={{ background: '#0f172a', color: '#fff', fontSize: 11, padding: '2px 8px' }}>
                  Superadmin View (Semua Guru)
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#666666', marginTop: 4, margin: '4px 0 0' }}>
              {isSuperadmin
                ? 'Mode Superadmin: Anda dapat memantau dan memfilter seluruh akun siswa yang didaftarkan oleh masing-masing guru.'
                : `Hanya menampilkan siswa yang Anda daftarkan (${user?.nama || 'Akun Guru'}). Siswa dari guru lain terisolasi secara aman.`}
            </p>
          </div>
          <div className="page-header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowBulkModal(true)}
              style={{ borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              + Tambah Masal (Bulk)
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePrintCards}
              disabled={filteredPrintStudents.length === 0}
              style={{ borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#0a66c2', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Cetak Kartu Ujian ({filteredPrintStudents.length})
            </button>
          </div>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{alert.message}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setAlert(null)}>✕</button>
          </div>
        )}

        <div className="admin-two-col">
          {/* Left Column: Student Table */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#191919' }}>
                Daftar Peserta Ujian ({siswaList.length} Siswa)
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {isSuperadmin && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#666666', fontWeight: 600 }}>Filter Guru:</span>
                    <select
                      className="form-select"
                      style={{ padding: '4px 8px', fontSize: 12, width: 'auto', background: '#f8fafc', borderColor: '#cbd5e1', fontWeight: 600 }}
                      value={filterGuru}
                      onChange={(e) => setFilterGuru(e.target.value)}
                    >
                      <option value="">Semua Guru ({teacherOptions.length} Guru)</option>
                      {teacherOptions.map(t => (
                        <option key={t.id} value={t.id}>{t.nama} ({t.username})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: '#666666' }}>Filter Kelas:</span>
                  <select
                    className="form-select"
                    style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}
                    value={filterKelas}
                    onChange={(e) => {
                      setFilterKelas(e.target.value);
                      setPrintKelas(e.target.value);
                    }}
                  >
                    <option value="">Semua Kelas</option>
                    {kelasList.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                {siswaList.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleDeleteAllStudents}
                    disabled={deletingBulk}
                    style={{
                      fontSize: 12,
                      padding: '5px 12px',
                      background: '#fff1f2',
                      color: '#be123c',
                      border: '1px solid #fecdd3',
                      fontWeight: 600,
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Hapus seluruh peserta ujian di akun Anda"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Hapus Semua Siswa
                  </button>
                )}
              </div>
            </div>

            {/* Floating / Active Bulk Selection Action Banner */}
            {selectedIds.length > 0 && (
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                boxShadow: '0 2px 4px rgba(59,130,246,0.08)'
              }}>
                <div style={{ fontSize: 13, color: '#1e40af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: 99,
                    width: 22,
                    height: 22,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700
                  }}>
                    {selectedIds.length}
                  </span>
                  <span>
                    <strong>{selectedIds.length}</strong> siswa ditandai (dari total {siswaList.length})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedIds([])}
                    style={{ fontSize: 12, color: '#64748b' }}
                  >
                    Batal Pilihan
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleDeleteSelected}
                    disabled={deletingBulk}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#dc2626',
                      color: '#ffffff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: 6,
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    {deletingBulk ? 'Menghapus...' : `Hapus ${selectedIds.length} Siswa Ditandai`}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: '#666666' }}>Memuat daftar siswa...</p>
              </div>
            ) : siswaList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36, color: '#666666' }}>
                <p style={{ margin: 0, fontSize: 13 }}>Belum ada data siswa untuk kelas atau guru ini.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 38, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#2563eb' }}
                          checked={siswaList.length > 0 && selectedIds.length === siswaList.length}
                          onChange={handleToggleSelectAll}
                          title="Tandai Semua Siswa"
                        />
                      </th>
                      <th style={{ width: 40 }}>No</th>
                      <th>Username (Login)</th>
                      <th>Nama Lengkap</th>
                      {isSuperadmin && <th>Guru Pengampu</th>}
                      <th>Kelas</th>
                      <th>Absen</th>
                      <th>Password</th>
                      <th style={{ width: 85, textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaList.map((s, idx) => {
                      const isSelected = selectedIds.includes(s.id);
                      return (
                        <tr key={s.id} style={{ background: isSelected ? '#eff6ff' : undefined }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#2563eb' }}
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(s.id)}
                              title={`Tandai ${s.nama}`}
                            />
                          </td>
                          <td>{idx + 1}</td>
                          <td>
                            <code style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                              {s.username}
                            </code>
                          </td>
                          <td><strong>{s.nama}</strong></td>
                          {isSuperadmin && (
                            <td>
                              <span className="badge badge-primary" style={{ fontSize: 11, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                {s.nama_guru || 'Guru'}
                              </span>
                            </td>
                          )}
                          <td><span className="badge badge-gray">{s.kelas || '-'}</span></td>
                          <td>{s.no_absen || '-'}</td>
                          <td>
                            <code style={{ background: '#f8fafc', color: '#1e293b', padding: '2px 6px', borderRadius: 4, fontWeight: 700, border: '1px solid #cbd5e1' }}>
                              {s.password_plain || '123456'}
                            </code>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#0284c7', padding: '3px 6px' }}
                                onClick={() => handleOpenEdit(s)}
                                title="Edit Data Siswa"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#dc2626', padding: '3px 6px' }}
                                onClick={() => handleDelete(s.id, s.nama)}
                                title="Hapus Siswa"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
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

          {/* Right Column: Single Add Form & Guide */}
          <div>
            <div className="card" style={{ padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#191919' }}>+ Tambah Siswa Satuan</h3>
              <form onSubmit={handleAddSingle}>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Username (ID Login) *</label>
                  <input
                    className="form-input"
                    style={{ fontSize: 13, padding: '7px 10px' }}
                    placeholder="cth: siswa2 atau NISN"
                    value={singleForm.username}
                    onChange={(e) => setSingleForm({ ...singleForm, username: e.target.value.toLowerCase() })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Nama Lengkap Siswa *</label>
                  <input
                    className="form-input"
                    style={{ fontSize: 13, padding: '7px 10px' }}
                    placeholder="cth: Ahmad Dahlan"
                    value={singleForm.nama}
                    onChange={(e) => setSingleForm({ ...singleForm, nama: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Kelas</label>
                    <input
                      className="form-input"
                      style={{ fontSize: 13, padding: '7px 10px' }}
                      placeholder="cth: XII-IPA-1"
                      value={singleForm.kelas}
                      onChange={(e) => setSingleForm({ ...singleForm, kelas: e.target.value })}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>No. Absen</label>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontSize: 13, padding: '7px 10px' }}
                      placeholder="cth: 1"
                      value={singleForm.no_absen}
                      onChange={(e) => setSingleForm({ ...singleForm, no_absen: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>Password Login Siswa</label>
                  <input
                    className="form-input"
                    style={{ fontSize: 13, padding: '7px 10px' }}
                    value={singleForm.password}
                    onChange={(e) => setSingleForm({ ...singleForm, password: e.target.value })}
                  />
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>Default: 123456</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  style={{ background: '#0a66c2', borderRadius: 6, fontSize: 13, fontWeight: 600, padding: '8px 12px' }}
                >
                  Simpan Siswa
                </button>
              </form>
            </div>

            <div className="card" style={{ padding: 16, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px', color: '#191919' }}>Petunjuk Cetak Kartu:</h4>
              <p style={{ margin: '0 0 6px' }}>
                1. Setiap kartu berukuran kartu ujian standar sekolah (lengkap dengan Username & Password).
              </p>
              <p style={{ margin: '0 0 6px' }}>
                2. Bagikan kartu kepada siswa sebelum asesmen.
              </p>
              <p style={{ margin: 0 }}>
                3. Siswa login menggunakan kredensial di kartu, lalu memasukkan <strong>Kode Ruang Ujian</strong> yang aktif.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="modal-overlay no-print" onClick={(e) => e.target === e.currentTarget && setShowBulkModal(false)}>
          <div className="modal modal-lg" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 800 }}>Impor Siswa Masal via Excel</h2>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                  Unduh template Excel, isi data siswa, lalu upload file untuk membuat akun siswa secara otomatis.
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}>✕</button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 20px' }}>
              <button
                type="button"
                onClick={() => setBulkTab('excel')}
                style={{
                  padding: '12px 18px',
                  fontSize: 13,
                  fontWeight: bulkTab === 'excel' ? 700 : 500,
                  color: bulkTab === 'excel' ? '#0a66c2' : '#64748b',
                  borderBottom: bulkTab === 'excel' ? '2.5px solid #0a66c2' : 'none',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>📊 Upload File Excel (.xlsx)</span>
                <span style={{ fontSize: 10, background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 9999 }}>Utama</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkTab('paste')}
                style={{
                  padding: '12px 18px',
                  fontSize: 13,
                  fontWeight: bulkTab === 'paste' ? 700 : 500,
                  color: bulkTab === 'paste' ? '#0a66c2' : '#64748b',
                  borderBottom: bulkTab === 'paste' ? '2.5px solid #0a66c2' : 'none',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>📋 Salin (Paste) Teks</span>
              </button>
            </div>

            {bulkTab === 'excel' ? (
              <form onSubmit={handleBulkExcelSubmit} style={{ padding: 20 }}>
                {/* Step 1: Download Template */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>Langkah 1:</span>
                        <span>Unduh Format Template Resmi</span>
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#15803d' }}>
                        Format file <code>.xlsx</code> sudah memiliki kolom yang tepat: Username, Nama Siswa, Kelas, No Absen, Password.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="btn btn-sm"
                      style={{
                        background: '#15803d',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontWeight: 700,
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Unduh Template Excel (.xlsx)
                    </button>
                  </div>
                </div>

                {/* Step 2: Fallback Class */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                    Langkah 2: Kelas Default (digunakan jika baris siswa tidak menyertakan kelas):
                  </label>
                  <input
                    className="form-input"
                    placeholder="cth: XII-IPA-1 atau 5-A"
                    value={bulkDefaultKelas}
                    onChange={(e) => setBulkDefaultKelas(e.target.value)}
                  />
                </div>

                {/* Step 3: Upload Excel File */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>
                    Langkah 3: Unggah (Upload) File Excel Yang Telah Diisi:
                  </label>
                  <div
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: 10,
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
                    <div style={{ width: 44, height: 44, borderRadius: 9999, background: '#dbeafe', color: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                      {excelFileName ? `File Terpilih: ${excelFileName}` : 'Klik untuk Pilih File Excel (.xlsx, .xls, .csv)'}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
                      Bisa langsung upload file template yang sudah Anda isi dengan nama dan username siswa
                    </p>
                  </div>
                </div>

                {excelError && (
                  <div className="alert alert-danger" style={{ marginBottom: 16, fontSize: 12 }}>
                    {excelError}
                  </div>
                )}

                {/* Preview Table */}
                {excelParsedStudents.length > 0 && (
                  <div style={{ marginBottom: 16, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>
                        ✅ Terdeteksi {excelParsedStudents.length} Siswa Siap Diimpor:
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        Menampilkan preview 5 baris pertama
                      </span>
                    </div>
                    <div style={{ overflowX: 'auto', maxHeight: 180 }}>
                      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '6px 8px' }}>No</th>
                            <th style={{ padding: '6px 8px' }}>Username</th>
                            <th style={{ padding: '6px 8px' }}>Nama Lengkap</th>
                            <th style={{ padding: '6px 8px' }}>Kelas</th>
                            <th style={{ padding: '6px 8px' }}>Absen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelParsedStudents.slice(0, 5).map((s, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '6px 8px' }}>{idx + 1}</td>
                              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{s.username}</td>
                              <td style={{ padding: '6px 8px' }}>{s.nama}</td>
                              <td style={{ padding: '6px 8px' }}>{s.kelas || '-'}</td>
                              <td style={{ padding: '6px 8px' }}>{s.no_absen || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {excelParsedStudents.length > 5 && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
                        ... dan {excelParsedStudents.length - 5} siswa lainnya
                      </p>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBulkModal(false)}
                    disabled={bulkProcessing}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#0a66c2', fontWeight: 700, padding: '8px 22px' }}
                    disabled={bulkProcessing || excelParsedStudents.length === 0}
                  >
                    {bulkProcessing ? (
                      'Membuat Akun Siswa...'
                    ) : (
                      `🚀 Buat Akun (${excelParsedStudents.length}) Siswa Sekarang`
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit} style={{ padding: 20 }}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Kelas Default (jika baris tidak menyertakan kelas):</label>
                  <input
                    className="form-input"
                    placeholder="cth: XII-IPA-1"
                    value={bulkDefaultKelas}
                    onChange={(e) => setBulkDefaultKelas(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label">
                    Tempel (Paste) Data Siswa dari Excel / Spreadsheet:
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}
                    placeholder={`Format kolom (pisahkan dengan koma atau Tab):\nUsername, Nama Lengkap, Kelas, No Absen\n\nContoh:\nsiswa1, Budi Santoso, XII-IPA-1, 1\nsiswa2, Citra Kirana, XII-IPA-1, 2\nsiswa3, Dian Permata, XII-IPA-1, 3`}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: 11, color: '#666666', marginTop: 4, display: 'block' }}>
                    Tips: Anda bisa langsung copy baris dari Microsoft Excel / Google Sheets lalu paste ke kotak di atas.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBulkModal(false)}
                    disabled={bulkProcessing}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#0a66c2', fontWeight: 700 }}
                    disabled={bulkProcessing || !bulkText.trim()}
                  >
                    {bulkProcessing ? 'Memproses Impor...' : 'Impor Siswa Sekarang'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PRINT-ONLY SECTION: Exam Cards (Print Sheet) */}
      <div className="print-only">
        <div className="print-cards-grid">
          {filteredPrintStudents.map((siswa, idx) => (
            <div key={siswa.id || idx} className="exam-card-badge">
              <div className="exam-card-header">
                <div className="exam-card-logo">ULANGAN DIGITAL</div>
                <div className="exam-card-title">KARTU PESERTA ASESMEN</div>
              </div>
              <div className="exam-card-body">
                <div className="exam-card-row">
                  <span className="exam-card-label">Nama Siswa</span>
                  <span className="exam-card-val">: {siswa.nama}</span>
                </div>
                <div className="exam-card-row">
                  <span className="exam-card-label">Kelas / Absen</span>
                  <span className="exam-card-val">: {siswa.kelas || '-'} / No. {siswa.no_absen || '-'}</span>
                </div>
                <div className="exam-card-divider" />
                <div className="exam-card-row">
                  <span className="exam-card-label">Username</span>
                  <span className="exam-card-val" style={{ fontWeight: 700 }}>: {siswa.username}</span>
                </div>
                <div className="exam-card-row">
                  <span className="exam-card-label">Password</span>
                  <span className="exam-card-val">: {siswa.password_plain || '123456'}</span>
                </div>
              </div>
              <div className="exam-card-footer">
                <span>Portal: ujian.about-wrwn.site</span>
                <span>Harap jaga kerahasiaan akun</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Edit Siswa (CRUD) */}
      {showEditModal && editingStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: 24, borderRadius: 12, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.25)', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>✏️</span>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Edit Data Peserta Ujian
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => { setShowEditModal(false); setEditingStudent(null); }}
                style={{ fontSize: 16, padding: '2px 8px', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStudent}>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                  Username (ID Login) *
                </label>
                <input
                  className="form-input"
                  style={{ fontSize: 13, background: '#f8fafc' }}
                  value={editingStudent.username}
                  onChange={(e) => setEditingStudent({ ...editingStudent, username: e.target.value.toLowerCase().trim() })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                  Nama Lengkap Siswa *
                </label>
                <input
                  className="form-input"
                  style={{ fontSize: 13 }}
                  value={editingStudent.nama}
                  onChange={(e) => setEditingStudent({ ...editingStudent, nama: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>Kelas</label>
                  <input
                    className="form-input"
                    style={{ fontSize: 13 }}
                    value={editingStudent.kelas}
                    onChange={(e) => setEditingStudent({ ...editingStudent, kelas: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>No. Absen</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ fontSize: 13 }}
                    value={editingStudent.no_absen}
                    onChange={(e) => setEditingStudent({ ...editingStudent, no_absen: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label" style={{ fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                  Password Login Siswa *
                </label>
                <input
                  className="form-input"
                  style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, background: '#f8fafc' }}
                  value={editingStudent.password}
                  onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                  placeholder="cth: 123456"
                  required
                />
                <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                  Password ini digunakan saat siswa login dan tercetak pada kartu ujian peserta.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setShowEditModal(false); setEditingStudent(null); }}
                  disabled={editSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#0a66c2', fontWeight: 700 }}
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade WhatsApp Modal when Demo Limit Reached */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Batas Kuota Siswa Demo"
        message={upgradeMsg}
      />
    </div>
  );
}
