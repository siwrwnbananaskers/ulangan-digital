'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      padding: '2rem',
      fontFamily: 'sans-serif'
    }}>
      <div style={{
        maxWidth: 520,
        width: '100%',
        background: '#ffffff',
        borderRadius: 12,
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#fee2e2',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: 28
        }}>
          ⚠️
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
          Terjadi Kendala Membuka Halaman
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Sistem mendeteksi kendala pada tampilan antarmuka. Silakan klik tombol di bawah untuk memuat ulang lembar ujian.
        </p>

        {error?.message && (
          <div style={{
            background: '#f1f5f9',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            marginBottom: '1.5rem',
            textAlign: 'left',
            fontSize: '0.75rem',
            color: '#475569',
            wordBreak: 'break-word',
            fontFamily: 'monospace'
          }}>
            {error.message}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset ? reset() : window.location.reload()}
            style={{
              background: '#0a66c2',
              color: '#ffffff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Muat Ulang Halaman
          </button>
          <a
            href="/siswa/dashboard"
            style={{
              display: 'inline-block',
              background: '#e2e8f0',
              color: '#334155',
              textDecoration: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: '0.875rem'
            }}
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
