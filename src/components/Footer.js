'use client';

export default function Footer({ className = '', style = {} }) {
  return (
    <footer
      className={`app-site-footer ${className}`}
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        padding: '13px 16px',
        textAlign: 'center',
        fontSize: '12px',
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
          gap: '5px',
          flexWrap: 'wrap',
          lineHeight: 1.5,
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
