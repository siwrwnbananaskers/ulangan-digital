'use client';

export default function UpgradeModal({ isOpen, onClose, title, message }) {
  if (!isOpen) return null;

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
        padding: 14,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 14,
          maxWidth: 390,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25)',
          animation: 'fadeInUp 0.15s ease',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)',
            color: '#ffffff',
            padding: '16px 18px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              border: '1.5px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', letterSpacing: '-0.01em' }}>
            {title || 'Batas Akun Demo'}
          </h2>
          <p style={{ fontSize: 12, margin: 0, opacity: 0.88 }}>
            Upgrade ke Versi Penuh (Full Lisensi)
          </p>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 18px' }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 12,
              fontSize: 12,
              color: '#334155',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: 2 }}>
              Kuota Uji Coba Terpenuhi:
            </strong>
            {message || (
              <span>
                Akun demo dibatasi untuk uji coba. Upgrade untuk membuat ujian, butir soal, dan siswa tanpa batas.
              </span>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#475569', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Keunggulan Versi Penuh:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Ujian, Siswa & Bank Soal Tanpa Batas</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Kiosk Exambro Anti-Curang Penuh</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#057642" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Custom Domain & Server Sekolah</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                fontSize: 13,
                padding: '9px 14px',
                borderRadius: 8,
                textAlign: 'center',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.41a8.17 8.17 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.216 8.216 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.19-.09-1.1-.54-1.27-.6-.17-.06-.3-.09-.43.1-.13.19-.5.6-.61.73-.11.13-.23.15-.42.06-.19-.09-.82-.3-1.57-.96-.58-.52-.97-1.16-1.08-1.35-.11-.19-.01-.3.08-.39.08-.09.19-.23.28-.35.09-.12.13-.2.19-.34.06-.13.03-.25-.01-.35-.05-.09-.43-1.04-.59-1.43-.16-.38-.32-.33-.43-.33h-.37c-.13 0-.34.05-.51.24-.18.19-.68.66-.68 1.62s.7 1.88.79 2.01c.1.13 1.37 2.09 3.32 2.93.46.2.82.32 1.11.41.47.15.89.13 1.23.08.38-.06 1.1-.45 1.25-.88.16-.43.16-.8.11-.88-.04-.08-.17-.13-.36-.22z" />
              </svg>
              <span>Hubungi WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-block"
              style={{ fontSize: 12, color: '#64748b', padding: '6px 10px' }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

