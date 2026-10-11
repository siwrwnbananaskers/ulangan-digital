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
        <meta name="theme-color" content="#0a66c2" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none'><rect width='32' height='32' rx='6' fill='%23191919'/><path d='M10 8h8l5 5v11a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z' stroke='%23ffffff' stroke-width='2' stroke-linejoin='round'/><path d='M18 8v5h5' stroke='%23ffffff' stroke-width='2' stroke-linejoin='round'/><line x1='12' y1='18' x2='20' y2='18' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'/><line x1='12' y1='22' x2='17' y2='22' stroke='%23ffffff' stroke-width='2' stroke-linecap='round'/></svg>"
        />
      </head>
      <body>
        <div id="app-root">
          {children}
        </div>
      </body>
    </html>
  );
}
