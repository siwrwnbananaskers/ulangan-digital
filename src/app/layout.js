import './globals.css';

export const metadata = {
  title: 'Ulangan Digital - Platform Asesmen Digital Modern',
  description: 'Platform ulangan dan asesmen digital yang aman, modern, dan mudah digunakan untuk guru dan siswa di Indonesia.',
  keywords: 'ulangan digital, asesmen, ujian online, CBT, guru, siswa, Indonesia',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>" />
      </head>
      <body>
        <div id="app-root">
          {children}
        </div>
      </body>
    </html>
  );
}
