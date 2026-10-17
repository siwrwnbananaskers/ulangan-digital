import * as XLSX from 'xlsx-js-style';

/**
 * Builds the official Excel template for bulk questions import.
 * Styled with an understated, professional monochrome theme (no colorful emojis).
 */
export function buildSoalTemplateWorkbook() {
  const wb = XLSX.utils.book_new();

  // 1. Data Soal Sheet
  const headers = [
    'No',
    'Mata Pelajaran',
    'Tipe Soal',
    'Pertanyaan',
    'Gambar Soal (Opsional)',
    'Pilihan A',
    'Pilihan B',
    'Pilihan C',
    'Pilihan D',
    'Pilihan E',
    'Kunci Jawaban',
    'Bobot',
  ];

  const sampleRows = [
    [
      1,
      'Informatika',
      'Pilihan Ganda',
      'Perhatikan gambar komponen komputer di atas! Komponen perangkat keras tersebut bertindak sebagai unit pengendali dan pemroses instruksi utama sistem komputer, yaitu...',
      '[Sisipkan / Upload Gambar di Sini]',
      'RAM (Random Access Memory)',
      'CPU (Central Processing Unit)',
      'Hard Disk Drive (HDD)',
      'Power Supply Unit (PSU)',
      'Keyboard Mekanikal',
      'B',
      1,
    ],
    [
      2,
      'Informatika',
      'Pilihan Ganda',
      'Manakah dari pilihan sistem operasi di bawah ini yang dikembangkan secara open source dan bebas didistribusikan?',
      '',
      'Microsoft Windows 11',
      'Apple macOS Sonoma',
      'Linux Ubuntu',
      'Apple iOS',
      '',
      'C',
      1,
    ],
    [
      3,
      'Informatika',
      'Benar/Salah',
      'Memori utama komputer (RAM) bersifat volatile, yang artinya seluruh data di dalamnya akan terhapus seketika saat catu daya listrik terputus.',
      '',
      '',
      '',
      '',
      '',
      '',
      'Benar',
      1,
    ],
    [
      4,
      'Informatika',
      'Isian Singkat',
      'Protokol standar internet yang digunakan untuk mentransfer dokumen web berbasis hiperteks secara aman dan terenkripsi adalah...',
      '',
      '',
      '',
      '',
      '',
      '',
      'HTTPS',
      2,
    ],
    [
      5,
      'Informatika',
      'Uraian',
      'Jelaskan fungsi penting firewall dalam melindungi keamanan jaringan lokal komputer dari ancaman lalu lintas luar!',
      '',
      '',
      '',
      '',
      '',
      '',
      'Memfilter dan membatasi paket lalu lintas jaringan yang masuk dan keluar berdasarkan aturan kebijakan keamanan yang telah ditentukan.',
      5,
    ],
  ];

  const wsData = [headers, ...sampleRows];
  const wsSoal = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  wsSoal['!cols'] = [
    { wch: 6 },  // No
    { wch: 20 }, // Mata Pelajaran
    { wch: 18 }, // Tipe Soal
    { wch: 52 }, // Pertanyaan
    { wch: 32 }, // Link / URL Gambar (Opsional)
    { wch: 28 }, // Pilihan A
    { wch: 28 }, // Pilihan B
    { wch: 26 }, // Pilihan C
    { wch: 26 }, // Pilihan D
    { wch: 22 }, // Pilihan E
    { wch: 18 }, // Kunci Jawaban
    { wch: 10 }, // Bobot
  ];

  // Row heights
  const rowsHeights = [{ hpt: 28 }];
  for (let i = 0; i < sampleRows.length; i++) {
    rowsHeights.push({ hpt: 26 });
  }
  wsSoal['!rows'] = rowsHeights;
  wsSoal['!views'] = [{ showGridLines: true }];

  // Styling Header and Data Cells
  const headerStyle = {
    fill: { fgColor: { rgb: '0F172A' } }, // Slate 900
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Segoe UI' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '0F172A' } },
      bottom: { style: 'thin', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: '334155' } },
      right: { style: 'thin', color: { rgb: '334155' } },
    },
  };

  const centerColIdxs = [0, 2, 10, 11]; // No, Tipe Soal, Kunci, Bobot

  // Apply styles to Sheet 1
  for (let c = 0; c < headers.length; c++) {
    const colLetter = XLSX.utils.encode_col(c);
    const headerCell = wsSoal[`${colLetter}1`];
    if (headerCell) {
      headerCell.s = headerStyle;
    }

    for (let r = 2; r <= sampleRows.length + 1; r++) {
      const cellRef = `${colLetter}${r}`;
      const cell = wsSoal[cellRef];
      if (cell) {
        const isCenter = centerColIdxs.includes(c);
        cell.s = {
          font: { sz: 10, name: 'Segoe UI' },
          alignment: {
            horizontal: isCenter ? 'center' : 'left',
            vertical: 'center',
            wrapText: true,
          },
          border: {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
            left: { style: 'thin', color: { rgb: 'CBD5E1' } },
            right: { style: 'thin', color: { rgb: 'CBD5E1' } },
          },
        };
      }
    }
  }

  // 2. Petunjuk Pengisian Sheet
  const guideData = [
    ['PANDUAN & PETUNJUK FORMAT IMPORT SOAL MASAL', '', ''],
    ['Sistem Asesmen & Ujian Ulangan Digital', '', ''],
    ['', '', ''],
    ['Nama Kolom', 'Keterangan & Format Nilai', 'Contoh Isian'],
    [
      'Mata Pelajaran',
      'Nama mata pelajaran (misal: Informatika, Matematika, IPA). Jika pada baris tertentu dikosongkan, sistem akan otomatis menggunakan "Mata Pelajaran Default" yang ditentukan pada form upload.',
      'Informatika',
    ],
    [
      'Tipe Soal',
      'Pilih salah satu dari tipe yang didukung:\n- Pilihan Ganda (atau singkatan: PG)\n- Benar/Salah (atau singkatan: B/S)\n- Isian Singkat (atau singkatan: Isian)\n- Uraian (atau singkatan: Esai)',
      'Pilihan Ganda',
    ],
    [
      'Pertanyaan',
      'Teks isi butir soal. Tulis pertanyaan secara jelas dan terstruktur tanpa tanda petik pembuka yang merusak formula.',
      'Komponen komputer yang berfungsi...',
    ],
    [
      'Gambar Soal (Opsional)',
      'Sisipkan/upload langsung file gambar (format .png, .jpg, .jpeg, .webp) ke dalam baris/sel kolom ini di Excel menggunakan menu "Insert > Pictures" (Sisipkan Gambar), atau tempelkan/paste gambar langsung pada baris butir soal.',
      'Sisipkan file gambar langsung ke sel Excel',
    ],
    [
      'Pilihan A s/d E',
      'Khusus untuk tipe soal Pilihan Ganda:\n- Pilihan A dan B wajib diisi.\n- Pilihan C, D, dan E bersifat opsional (dapat dikosongkan jika opsi hanya sampai 3 atau 4 pilihan).\n- Untuk tipe Benar/Salah, Isian Singkat, dan Uraian, biarkan kolom pilihan ini kosong.',
      'Pilihan A: CPU\nPilihan B: RAM',
    ],
    [
      'Kunci Jawaban',
      'Aturan penulisan kunci jawaban sesuai tipe soal:\n- Pilihan Ganda: Cukup tulis huruf opsi (A, B, C, D, atau E)\n- Benar/Salah: Tulis kata "Benar" atau "Salah"\n- Isian Singkat: Tulis teks jawaban tepat yang menjadi acuan\n- Uraian: Tulis panduan jawaban untuk koreksi guru, atau kosongkan',
      'A',
    ],
    [
      'Bobot',
      'Nilai angka bobot butir soal (misal: 1, 2, 5, 10). Jika kolom ini dikosongkan, sistem otomatis memberikan bobot default = 1.',
      '1',
    ],
    ['', '', ''],
    ['KETENTUAN PENTING SEBELUM MENGUNGGAH', '', ''],
    ['1. Pastikan nama header kolom di baris 1 sheet "Template Soal" tidak diubah atau dihapus.', '', ''],
    ['2. Anda dapat menghapus atau menimpa contoh soal (baris 2 sampai 6) dengan butir soal asli Anda.', '', ''],
    ['3. Simpan file dalam format .xlsx (Excel Workbook) atau .xls sebelum diunggah.', '', ''],
    ['4. Sistem akan otomatis memvalidasi setiap butir soal sebelum disimpan ke database.', '', ''],
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 18 }, { wch: 65 }, { wch: 32 }];
  wsGuide['!views'] = [{ showGridLines: true }];

  // Style guide title
  if (wsGuide['A1']) {
    wsGuide['A1'].s = {
      font: { bold: true, sz: 13, color: { rgb: '0F172A' }, name: 'Segoe UI' },
    };
  }
  if (wsGuide['A2']) {
    wsGuide['A2'].s = {
      font: { sz: 10, color: { rgb: '64748B' }, name: 'Segoe UI' },
    };
  }

  // Style guide table header
  ['A4', 'B4', 'C4'].forEach((ref) => {
    if (wsGuide[ref]) {
      wsGuide[ref].s = {
        fill: { fgColor: { rgb: '0F172A' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Segoe UI' },
        alignment: { horizontal: 'left', vertical: 'center' },
      };
    }
  });

  XLSX.utils.book_append_sheet(wb, wsSoal, 'Template Soal');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk Pengisian');

  return wb;
}

/**
 * Trigger immediate client-side file download of the template
 */
export function downloadSoalTemplateFile() {
  const wb = buildSoalTemplateWorkbook();
  XLSX.writeFile(wb, 'Template_Import_Soal.xlsx');
}
