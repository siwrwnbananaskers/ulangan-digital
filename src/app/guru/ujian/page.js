'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';

export default function UjianPage() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [ujianList, setUjianList] = useState([]);
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSoal, setSelectedSoal] = useState([]);
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('semua');

  const [form, setForm] = useState({
    judul: '',
    mata_pelajaran: '',
    kelas_target: '',
    deskripsi: '',
    durasi_menit: 60,
    jadwal_mulai: '',
    jadwal_selesai: '',
    kkm: 75,
    acak_soal: false,
    acak_jawaban: false,
    tampilkan_nilai: false,
    batas_pelanggaran: 3,
    status: 'draft',
  });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [ujianRes, soalRes] = await Promise.all([
        authFetch('/api/ujian'),
        authFetch('/api/soal'),
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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (selectedSoal.length === 0) {
      setAlert({ type: 'danger', message: 'Pilih minimal 1 soal' });
      return;
    }

    try {
      const res = await authFetch('/api/ujian', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          soal_ids: selectedSoal,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAlert({ type: 'danger', message: data.error });
        return;
      }

      setAlert({ type: 'success', message: `Ujian berhasil dibuat! Kode: ${data.kode_ujian}` });
      setShowModal(false);
      setSelectedSoal([]);
      loadData();
    } catch {
      setAlert({ type: 'danger', message: 'Gagal membuat ujian' });
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

  const toggleSoal = (soalId) => {
    setSelectedSoal(prev =>
      prev.includes(soalId)
        ? prev.filter(id => id !== soalId)
        : [...prev, soalId]
    );
  };

  const getFilteredUjian = () => {
    if (activeTab === 'semua') return ujianList;
    return ujianList.filter(u => u.status === activeTab);
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
    <div className="app-container">
      <Navbar user={user} onLogout={logout} role="guru" />

      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h1>Manajemen Ujian</h1>
            <p>Buat dan kelola ujian untuk siswa</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Buat Ujian Baru
          </button>
        </div>

        {alert && (
          <div className={`alert alert-${alert.type}`}>
            {alert.message}
            <button className="btn btn-ghost btn-sm" onClick={() => setAlert(null)} style={{ marginLeft: 'auto' }}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: 'semua', label: 'Semua' },
            { key: 'draft', label: 'Draft' },
            { key: 'aktif', label: 'Aktif' },
            { key: 'selesai', label: 'Selesai' },
          ].map(tab => (
            <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ujian List */}
        {loading ? (
          <div className="loading-page"><div className="spinner" /></div>
        ) : getFilteredUjian().length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <h3>Belum ada ujian</h3>
              <p>Buat ujian pertama Anda</p>
            </div>
          </div>
        ) : (
          <div className="card-grid">
            {getFilteredUjian().map(ujian => (
              <div key={ujian.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--gray-900)' }}>{ujian.judul}</h3>
                    <p className="text-sm text-muted">{ujian.mata_pelajaran} — {ujian.kelas_target}</p>
                  </div>
                  <span className={`badge ${
                    ujian.status === 'aktif' ? 'badge-success' :
                    ujian.status === 'selesai' ? 'badge-gray' : 'badge-warning'
                  }`}>
                    {ujian.status === 'aktif' ? 'Aktif' : ujian.status === 'selesai' ? 'Selesai' : 'Draft'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--gray-600)', marginBottom: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <strong style={{ minWidth: 80 }}>Kode:</strong>
                    <code style={{ background: 'var(--primary-50)', color: 'var(--primary-700)', padding: '2px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 'var(--font-size-md)', letterSpacing: '0.1em' }}>
                      {ujian.kode_ujian}
                    </code>
                  </div>
                  <div>
                    <strong style={{ minWidth: 80, display: 'inline-block' }}>Durasi:</strong>
                    {ujian.durasi_menit} menit | {ujian.jumlah_soal} soal
                  </div>
                  <div>
                    <strong style={{ minWidth: 80, display: 'inline-block' }}>Jadwal:</strong>
                    {formatDate(ujian.jadwal_mulai)}
                  </div>
                  <div>
                    <strong style={{ minWidth: 80, display: 'inline-block' }}>KKM:</strong>
                    {ujian.kkm} | Batas pelanggaran: {ujian.batas_pelanggaran}x
                  </div>
                  <div>
                    <strong style={{ minWidth: 80, display: 'inline-block' }}>Peserta:</strong>
                    {ujian.peserta_selesai || 0} selesai / {ujian.total_peserta || 0} total
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  {ujian.status === 'draft' && (
                    <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(ujian.id, 'aktif')}>
                      Aktifkan
                    </button>
                  )}
                  {ujian.status === 'aktif' && (
                    <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange(ujian.id, 'selesai')}>
                      Akhiri
                    </button>
                  )}
                  <a href={`/guru/hasil?ujian_id=${ujian.id}`} className="btn btn-secondary btn-sm">
                    Hasil
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Exam Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg" style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">Buat Ujian Baru</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Judul Ujian *</label>
                  <input className="form-input" value={form.judul} onChange={(e) => setForm({...form, judul: e.target.value})} placeholder="cth: UTS Matematika XII" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mata Pelajaran *</label>
                  <input className="form-input" value={form.mata_pelajaran} onChange={(e) => setForm({...form, mata_pelajaran: e.target.value})} placeholder="cth: Matematika" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Kelas Target *</label>
                  <input className="form-input" value={form.kelas_target} onChange={(e) => setForm({...form, kelas_target: e.target.value})} placeholder="cth: XII-IPA-1" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Durasi (menit) *</label>
                  <input type="number" className="form-input" value={form.durasi_menit} onChange={(e) => setForm({...form, durasi_menit: parseInt(e.target.value)})} min="5" max="300" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jadwal Mulai *</label>
                  <input type="datetime-local" className="form-input" value={form.jadwal_mulai} onChange={(e) => setForm({...form, jadwal_mulai: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Jadwal Selesai *</label>
                  <input type="datetime-local" className="form-input" value={form.jadwal_selesai} onChange={(e) => setForm({...form, jadwal_selesai: e.target.value})} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi / Instruksi</label>
                <textarea className="form-textarea" value={form.deskripsi} onChange={(e) => setForm({...form, deskripsi: e.target.value})} placeholder="Instruksi tambahan untuk siswa..." />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">KKM</label>
                  <input type="number" className="form-input" value={form.kkm} onChange={(e) => setForm({...form, kkm: parseInt(e.target.value)})} min="0" max="100" />
                </div>
                <div className="form-group">
                  <label className="form-label">Batas Pelanggaran</label>
                  <input type="number" className="form-input" value={form.batas_pelanggaran} onChange={(e) => setForm({...form, batas_pelanggaran: parseInt(e.target.value)})} min="1" max="10" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status Awal</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                    <option value="draft">Draft</option>
                    <option value="aktif">Langsung Aktif</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
                <label className="form-checkbox">
                  <input type="checkbox" checked={form.acak_soal} onChange={(e) => setForm({...form, acak_soal: e.target.checked})} />
                  Acak urutan soal
                </label>
                <label className="form-checkbox">
                  <input type="checkbox" checked={form.tampilkan_nilai} onChange={(e) => setForm({...form, tampilkan_nilai: e.target.checked})} />
                  Tampilkan nilai ke siswa
                </label>
              </div>

              {/* Question Selection */}
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <label className="form-label">Pilih Soal * ({selectedSoal.length} dipilih)</label>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-sm)' }}>
                  {soalList.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                      <p>Belum ada soal. <a href="/guru/bank-soal">Tambah soal dulu</a></p>
                    </div>
                  ) : (
                    soalList.map(soal => (
                      <label key={soal.id} className="form-checkbox" style={{ padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--gray-50)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedSoal.includes(soal.id)}
                          onChange={() => toggleSoal(soal.id)}
                        />
                        <div>
                          <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 2 }}>
                            <span className="badge badge-gray" style={{ fontSize: 10 }}>{soal.tipe.toUpperCase()}</span>
                            <span className="badge badge-primary" style={{ fontSize: 10 }}>{soal.mata_pelajaran}</span>
                          </div>
                          <span style={{ fontSize: 'var(--font-size-sm)' }}>{soal.pertanyaan.substring(0, 100)}{soal.pertanyaan.length > 100 ? '...' : ''}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={selectedSoal.length === 0}>
                  Buat Ujian ({selectedSoal.length} soal)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
