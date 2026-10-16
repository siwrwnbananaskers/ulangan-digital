'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login gagal');
        setLoading(false);
        return;
      }

      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === 'superadmin') {
        router.push('/superadmin/dashboard');
      } else if (data.user.role === 'guru') {
        router.push('/guru/dashboard');
      } else {
        router.push('/siswa/dashboard');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi. Silakan coba lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="3" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <polyline points="7.5 10 10.5 13 16.5 7" />
            </svg>
          </div>
          <h1>Digi<span style={{ color: '#0a66c2' }}>Asesmen</span></h1>
          <p>Platform Ujian &amp; Asesmen Digital Sekolah</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" htmlFor="username" style={{ fontSize: 12, marginBottom: 4 }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              className="form-input"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              autoFocus
              style={{ padding: '8px 12px', fontSize: 14 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" htmlFor="password" style={{ fontSize: 12, marginBottom: 4 }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ padding: '8px 40px 8px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  transition: 'color 150ms ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#0a66c2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !username || !password}
            id="login-btn"
            style={{ padding: '10px 16px', borderRadius: 8, background: '#0a66c2', fontWeight: 600, fontSize: 14 }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span>Memproses...</span>
              </>
            ) : (
              'Masuk ke Akun'
            )}
          </button>
        </form>

        <div style={{ marginTop: 14, padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
            Demo: <strong>guru</strong> / <strong>guru123</strong> • <strong>siswa1</strong> / <strong>guru123</strong>
          </p>
        </div>

        <div className="login-card-footer">
          <span>© 2026 Digitalised by</span>
          <a
            href="https://about-wrwn.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="login-card-footer-link"
          >
            WiraWebSolusi
          </a>
        </div>
      </div>
    </div>
  );
}
