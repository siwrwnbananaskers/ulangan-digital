'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';

const TIPE_SOAL = [
  { value: 'pg', label: 'Pilihan Ganda' },
  { value: 'isian', label: 'Isian Singkat' },
  { value: 'benar_salah', label: 'Benar/Salah' },
  { value: 'uraian', label: 'Uraian' },
];

export default function BankSoal() {
  const { user, loading: authLoading, logout, authFetch } = useAuth('guru');
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSoal, setEditingSoal] = useState(null);
  const [filterMapel, setFilterMapel] = useState('');
  const [filterTipe, setFilterTipe] = useState('');
  const [alert, setAlert] = useState(null);

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
    if (!confirm('Hapus soal ini?')) return;
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
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h1>Bank Soal</h1>
            <p>Kelola koleksi soal untuk ujian Anda</p>
          </div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tambah Soal
          </button>
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
            <div className="empty-state">
              <h3>Belum ada soal</h3>
              <p>Mulai tambahkan soal ke bank soal Anda</p>
              <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>Tambah Soal Pertama</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {soalList.map((soal, idx) => (
                <div key={soal.id} className="card" style={{ padding: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary">{soal.mata_pelajaran}</span>
                        <span className="badge badge-gray">
                          {TIPE_SOAL.find(t => t.value === soal.tipe)?.label || soal.tipe}
                        </span>
                        <span className="badge badge-info">Bobot: {soal.bobot}</span>
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
    </div>
  );
}
