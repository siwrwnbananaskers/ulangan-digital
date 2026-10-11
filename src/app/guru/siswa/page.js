'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import UpgradeModal from '@/components/UpgradeModal';

export default function SiswaManagementPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [siswaList, setSiswaList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [filterKelas, setFilterKelas] = useState('');
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
    password: 'guru123',
  });

  // Bulk Input Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkDefaultKelas, setBulkDefaultKelas] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Print Mode State
  const [printKelas, setPrintKelas] = useState('');

  useEffect(() => {
    if (!user) return;
    loadSiswa();
  }, [user, filterKelas]);

  const loadSiswa = async () => {
    setLoading(true);
    try {
      let url = '/api/siswa';
      if (filterKelas) url += `?kelas=${encodeURIComponent(filterKelas)}`;
      const res = await authFetch(url);
      const data = await res.json();
      setSiswaList(data.siswa || []);
      if (data.kelas_options) setKelasList(data.kelas_options);
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
      setSingleForm({ username: '', nama: '', kelas: singleForm.kelas, no_absen: '', password: 'guru123' });
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
      const password = parts[4]?.trim() || 'guru123';

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
      <main className="main-content no-print" style={{ maxWidth: 1128, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#191919', margin: 0 }}>Kelola Akun Siswa & Kartu Ujian</h1>
            <p style={{ fontSize: 13, color: '#666666', marginTop: 4, margin: '4px 0 0' }}>
              Tambah siswa satuan, impor secara masal (Excel/CSV), dan cetak kartu ujian untuk login peserta
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          {/* Left Column: Student Table */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#191919' }}>
                Daftar Peserta Ujian ({siswaList.length} Siswa)
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: '#666666' }}>Memuat daftar siswa...</p>
              </div>
            ) : siswaList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36, color: '#666666' }}>
                <p style={{ margin: 0, fontSize: 13 }}>Belum ada data siswa untuk kelas ini.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table" style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>No</th>
                      <th>Username (Login)</th>
                      <th>Nama Lengkap</th>
                      <th>Kelas</th>
                      <th>Absen</th>
                      <th style={{ width: 60, textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaList.map((s, idx) => (
                      <tr key={s.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <code style={{ background: '#f1f5f9', color: '#0f172a', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                            {s.username}
                          </code>
                        </td>
                        <td><strong>{s.nama}</strong></td>
                        <td><span className="badge badge-gray">{s.kelas || '-'}</span></td>
                        <td>{s.no_absen || '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#dc2626', padding: '2px 6px' }}
                            onClick={() => handleDelete(s.id, s.nama)}
                            title="Hapus Siswa"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
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
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>Default: guru123</span>
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
          <div className="modal modal-lg" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: 17, fontWeight: 700 }}>Tambah Siswa Secara Masal (Impor)</h2>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}>✕</button>
            </div>

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

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
                  style={{ background: '#0a66c2' }}
                  disabled={bulkProcessing || !bulkText.trim()}
                >
                  {bulkProcessing ? 'Memproses Impor...' : 'Impor Siswa Sekarang'}
                </button>
              </div>
            </form>
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
                  <span className="exam-card-val">: guru123</span>
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
