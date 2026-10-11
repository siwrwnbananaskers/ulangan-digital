'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';
import UpgradeModal from '@/components/UpgradeModal';

export default function UjianPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [ujianList, setUjianList] = useState([]);
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [editingUjian, setEditingUjian] = useState(null);
  const [selectedSoal, setSelectedSoal] = useState([]);
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('semua');
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const getInitialForm = () => {
    const now = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const formatDt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    return {
      judul: '',
      mata_pelajaran: '',
      kelas_target: 'Semua Kelas',
      deskripsi: '',
      durasi_menit: 60,
      jadwal_mulai: formatDt(now),
      jadwal_selesai: formatDt(nextWeek),
      kkm: 75,
      acak_soal: false,
      acak_jawaban: false,
      tampilkan_nilai: true,
      batas_pelanggaran: 3,
      status: 'aktif',
    };
  };

  const [form, setForm] = useState(getInitialForm());

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [ujianRes, soalRes] = await Promise.all([
        authFetch(`/api/ujian?_t=${Date.now()}`),
        authFetch(`/api/soal?_t=${Date.now()}`),
      ]);
      const ujianData = await ujianRes.json();
      const soalData = await soalRes.json();
      setUjianList(ujianData.ujian || []);
      setSoalList(soalData.soal || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(getInitialForm());
    setSelectedSoal([]);
    setEditingUjian(null);
  };

  const handleCopyCode = (code, id) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = async (ujian) => {
    resetForm();
    setEditingUjian(ujian);
    
    // Format dates for datetime-local input
    const formatForInput = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setForm({
      judul: ujian.judul || '',
      mata_pelajaran: ujian.mata_pelajaran || '',
      kelas_target: ujian.kelas_target || '',
      deskripsi: ujian.deskripsi || '',
      durasi_menit: ujian.durasi_menit || 60,
      jadwal_mulai: formatForInput(ujian.jadwal_mulai),
      jadwal_selesai: formatForInput(ujian.jadwal_selesai),
      kkm: ujian.kkm || 75,
      acak_soal: !!ujian.acak_soal,
      acak_jawaban: !!ujian.acak_jawaban,
      tampilkan_nilai: !!ujian.tampilkan_nilai,
      batas_pelanggaran: ujian.batas_pelanggaran || 3,
      status: ujian.status || 'draft',
    });

    // Load active question IDs for this exam
    try {
      const res = await authFetch(`/api/ujian/${ujian.id}`);
      const data = await res.json();
      if (data.soal && Array.isArray(data.soal)) {
        setSelectedSoal(data.soal.map(s => s.id));
      }
    } catch {
      // fallback
    }

    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSoal.length === 0) {
      setAlert({ type: 'danger', message: 'Pilih minimal 1 butir soal untuk ujian' });
      return;
    }

    setSaving(true);
    setAlert(null);

    try {
      if (editingUjian) {
        // Edit existing exam
        const res = await authFetch('/api/ujian', {
          method: 'PUT',
          body: JSON.stringify({
            id: editingUjian.id,
            ...form,
            soal_ids: selectedSoal,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAlert({ type: 'danger', message: data.error || 'Gagal memperbarui ujian' });
          setSaving(false);
          return;
        }
        setAlert({ type: 'success', message: `Ujian "${form.judul}" berhasil diperbarui!` });
      } else {
        // Create new exam
        const res = await authFetch('/api/ujian', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            soal_ids: selectedSoal,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.upgrade_required || data.error === 'LIMIT_DEMO_REACHED') {
            setShowUpgradeModal(true);
            setUpgradeMsg(data.message || 'Batas Akun Demo Tercapai! Anda hanya dapat membuat 1 ujian untuk uji coba.');
            setShowModal(false);
            setSaving(false);
            return;
          }
          setAlert({ type: 'danger', message: data.error || 'Gagal membuat ujian' });
          setSaving(false);
          return;
        }
        setAlert({ type: 'success', message: `Ujian berhasil dibuat! Kode Ruang: ${data.kode_ujian}` });
      }

      setShowModal(false);
      resetForm();
      setActiveTab('semua');
      loadData();
    } catch {
      setAlert({ type: 'danger', message: 'Terjadi kesalahan sistem' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await authFetch('/api/ujian', {
        method: 'PUT',
        body: JSON.stringify({ id, status: newStatus }),
      });
      setAlert({ type: 'success', message: `Status ujian diubah ke: ${newStatus}` });
      loadData();
    } catch {
      setAlert({ type: 'danger', message: 'Gagal mengubah status' });
    }
  };

  const handleDelete = async (id, judul) => {
    if (!confirm(`Hapus lembar ujian "${judul}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await authFetch(`/api/ujian?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAlert({ type: 'success', message: 'Ujian berhasil dihapus' });
        loadData();
      } else {
        const d = await res.json();
        setAlert({ type: 'danger', message: d.error || 'Gagal menghapus' });
      }
    } catch {
      setAlert({ type: 'danger', message: 'Gagal menghapus ujian' });
    }
  };

  const toggleSoal = (soalId) => {
    setSelectedSoal(prev =>
      prev.includes(soalId)
        ? prev.filter(id => id !== soalId)
        : [...prev, soalId]
    );
  };

  const selectAllFilteredSoal = () => {
    const currentMapel = (form.mata_pelajaran || '').trim().toLowerCase();
    const matching = soalList
      .filter(s => !currentMapel || (s.mata_pelajaran || '').trim().toLowerCase() === currentMapel)
      .map(s => s.id)
      .filter(Boolean);
    setSelectedSoal(prev => [...new Set([...prev, ...matching])]);
  };

  const validUjianList = (ujianList || []).filter(u => u && u.id && ((u.judul && u.judul.trim()) || (u['u.judul'] && u['u.judul'].trim())));

  const getFilteredUjian = () => {
    if (activeTab === 'semua') return validUjianList;
    return validUjianList.filter(u => (u.status || u['u.status']) === activeTab);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (authLoading) {
    return <div className="loading-page"><div className="spinner" /><p>Memuat...</p></div>;
  }

  return (
    <div className="app-container" style={{ background: '#f4f2ee', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content" style={{ maxWidth: 1128, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#191919', margin: 0 }}>Manajemen Ujian</h1>
            <p style={{ fontSize: 13, color: '#666666', marginTop: 4, margin: '4px 0 0' }}>
              Buat, jadwalkan, atur butir soal, dan pantau status pelaksanaan asesmen siswa
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href="/guru/siswa"
              className="btn btn-secondary"
              style={{ borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Kelola Siswa & Cetak Kartu
            </a>
            <button
              className="btn btn-primary"
              onClick={handleOpenCreate}
              style={{ borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, background: '#0a66c2', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Buat Ujian Baru
            </button>
          </div>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type}`} style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{alert.message}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setAlert(null)} style={{ padding: '2px 8px' }}>✕</button>
          </div>
        )}

        {/* Tab Pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#ffffff', padding: '6px 12px', borderRadius: 8, border: '1px solid #e0dfdc' }}>
          {[
            { key: 'semua', label: `Semua (${validUjianList.length})` },
            { key: 'aktif', label: `Aktif (${validUjianList.filter(u => (u.status || u['u.status']) === 'aktif').length})` },
            { key: 'draft', label: `Draft (${validUjianList.filter(u => (u.status || u['u.status']) === 'draft').length})` },
            { key: 'selesai', label: `Selesai (${validUjianList.filter(u => (u.status || u['u.status']) === 'selesai').length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                border: 'none',
                background: activeTab === tab.key ? '#0a66c2' : 'transparent',
                color: activeTab === tab.key ? '#ffffff' : '#666666',
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ujian List Cards */}
        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13, color: '#666666', margin: 0 }}>Memuat daftar ujian...</p>
          </div>
        ) : getFilteredUjian().length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#191919', marginBottom: 6 }}>Belum Ada Ujian</h3>
            <p style={{ fontSize: 13, color: '#666666', marginBottom: 16 }}>
              Klik tombol &ldquo;Buat Ujian Baru&rdquo; untuk menyusun asesmen dan membuat kode ruang ujian.
            </p>
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreate} style={{ borderRadius: 6, background: '#0a66c2' }}>
              Buat Ujian Baru
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
            {getFilteredUjian().map(ujian => {
              const judul = ujian.judul || ujian['u.judul'] || 'Ujian';
              const mataPelajaran = ujian.mata_pelajaran || ujian['u.mata_pelajaran'] || '-';
              const kelasTarget = ujian.kelas_target || ujian['u.kelas_target'] || '-';
              const kodeUjian = ujian.kode_ujian || ujian['u.kode_ujian'] || '-';
              const durasiMenit = ujian.durasi_menit || ujian['u.durasi_menit'] || 60;
              const jumlahSoal = ujian.jumlah_soal || ujian['u.jumlah_soal'] || 0;
              const kkm = ujian.kkm !== undefined ? ujian.kkm : (ujian['u.kkm'] !== undefined ? ujian['u.kkm'] : 75);
              const status = ujian.status || ujian['u.status'] || 'draft';
              const jadwalMulai = ujian.jadwal_mulai || ujian['u.jadwal_mulai'];
              const jadwalSelesai = ujian.jadwal_selesai || ujian['u.jadwal_selesai'];

              return (
                <div key={ujian.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#191919', margin: '0 0 4px' }}>{judul}</h3>
                        <p style={{ fontSize: 12, color: '#666666', margin: 0 }}>
                          {mataPelajaran} — Kelas: <strong>{kelasTarget}</strong>
                        </p>
                      </div>
                      <span className={`badge ${
                        status === 'aktif' ? 'badge-success' :
                        status === 'selesai' ? 'badge-gray' : 'badge-warning'
                      }`} style={{ fontSize: 11, padding: '3px 10px' }}>
                        {status === 'aktif' ? 'Aktif' : status === 'selesai' ? 'Selesai' : 'Draft'}
                      </span>
                    </div>

                    {/* Metadata Specs */}
                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #f1f5f9', marginBottom: 14, fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: '#666666', minWidth: 65 }}>Kode Ruang:</span>
                          <code style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em' }}>
                            {kodeUjian}
                          </code>
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleCopyCode(kodeUjian, ujian.id)}
                          style={{ fontSize: 11, padding: '3px 8px', color: copiedId === ujian.id ? '#16a34a' : '#0a66c2', fontWeight: 600 }}
                          title="Salin Kode Ruang Ujian"
                        >
                          {copiedId === ujian.id ? '✓ Tersalin' : '📋 Salin Kode'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', marginBottom: 4 }}>
                        <span>Durasi: <strong>{durasiMenit} Menit</strong></span>
                        <span>Soal: <strong>{jumlahSoal} Butir</strong></span>
                        <span>KKM: <strong>{kkm}</strong></span>
                      </div>
                      <div style={{ color: '#666666', fontSize: 11 }}>
                        Jadwal: {formatDate(jadwalMulai)} s/d {formatDate(jadwalSelesai)}
                      </div>
                      <div style={{ color: '#666666', fontSize: 11, marginTop: 4 }}>
                        Peserta: <strong>{ujian.peserta_selesai || 0}</strong> selesai / <strong>{ujian.total_peserta || 0}</strong> terdaftar
                      </div>
                    </div>
                  </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                  {/* Status Toggle */}
                  {status === 'draft' && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleStatusChange(ujian.id, 'aktif')}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, fontWeight: 700 }}
                    >
                      ⚡ Buka Ruang Ujian (Aktifkan)
                    </button>
                  )}
                  {status === 'aktif' && (
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => handleStatusChange(ujian.id, 'selesai')}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6 }}
                    >
                      Akhiri
                    </button>
                  )}
                  {ujian.status === 'selesai' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStatusChange(ujian.id, 'aktif')}
                      style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6 }}
                    >
                      Buka Lagi
                    </button>
                  )}

                  {/* Edit Full Exam Button */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEdit(ujian)}
                    style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title="Edit Judul, Waktu, Soal, dsb."
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>

                  {/* Result & Evaluation */}
                  <a
                    href={`/guru/hasil?ujian_id=${ujian.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6 }}
                  >
                    Hasil
                  </a>

                  {/* Delete Button */}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(ujian.id, ujian.judul)}
                    style={{ color: '#dc2626', marginLeft: 'auto', padding: '5px 8px' }}
                    title="Hapus Ujian"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Buat / Edit Ujian */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg" style={{ maxHeight: '92vh', overflow: 'auto', maxWidth: 760 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 700 }}>
                {editingUjian ? `Edit Ujian: ${editingUjian.judul}` : 'Buat Lembar Ujian Baru'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '16px 20px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Judul Ujian *</label>
                  <input
                    className="form-input"
                    value={form.judul}
                    onChange={(e) => setForm({ ...form, judul: e.target.value })}
                    placeholder="cth: Penilaian Harian Matematika Wajib"
                    required
                  />
                </div>
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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kelas Target *</label>
                  <input
                    className="form-input"
                    value={form.kelas_target}
                    onChange={(e) => setForm({ ...form, kelas_target: e.target.value })}
                    placeholder="cth: XII-IPA-1 (atau Semua Kelas)"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Durasi Waktu Pengerjaan (Menit) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.durasi_menit}
                    onChange={(e) => setForm({ ...form, durasi_menit: parseInt(e.target.value) || 0 })}
                    min="5"
                    max="360"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jadwal Mulai Akses *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={form.jadwal_mulai}
                    onChange={(e) => setForm({ ...form, jadwal_mulai: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jadwal Selesai / Batas Waktu *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={form.jadwal_selesai}
                    onChange={(e) => setForm({ ...form, jadwal_selesai: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Petunjuk & Pesan dari Guru</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={form.deskripsi}
                  onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                  placeholder="cth: Kerjakan dengan teliti, dilarang membuka browser/tab lain..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nilai KKM (Standar Kelulusan)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.kkm}
                    onChange={(e) => setForm({ ...form, kkm: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Batas Toleransi Pelanggaran (Kiosk Mode)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.batas_pelanggaran}
                    onChange={(e) => setForm({ ...form, batas_pelanggaran: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="10"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status Ujian</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="draft">Draft (Belum dibuka)</option>
                    <option value="aktif">Aktif (Dapat dikerjakan)</option>
                    <option value="selesai">Selesai (Ditutup)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                <label className="form-checkbox" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.acak_soal}
                    onChange={(e) => setForm({ ...form, acak_soal: e.target.checked })}
                  />
                  <span>Acak urutan butir soal per siswa</span>
                </label>
                <label className="form-checkbox" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.tampilkan_nilai}
                    onChange={(e) => setForm({ ...form, tampilkan_nilai: e.target.checked })}
                  />
                  <span>Tampilkan perolehan nilai langsung saat siswa selesai</span>
                </label>
              </div>

              {/* Question Selection Area */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                    Pilih Butir Soal ({selectedSoal.length} terpilih)
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={selectAllFilteredSoal}
                    style={{ fontSize: 12, color: '#0a66c2' }}
                  >
                    Pilih Semua Soal Mapel Ini
                  </button>
                </div>

                <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: 8, padding: 8, background: '#f8fafc' }}>
                  {soalList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, fontSize: 13, color: '#666666' }}>
                      Belum ada butir soal di Bank Soal. <a href="/guru/bank-soal">Tambah soal terlebih dahulu</a>
                    </div>
                  ) : (
                    soalList.map(soal => (
                      <label
                        key={soal.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '8px 10px',
                          borderBottom: '1px solid #e2e8f0',
                          background: selectedSoal.includes(soal.id) ? '#eff6ff' : '#ffffff',
                          borderRadius: 6,
                          marginBottom: 4,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSoal.includes(soal.id)}
                          onChange={() => toggleSoal(soal.id)}
                          style={{ marginTop: 3 }}
                        />
                        <div style={{ flex: 1, fontSize: 12 }}>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                            <span className="badge badge-gray" style={{ fontSize: 10 }}>{soal.tipe?.toUpperCase()}</span>
                            <span className="badge badge-primary" style={{ fontSize: 10 }}>{soal.mata_pelajaran}</span>
                            <span style={{ color: '#64748b' }}>Bobot: {soal.bobot}</span>
                          </div>
                          <span style={{ color: '#1e293b', fontWeight: 500 }}>
                            {soal.pertanyaan?.substring(0, 110)}{soal.pertanyaan?.length > 110 ? '...' : ''}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e0dfdc' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || selectedSoal.length === 0}
                  style={{ background: '#0a66c2' }}
                >
                  {saving ? 'Menyimpan...' : editingUjian ? `Simpan Perubahan (${selectedSoal.length} Soal)` : `Buat Ujian (${selectedSoal.length} Soal)`}
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
        title="Batas Kuota Ujian Demo"
        message={upgradeMsg}
      />
    </div>
  );
}
