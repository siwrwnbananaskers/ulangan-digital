'use client';

export default function UpgradeModal({ isOpen, onClose, title, message }) {
  if (!isOpen) return null;

  const waNumber = '082175693537';
  const waUrl = `https://wa.me/6282175693537?text=${encodeURIComponent(
    'Halo Mas Wozber Wirawan, saya tertarik berlangganan & pasang aplikasi Ulangan Digital (CBT Kiosk Mode) full fitur tanpa batas untuk sekolah kami.'
  )}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 460,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'fadeInUp 0.2s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)',
            color: '#ffffff',
            padding: '24px 20px',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h2 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {title || 'Batas Kuota Akun Demo'}
          </h2>
          <p style={{ fontSize: 13, margin: 0, opacity: 0.9 }}>
            Akses Full Unlimited & Server Terkelola
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '22px 24px' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 16,
              fontSize: 13,
              color: '#334155',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: 4 }}>
              Informasi Versi Demo:
            </strong>
            {message || (
              <span>
                Akun demo ini disediakan khusus untuk uji coba fitur (maksimal <strong>1 ujian</strong> dan <strong>1 siswa</strong>).
              </span>
            )}
          </div>

          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
            Ingin menggunakan sistem ujian ini untuk sekolah Anda secara penuh tanpa batasan ujian, siswa, dan butir soal? Dapatkan lisensi & instalasi resmi:
          </p>

          <ul style={{ fontSize: 12, color: '#334155', paddingLeft: 18, margin: '0 0 20px', lineHeight: 1.6 }}>
            <li>Unlimited Guru, Siswa, & Bank Soal</li>
            <li>Kiosk & Anti-Cheat Mode Aktif Sepenuhnya</li>
            <li>Cetak Kartu Ujian & Rekap Nilai Otomatis</li>
            <li>Bisa Custom Domain Sekolah (contoh: <em>cbt.sekolah.sch.id</em>)</li>
          </ul>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-block"
              style={{
                background: '#25D366',
                borderColor: '#25D366',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 14,
                padding: '12px 16px',
                borderRadius: 8,
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.41a8.17 8.17 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.19-.09-1.1-.54-1.27-.6-.17-.06-.3-.09-.43.1-.13.19-.5.6-.61.73-.11.13-.23.15-.42.06-.19-.09-.82-.3-1.57-.96-.58-.52-.97-1.16-1.08-1.35-.11-.19-.01-.3.08-.39.08-.09.19-.23.28-.35.09-.12.13-.2.19-.34.06-.13.03-.25-.01-.35-.05-.09-.43-1.04-.59-1.43-.16-.38-.32-.33-.43-.33h-.37c-.13 0-.34.05-.51.24-.18.19-.68.66-.68 1.62s.7 1.88.79 2.01c.1.13 1.37 2.09 3.32 2.93.46.2.82.32 1.11.41.47.15.89.13 1.23.08.38-.06 1.1-.45 1.25-.88.16-.43.16-.8.11-.88-.04-.08-.17-.13-.36-.22z" />
              </svg>
              <span>Hubungi WA ({waNumber}) untuk Berlangganan</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-block"
              style={{ fontSize: 13, color: '#64748b', padding: '8px 12px' }}
            >
              Tutup & Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
