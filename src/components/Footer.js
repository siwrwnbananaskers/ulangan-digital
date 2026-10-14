'use client';

import { usePathname } from 'next/navigation';

export default function Footer({ className = '', style = {} }) {
  const pathname = usePathname();

  // On login page ('/'), footer text is integrated directly inside login-card
  if (pathname === '/') {
    return null;
  }

  return (
    <footer
      className={`app-site-footer ${className}`}
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '28px 24px',
        minHeight: '76px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontSize: '13px',
        color: '#1e293b',
        marginTop: 'auto',
        boxSizing: 'border-box',
        zIndex: 10,
        ...style,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          lineHeight: 1.6,
          color: '#1e293b',
          fontWeight: 500,
        }}
      >
        <span>© 2026 Digitalised by</span>
        <a
          href="https://about-wrwn.site/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#ea580c',
            fontWeight: 700,
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            textDecorationColor: '#ea580c',
            textDecorationThickness: '1.5px',
            transition: 'opacity 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          WiraWebSolusi
        </a>
      </div>
    </footer>
  );
}
