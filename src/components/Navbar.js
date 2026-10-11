'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar({ user, onLogout, role }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const guruLinks = [
    {
      href: '/guru/dashboard',
      label: 'Beranda',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      href: '/guru/bank-soal',
      label: 'Bank Soal',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
        </svg>
      ),
    },
    {
      href: '/guru/ujian',
      label: 'Ujian',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
        </svg>
      ),
    },
    {
      href: '/guru/siswa',
      label: 'Siswa',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ),
    },
    {
      href: '/guru/hasil',
      label: 'Hasil',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
        </svg>
      ),
    },
    {
      href: '/guru/audit',
      label: 'Integritas',
      badge: 'Audit',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
        </svg>
      ),
    },
  ];

  const siswaLinks = [
    {
      href: '/siswa/dashboard',
      label: 'Beranda',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      href: '/siswa/hasil',
      label: 'Nilai Saya',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
        </svg>
      ),
    },
  ];

  const links = role === 'guru' ? guruLinks : siswaLinks;

  return (
    <>
      <header className="linkedin-header">
        <div className="linkedin-header-inner">
          {/* Logo & Search Bar */}
          <div className="linkedin-brand-section">
            <a href={role === 'guru' ? '/guru/dashboard' : '/siswa/dashboard'} className="linkedin-logo">
              <div className="linkedin-logo-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
              </div>
              <span className="linkedin-brand-name">Ulangan Digital</span>
            </a>

            <div className="linkedin-search-container">
              <svg className="linkedin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="linkedin-search-input"
                placeholder={role === 'guru' ? "Cari soal, ujian, peserta..." : "Cari kode ujian..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Center Navigation Icons (LinkedIn style: icon on top, text on bottom) */}
          <nav className="linkedin-nav-links">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`linkedin-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="linkedin-nav-icon-wrapper">
                    {link.icon}
                    {link.badge && <span className="linkedin-nav-dot" />}
                  </div>
                  <span className="linkedin-nav-label">{link.label}</span>
                </a>
              );
            })}
          </nav>

          {/* User Profile & Logout section on the Right */}
          <div className="linkedin-right-section">
            <div className="linkedin-user-profile">
              <div className="linkedin-avatar">
                {user?.nama?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="linkedin-user-text">
                <span className="linkedin-user-name">
                  {user?.nama ? user.nama.split(',')[0].split(' ')[0] : 'Akun'}
                </span>
                <span className="linkedin-user-role-badge">
                  {role === 'guru' ? 'Guru' : 'Siswa'}
                </span>
              </div>
            </div>

            <div className="linkedin-divider" />

            <button
              onClick={onLogout}
              className="linkedin-logout-btn"
              title="Keluar / Logout"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="linkedin-logout-text">Keluar</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              className="linkedin-mobile-trigger"
              onClick={() => setMobileOpen(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer">
          <div className="mobile-drawer-overlay" onClick={() => setMobileOpen(false)} />
          <div className="mobile-drawer-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="linkedin-avatar">
                  {user?.nama?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <strong style={{ fontSize: 14 }}>{user?.nama}</strong>
                  <span className="badge badge-primary" style={{ display: 'block', fontSize: 10, width: 'fit-content' }}>
                    {role === 'guru' ? 'Guru Pengawas' : 'Siswa'}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${pathname === link.href ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                  style={{ padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <div style={{ width: 22, height: 22 }}>{link.icon}</div>
                  <span>{link.label}</span>
                </a>
              ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--gray-200)' }}>
              <button className="btn btn-danger btn-block" onClick={onLogout}>
                Keluar / Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
