'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar({ user, onLogout, role }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const guruLinks = [
    { href: '/guru/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
    { href: '/guru/bank-soal', label: 'Bank Soal', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { href: '/guru/ujian', label: 'Ujian', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/guru/hasil', label: 'Hasil', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { href: '/guru/audit', label: 'Audit Log', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  ];

  const siswaLinks = [
    { href: '/siswa/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
    { href: '/siswa/hasil', label: 'Hasil Ujian', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  const links = role === 'guru' ? guruLinks : siswaLinks;

  const renderLink = (link, onClick) => (
    <a
      key={link.href}
      href={link.href}
      className={`nav-link ${pathname === link.href ? 'active' : ''}`}
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={link.icon} />
      </svg>
      {link.label}
    </a>
  );

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <a href={role === 'guru' ? '/guru/dashboard' : '/siswa/dashboard'} className="navbar-brand">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Ulangan Digital
          </a>

          <div className="navbar-nav" style={{ flex: 1, justifyContent: 'center' }}>
            {links.map(link => renderLink(link))}
          </div>

          <div className="navbar-user">
            <div className="user-badge">
              <div className="user-avatar">
                {user?.nama?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span>{user?.nama || 'User'}</span>
              <span className="badge badge-primary" style={{ marginLeft: 4 }}>
                {role === 'guru' ? 'Guru' : 'Siswa'}
              </span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Logout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>

            {/* Mobile menu button */}
            <button 
              className="mobile-menu-btn" 
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
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer">
          <div className="mobile-drawer-overlay" onClick={() => setMobileOpen(false)} />
          <div className="mobile-drawer-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>Menu</span>
              <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {links.map(link => renderLink(link, () => setMobileOpen(false)))}
            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--gray-200)' }}>
              <button className="btn btn-danger btn-block" onClick={onLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
