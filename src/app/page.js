'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      if (data.user.role === 'guru') {
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
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h1>Ulangan Digital</h1>
          <p>Platform Asesmen Digital Modern</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
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
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            disabled={loading || !username || !password}
            id="login-btn"
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                Memproses...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Masuk
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center' }}>
          <p className="text-xs text-muted">
            Demo: guru / guru123 (Guru) — siswa1 / guru123 (Siswa)
          </p>
        </div>

        <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--gray-100)' }}>
          <p className="text-xs text-muted">
            © 2026 Ulangan Digital. Platform Asesmen yang Aman & Modern.
          </p>
        </div>
      </div>
    </div>
  );
}
