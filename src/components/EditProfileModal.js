'use client';

import { useState, useRef } from 'react';

export default function EditProfileModal({ user, onClose, onUpdate }) {
  const [nama, setNama] = useState(user?.nama || '');
  const [fotoProfil, setFotoProfil] = useState(user?.foto_profil || '');
  const [tandaTangan, setTandaTangan] = useState(user?.tanda_tangan || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);
  const ttdInputRef = useRef(null);

  // Compress & crop avatar image to lightweight 256x256 data URI
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Pilih file gambar yang valid (JPG, PNG, atau WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Ukuran file terlalu besar (maksimal 8MB).');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        const targetSize = 256;
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        // Center crop square
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;

        ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setFotoProfil(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Process signature image: auto scale to crisp transparent/clean PNG data URI
  const handleTtdChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Pilih file gambar tanda tangan yang valid (PNG, JPG, atau WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Ukuran berkas tanda tangan terlalu besar (maksimal 8MB).');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        const maxW = 480;
        const maxH = 240;

        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/png');
        setTandaTangan(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nama.trim()) {
      setErrorMsg('Nama lengkap tidak boleh kosong');
      return;
    }

    if (user?.role === 'superadmin' && newPassword) {
      if (newPassword.length < 5) {
        setErrorMsg('Password baru superadmin minimal 5 karakter');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Konfirmasi password baru tidak cocok');
        return;
      }
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          nama: nama.trim(),
          foto_profil: fotoProfil || null,
          tanda_tangan: tandaTangan || null,
          ...(user?.role === 'superadmin' && newPassword ? { password: newPassword.trim() } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan perubahan profil');
        setSaving(false);
        return;
      }

      // Update storage and global events
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        window.dispatchEvent(new CustomEvent('user-profile-updated', { detail: data.user }));
        if (onUpdate) {
          onUpdate(data.user);
        }
      }

      setSuccessMsg('Profil berhasil diperbarui dan disinkronkan ke database!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan saat menyimpan.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, padding: '24px 28px' }}>
        <div className="modal-header" style={{ marginBottom: 18 }}>
          <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 700, color: '#191919' }}>
            Edit Profil Akun
          </h2>
          <button className="modal-close" onClick={onClose} title="Tutup">✕</button>
        </div>

        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: 14, fontSize: 13, padding: '8px 12px' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: 14, fontSize: 13, padding: '8px 12px' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Avatar Photo Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 90, height: 90, marginBottom: 10 }}>
              {fotoProfil ? (
                <img
                  src={fotoProfil}
                  alt={nama}
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #0a66c2',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: '50%',
                    background: '#0a66c2',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 34,
                    fontWeight: 700,
                    border: '3px solid #ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  {nama?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}

              {/* Upload Camera Badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Pilih Foto"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#0a66c2',
                  border: '2px solid #ffffff',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6 }}
              >
                {fotoProfil ? 'Ganti Foto' : 'Unggah Foto'}
              </button>
              {fotoProfil && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFotoProfil('')}
                  style={{ fontSize: 12, padding: '4px 10px', color: '#dc2626' }}
                >
                  Hapus Foto
                </button>
              )}
            </div>
            <p style={{ fontSize: 11, color: '#666666', marginTop: 4, margin: '4px 0 0' }}>
              Format JPG, PNG, atau WEBP. Foto otomatis disinkronkan ke database.
            </p>
          </div>

          {/* Form Fields */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Nama Lengkap & Gelar *
            </label>
            <input
              type="text"
              className="form-input"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="cth: Super Admin Wozber (Owner)"
              required
              style={{ fontSize: 14, padding: '9px 12px' }}
            />
            <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 4 }}>
              Nama ini akan ditampilkan pada dashboard, lembar soal, dan log pengawas.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              Username Login (ID)
            </label>
            <input
              type="text"
              className="form-input"
              value={user?.username || ''}
              disabled
              style={{ fontSize: 13, padding: '8px 12px', background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
            />
          </div>

          {/* Tanda Tangan Digital Guru Section (Khusus Guru & Superadmin) */}
          {user?.role !== 'siswa' && (
            <div
              style={{
                marginBottom: 20,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 10,
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      margin: 0,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                    Tanda Tangan Digital Guru
                  </label>
                  <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 2 }}>
                    Otomatis dicantumkan pada Kartu Login Siswa, Cetak Lembar Hasil Siswa, dan Leger Nilai.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => ttdInputRef.current?.click()}
                    style={{ fontSize: 11.5, padding: '4px 10px', borderRadius: 6 }}
                  >
                    {tandaTangan ? 'Ganti TTD' : 'Unggah TTD'}
                  </button>
                  {tandaTangan && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setTandaTangan('')}
                      style={{ fontSize: 11.5, padding: '4px 8px', color: '#dc2626' }}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <input
                type="file"
                ref={ttdInputRef}
                accept="image/png,image/jpeg,image/webp"
                onChange={handleTtdChange}
                style={{ display: 'none' }}
              />

              {/* TTD Preview Container */}
              <div
                onClick={() => ttdInputRef.current?.click()}
                style={{
                  width: '100%',
                  minHeight: 74,
                  maxHeight: 110,
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 6,
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 8,
                  transition: 'all 0.2s',
                }}
                title="Klik untuk memilih file tanda tangan (format PNG transparan disarankan)"
              >
                {tandaTangan ? (
                  <img
                    src={tandaTangan}
                    alt="Tanda Tangan Guru"
                    style={{ maxHeight: 70, maxWidth: '90%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#64748b' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 4px', display: 'block' }}>
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      <path d="M2 22h20" />
                    </svg>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: '#334155' }}>Klik untuk Unggah Foto/Scan Tanda Tangan</div>
                    <div style={{ fontSize: 10, marginTop: 2, color: '#94a3b8' }}>Format PNG (latar transparan/putih), JPG atau WEBP</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Khusus Akun Superadmin: Ganti Password Mandiri */}
          {user?.role === 'superadmin' && (
            <div
              style={{
                marginBottom: 20,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    margin: 0,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0a66c2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Ganti Password Superadmin
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0a66c2',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat Karakter'}
                </button>
              </div>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 10 }}>
                Kosongkan jika Anda tidak ingin mengubah password akun Superadmin.
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                    Password Baru
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru (minimal 5 karakter)..."
                    style={{ fontSize: 13, padding: '8px 12px' }}
                  />
                </div>
                {newPassword.length > 0 && (
                  <div>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                      Konfirmasi Password Baru
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru..."
                      style={{ fontSize: 13, padding: '8px 12px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
              style={{ padding: '8px 16px', fontSize: 13, borderRadius: 6 }}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ background: '#0a66c2', padding: '8px 22px', fontSize: 13, fontWeight: 600, borderRadius: 6 }}
            >
              {saving ? 'Menyimpan ke Database...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
