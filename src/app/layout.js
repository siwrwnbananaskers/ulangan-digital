import './globals.css';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'DigiAsesmen - Platform Ujian & Asesmen Digital Modern',
  description: 'Platform ujian dan asesmen digital yang tertib, modern, dan mudah digunakan untuk guru dan siswa di Indonesia.',
  keywords: 'DigiAsesmen, asesmen digital, ujian online, CBT, guru, siswa, Indonesia',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a66c2" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><rect width='32' height='32' rx='8' fill='%230a66c2'/><rect x='5' y='5' width='22' height='15' rx='3' stroke='%23ffffff' stroke-width='2'/><line x1='10' y1='25' x2='22' y2='25' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'/><line x1='16' y1='20' x2='16' y2='25' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'/><polyline points='10 12 14 16 22 8' stroke='%23ffffff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/></svg>"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="app-root">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
