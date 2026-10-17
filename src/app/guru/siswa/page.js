'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import UpgradeModal from '@/components/UpgradeModal';
import ConfirmModal, { useConfirmDialog } from '@/components/ConfirmModal';
import EditProfileModal from '@/components/EditProfileModal';

const formatCardDate = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

export default function SiswaManagementPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const { dialogState, confirm: showConfirm, handleConfirm, handleClose } = useConfirmDialog();
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
  const [showTtdModal, setShowTtdModal] = useState(false);

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
  const [showPrintModal, setShowPrintModal] = useState(false);

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
    const ok = await showConfirm({
      title: 'Hapus Data Siswa',
      message: `Hapus data siswa "${nama}"? Semua data sesi ujian dan nilai siswa ini juga akan terhapus.`,
      confirmText: 'Ya, Hapus Siswa',
      type: 'danger',
    });
    if (!ok) return;

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
      ? `Apakah Anda yakin ingin menghapus SEMUA (${selectedIds.length}) siswa? Seluruh riwayat ujian dan nilai siswa ini akan dihapus secara permanen.`
      : `Hapus ${selectedIds.length} data siswa yang ditandai? Seluruh riwayat ujian siswa yang dipilih akan dihapus.`;

    const ok = await showConfirm({
      title: isAll ? 'Hapus Semua Siswa Terpilih' : 'Hapus Siswa Terpilih',
      message: confirmMsg,
      confirmText: 'Ya, Hapus',
      type: 'danger',
    });
    if (!ok) return;

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
    const ok = await showConfirm({
      title: 'Hapus Semua Data Siswa',
      message: `PERINGATAN KERAS: Apakah Anda yakin ingin MENGHAPUS SEMUA (${siswaList.length}) siswa sekaligus? Seluruh data nilai dan sesi ujian siswa Anda akan dihapus permanen.`,
      confirmText: 'Ya, Hapus Semua Siswa',
      type: 'danger',
    });
    if (!ok) return;

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
    setShowPrintModal(true);
  };

  const handleExecutePrint = () => {
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
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowTtdModal(true)}
              style={{
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: user?.tanda_tangan ? '#f0fdf4' : '#ffffff',
                borderColor: user?.tanda_tangan ? '#86efac' : '#cbd5e1',
                color: user?.tanda_tangan ? '#166534' : '#334155',
              }}
              title="Atur foto/scan tanda tangan digital guru untuk kartu login dan lembar hasil"
            >
              <span>✍️</span> {user?.tanda_tangan ? 'TTD Siap' : 'Upload TTD'}
            </button>
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
              Cetak ({filteredPrintStudents.length})
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
                  color: bulkTab === 'excel' ? '#0f172a' : '#64748b',
                  borderBottom: bulkTab === 'excel' ? '2.5px solid #0f172a' : 'none',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>Upload File Excel (.xlsx)</span>
                <span style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Utama</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkTab('paste')}
                style={{
                  padding: '12px 18px',
                  fontSize: 13,
                  fontWeight: bulkTab === 'paste' ? 700 : 500,
                  color: bulkTab === 'paste' ? '#0f172a' : '#64748b',
                  borderBottom: bulkTab === 'paste' ? '2.5px solid #0f172a' : 'none',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Salin (Paste) Teks</span>
              </button>
            </div>

            {bulkTab === 'excel' ? (
              <form onSubmit={handleBulkExcelSubmit} style={{ padding: 20 }}>
                {/* Step 1: Download Template */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 18px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                        Langkah 1: Unduh Format Template Resmi
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
                        Format file .xlsx sudah memiliki kolom yang tepat: Username, Nama Siswa, Kelas, No Absen, Password.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="btn btn-sm"
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
                        gap: 6,
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
                </div>

                {/* Step 2: Fallback Class */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                    Langkah 2: Kelas Default (digunakan jika baris siswa tidak menyertakan kelas):
                  </label>
                  <input
                    className="form-input"
                    placeholder="cth: XII-IPA-1 atau 5-A"
                    value={bulkDefaultKelas}
                    onChange={(e) => setBulkDefaultKelas(e.target.value)}
                    style={{ fontSize: 13, borderRadius: 6 }}
                  />
                </div>

                {/* Step 3: Upload Excel File */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>
                    Langkah 3: Unggah (Upload) File Excel Yang Telah Diisi:
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
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#0f172a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <polyline points="9 15 12 12 15 15" />
                      </svg>
                    </div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
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
                  <div style={{ marginBottom: 16, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          Terdeteksi {excelParsedStudents.length} Siswa Siap Diimpor
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        Menampilkan preview 5 baris pertama
                      </span>
                    </div>
                    <div style={{ overflowX: 'auto', maxHeight: 180, border: '1px solid #f1f5f9', borderRadius: 6 }}>
                      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                            <th style={{ padding: '8px 10px', fontWeight: 600, width: 44, textAlign: 'center' }}>No</th>
                            <th style={{ padding: '8px 10px', fontWeight: 600 }}>Username</th>
                            <th style={{ padding: '8px 10px', fontWeight: 600 }}>Nama Lengkap</th>
                            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>Kelas</th>
                            <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>Absen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {excelParsedStudents.slice(0, 5).map((s, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{s.username}</td>
                              <td style={{ padding: '8px 10px', color: '#334155' }}>{s.nama}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{s.kelas || '-'}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{s.no_absen || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {excelParsedStudents.length > 5 && (
                      <p style={{ margin: '8px 0 0', fontSize: 11, color: '#64748b', textAlign: 'center' }}>
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
                    style={{ borderRadius: 6, fontSize: 13 }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#0a66c2', fontWeight: 600, padding: '8px 22px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    disabled={bulkProcessing || excelParsedStudents.length === 0}
                  >
                    {bulkProcessing ? (
                      <>
                        <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        <span>Membuat Akun Siswa...</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Buat Akun ({excelParsedStudents.length}) Siswa Sekarang</span>
                      </>
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

      {/* PRINT-ONLY SECTION (85.60 mm x 53.98 mm) */}
      <div className="print-only">
        <div className="print-cards-grid">
          {filteredPrintStudents.map((siswa, idx) => {
            const namaGuru = siswa.nama_guru || user?.nama || 'Guru Pengampu';
            const ttdGuru = siswa.guru_tanda_tangan || user?.tanda_tangan || null;
            return (
              <div key={siswa.id || idx} className="exam-card-badge">
                <div className="exam-card-cut-corner">✂</div>

                {/* Header Kop Resmi & Universal */}
                <div className="exam-card-header">
                  <div className="exam-card-logo-group">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5">
                      <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                      <polyline points="9 12 11 14 15 10" />
                    </svg>
                    <div>
                      <div className="exam-card-logo">KARTU PESERTA ASESMEN & UJIAN</div>
                      <div className="exam-card-sublogo">Asesmen Berbasis Komputer & CBT</div>
                    </div>
                  </div>
                  <div className="exam-card-title">KARTU LOGIN</div>
                </div>

                {/* Identitas Siswa Full-Width (Anti-Terpotong & Titik Dua Sejajar Presisi) */}
                <div className="exam-card-student-section">
                  <div className="exam-card-name-row">
                    <span className="exam-card-label-col">Nama Siswa</span>
                    <span className="exam-card-colon">:</span>
                    <span className="exam-card-val-name">{siswa.nama}</span>
                  </div>
                  <div className="exam-card-meta-row">
                    <div className="exam-card-meta-left">
                      <span className="exam-card-label-col">Kelas / Absen</span>
                      <span className="exam-card-colon">:</span>
                      <span className="exam-card-val-meta">{siswa.kelas || '-'} / No. {siswa.no_absen || '-'}</span>
                    </div>
                    <div className="exam-card-meta-right">
                      <span className="exam-card-label-narrow">ID Peserta :</span>
                      <span className="exam-card-val-meta" style={{ fontFamily: 'Consolas, monospace' }}>{siswa.username}</span>
                    </div>
                  </div>
                </div>

                {/* Bagian Bawah: Kiri (Login Box & Portal) & Kanan (Tanggal & TTD Guru Pengampu) */}
                <div className="exam-card-bottom-grid">
                  {/* Sisi Kiri: Box Akses Login & Portal */}
                  <div className="exam-card-login-col">
                    <div className="exam-card-login-box">
                      <div className="exam-card-login-head">AKSES LOGIN</div>
                      <div className="exam-card-login-row">
                        <span className="exam-card-login-key">USERNAME</span>
                        <span className="exam-card-login-val">{siswa.username}</span>
                      </div>
                      <div className="exam-card-login-row">
                        <span className="exam-card-login-key">PASSWORD</span>
                        <span className="exam-card-login-val">{siswa.password_plain || '123456'}</span>
                      </div>
                    </div>
                    <div className="exam-card-portal-badge">
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <span>ujian.about-wrwn.site</span>
                    </div>
                  </div>

                  {/* Sisi Kanan (Sudut Bawah Kanan): Tanggal Cetak & TTD Guru Pengampu */}
                  <div className="exam-card-sign-col">
                    <div className="exam-card-sign-head">
                      <div className="exam-card-sign-date">{formatCardDate()}</div>
                      <div className="exam-card-sign-label">Guru Pengampu,</div>
                    </div>
                    <div className="exam-card-sign-space">
                      {ttdGuru && (
                        <img src={ttdGuru} alt="TTD Guru" className="exam-card-sign-img" />
                      )}
                    </div>
                    <div className="exam-card-sign-name" title={namaGuru}>( {namaGuru} )</div>
                  </div>
                </div>

                {/* Footer Kartu */}
                <div className="exam-card-footer">
                  <span>*Simpan kartu & jaga kerahasiaan akses login</span>
                  <span>Kartu Resmi Peserta</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL PRATINJAU CETAK KARTU SISWA (85.60 mm x 53.98 mm) */}
      {showPrintModal && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPrintModal(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 960,
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                      Pratinjau Cetak Kartu Peserta Ujian
                    </h3>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: '#dbeafe',
                        color: '#1e40af',
                        padding: '2px 8px',
                        borderRadius: 12,
                        letterSpacing: 0.3,
                      }}
                    >
                      Presisi 8,56 cm x 5,4 cm • HD
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                    Standar ISO/IEC 7810 ID-1, tajam, presisi, dan mudah dibaca oleh pengawas serta siswa.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPrintModal(false)}
                style={{ fontSize: 18, color: '#64748b', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Filter & Toolbar */}
            <div
              style={{
                padding: '12px 20px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  Pilih Kelas:
                </label>
                <select
                  className="form-select"
                  value={printKelas}
                  onChange={(e) => setPrintKelas(e.target.value)}
                  style={{ height: 36, fontSize: 13, minWidth: 160 }}
                >
                  <option value="">Semua Kelas ({siswaList.length} siswa)</option>
                  {kelasList.map((k) => {
                    const count = siswaList.filter((s) => s.kelas === k).length;
                    return (
                      <option key={k} value={k}>
                        {k} ({count} siswa)
                      </option>
                    );
                  })}
                </select>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Siap cetak: <strong>{filteredPrintStudents.length} kartu</strong> (muat ~8-10 kartu per lembar A4)
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTtdModal(true)}
                  style={{
                    height: 38,
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: user?.tanda_tangan ? '#f0fdf4' : '#ffffff',
                    borderColor: user?.tanda_tangan ? '#86efac' : '#cbd5e1',
                    color: user?.tanda_tangan ? '#166534' : '#334155',
                  }}
                  title="Atur / upload foto tanda tangan digital guru"
                >
                  <span>✍️</span> {user?.tanda_tangan ? 'Ganti TTD Guru' : 'Upload TTD Guru'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPrintModal(false)}
                  style={{ height: 38, fontSize: 13, fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleExecutePrint}
                  style={{
                    height: 38,
                    fontSize: 13,
                    fontWeight: 700,
                    background: '#0a66c2',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 18px',
                    boxShadow: '0 2px 4px rgba(10, 102, 194, 0.25)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  Cetak
                </button>
              </div>
            </div>

            {/* Instruction Banner */}
            <div
              style={{
                padding: '10px 20px',
                background: '#eff6ff',
                borderBottom: '1px solid #bfdbfe',
                fontSize: 12,
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>💡</span>
              <span>
                <strong>Petunjuk Cetak:</strong> Di jendela cetak browser (Ctrl+P), pilih <strong>Kertas A4</strong>, Skala <strong>100% (Default)</strong>, dan centang opsi <strong>"Grafik Latar Belakang / Background Graphics"</strong> untuk hasil kartu yang presisi dan tajam maksimal.
              </span>
            </div>

            {/* Preview Cards Grid */}
            <div
              style={{
                padding: 24,
                overflowY: 'auto',
                flex: 1,
                background: '#f1f5f9',
              }}
            >
              {filteredPrintStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  Tidak ada peserta ujian pada kelas ini.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 16,
                    justifyContent: 'center',
                  }}
                >
                  {filteredPrintStudents.map((siswa, idx) => {
                    const namaGuru = siswa.nama_guru || user?.nama || 'Guru Pengampu';
                    const ttdGuru = siswa.guru_tanda_tangan || user?.tanda_tangan || null;
                    return (
                      <div
                        key={siswa.id || idx}
                        style={{
                          width: '100%',
                          maxWidth: 360,
                          aspectRatio: '85.6 / 53.98',
                          background: '#ffffff',
                          border: '1px dashed #64748b',
                          borderRadius: 0,
                          padding: '11px 14px 9px 14px',
                          boxSizing: 'border-box',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 1,
                            left: 3,
                            fontSize: 9,
                            color: '#94a3b8',
                            lineHeight: 1,
                          }}
                        >
                          ✂
                        </div>

                        {/* Card Header Kop Resmi & Universal */}
                        <div
                          style={{
                            borderBottom: '1.2px solid #0f172a',
                            paddingBottom: 5,
                            marginBottom: 8,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2.5">
                              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                              <polyline points="9 12 11 14 15 10" />
                            </svg>
                            <div>
                              <div style={{ fontSize: 9.8, fontWeight: 900, color: '#0f172a', letterSpacing: 0.3, lineHeight: 1.1 }}>
                                KARTU PESERTA ASESMEN & UJIAN
                              </div>
                              <div style={{ fontSize: 7, color: '#64748b', fontWeight: 600 }}>
                                Asesmen Berbasis Komputer & CBT
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 8,
                              fontWeight: 800,
                              background: '#0f172a',
                              color: '#ffffff',
                              padding: '2px 6px',
                              borderRadius: 2,
                              letterSpacing: 0.4,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            KARTU LOGIN
                          </div>
                        </div>

                        {/* Identitas Siswa Full-Width (Anti-Terpotong & Titik Dua Sejajar Rapi) */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            paddingBottom: 6,
                            marginBottom: 8,
                            borderBottom: '0.8px dashed #cbd5e1',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 10 }}>
                            <span style={{ width: 78, color: '#475569', fontWeight: 600, flexShrink: 0, fontSize: 9 }}>Nama Siswa</span>
                            <span style={{ width: 10, textAlign: 'center', fontWeight: 700, color: '#475569', flexShrink: 0, marginRight: 5 }}>:</span>
                            <span
                              style={{
                                flex: 1,
                                fontWeight: 800,
                                color: '#000000',
                                textTransform: 'uppercase',
                                lineHeight: 1.15,
                                fontSize: 10,
                                wordBreak: 'break-word',
                              }}
                            >
                              {siswa.nama}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 8.5, marginTop: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', flexShrink: 0 }}>
                              <span style={{ width: 78, color: '#475569', fontWeight: 600, flexShrink: 0, fontSize: 9 }}>Kelas / Absen</span>
                              <span style={{ width: 10, textAlign: 'center', fontWeight: 700, color: '#475569', flexShrink: 0, marginRight: 5 }}>:</span>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                {siswa.kelas || '-'} / No. {siswa.no_absen || '-'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                              <span style={{ color: '#475569', fontWeight: 600 }}>ID Peserta :</span>
                              <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#0f172a' }}>
                                {siswa.username}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bagian Bawah: Mengisi ruang secara proporsional */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'stretch',
                            gap: 10,
                            flex: 1,
                            marginBottom: 6,
                            minHeight: 70,
                          }}
                        >
                          {/* Sisi Kiri: Login Box & Portal Link */}
                          <div style={{ width: 144, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0 }}>
                            <div
                              style={{
                                border: '1px solid #0f172a',
                                borderRadius: 2,
                                background: '#f8fafc',
                                padding: '4px 7px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 2.5,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 7.2,
                                  fontWeight: 800,
                                  color: '#475569',
                                  letterSpacing: 0.5,
                                  borderBottom: '0.5px solid #cbd5e1',
                                  paddingBottom: 2,
                                  textAlign: 'center',
                                  textTransform: 'uppercase',
                                }}
                              >
                                AKSES LOGIN
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontFamily: 'Consolas, monospace',
                                  fontSize: 8.5,
                                  lineHeight: 1.1,
                                }}
                              >
                                <span style={{ color: '#64748b', fontWeight: 700, fontSize: 7.5, letterSpacing: 0.2 }}>USERNAME</span>
                                <span style={{ fontWeight: 800, color: '#0f172a' }}>{siswa.username}</span>
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontFamily: 'Consolas, monospace',
                                  fontSize: 8.5,
                                  lineHeight: 1.1,
                                }}
                              >
                                <span style={{ color: '#64748b', fontWeight: 700, fontSize: 7.5, letterSpacing: 0.2 }}>PASSWORD</span>
                                <span style={{ fontWeight: 800, color: '#0f172a' }}>{siswa.password_plain || '123456'}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 7.5, fontWeight: 700, color: '#334155', marginTop: 4 }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                              </svg>
                              <span>ujian.about-wrwn.site</span>
                            </div>
                          </div>

                          {/* Sisi Kanan (Sudut Bawah Kanan): Tanggal Cetak & TTD Guru Pengampu */}
                          <div
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              textAlign: 'center',
                              minWidth: 0,
                            }}
                          >
                            <div style={{ width: '100%', textAlign: 'center' }}>
                              <div style={{ fontSize: 8, fontWeight: 600, color: '#334155', lineHeight: 1.2, textAlign: 'center' }}>
                                {formatCardDate()}
                              </div>
                              <div style={{ fontSize: 8, fontWeight: 600, color: '#475569', lineHeight: 1.2, marginTop: 1, textAlign: 'center' }}>
                                Guru Pengampu,
                              </div>
                            </div>
                            <div
                              style={{
                                flex: 1,
                                minHeight: 26,
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                              }}
                            >
                              {ttdGuru && (
                                <img
                                  src={ttdGuru}
                                  alt="TTD Guru"
                                  style={{ maxHeight: 26, maxWidth: 110, objectFit: 'contain', display: 'block', margin: '0 auto' }}
                                />
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                color: '#0f172a',
                                lineHeight: 1.1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                width: '100%',
                                textAlign: 'center',
                              }}
                              title={namaGuru}
                            >
                              ( {namaGuru} )
                            </div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div
                          style={{
                            borderTop: '0.8px solid #cbd5e1',
                            paddingTop: 4,
                            fontSize: 7.5,
                            color: '#64748b',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>*Simpan kartu & jaga kerahasiaan akun login</span>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>Kartu Resmi Peserta</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
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

      {/* Modern Confirmation Dialog */}
      <ConfirmModal
        {...dialogState}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />

      {/* TTD Guru Uploader Modal */}
      {showTtdModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowTtdModal(false)}
          onUpdate={() => {
            loadSiswa();
          }}
        />
      )}
    </div>
  );
}
