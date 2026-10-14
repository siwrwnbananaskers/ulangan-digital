/**
 * Rekap Nilai Siswa Generator (Leger Nilai Raport)
 * Generates:
 * 1. Excel Spreadsheet (.xlsx)
 * 2. High-Resolution Document Canvas Image (.png)
 * 3. Native Printable Document (Print / PDF)
 *
 * Strict Design: Anti-AI slop, zero emojis, humanistic typography, monochrome/slate accents.
 */

import * as XLSX from 'xlsx-js-style';
import { formatWIB } from './utils';

/**
 * Format date string into Indonesian formal format: "14 Oktober 2026"
 */
function getFormalIndonesianDate(d = new Date()) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dateObj = d instanceof Date ? d : new Date(d);
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Export student grade ledger to Excel (.xlsx) with professional accountant formatting
 */
export function exportRekapToExcel({ examDetail, results = [], guruNama = '' }) {
  if (typeof window === 'undefined') return;

  const kkm = Number(examDetail?.kkm) || 75;
  const teacherName = guruNama || examDetail?.guru_nama || 'Guru Pengampu';
  const currentDate = getFormalIndonesianDate();

  // Sort results naturally by absen if available, then by name
  const sorted = [...results].sort((a, b) => {
    const absA = a.no_absen ? Number(a.no_absen) : 9999;
    const absB = b.no_absen ? Number(b.no_absen) : 9999;
    if (absA !== absB) return absA - absB;
    return (a.nama || '').localeCompare(b.nama || '');
  });

  const selesai = sorted.filter((r) => r.status === 'selesai');
  const nilaiArr = selesai.map((r) => Number(r.total_nilai)).filter((n) => !isNaN(n));
  const rataRata = nilaiArr.length > 0 ? (nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length).toFixed(1) : '0';
  const nilaiTertinggi = nilaiArr.length > 0 ? Math.max(...nilaiArr) : 0;
  const nilaiTerendah = nilaiArr.length > 0 ? Math.min(...nilaiArr) : 0;
  const lulusKkm = selesai.filter((r) => Number(r.total_nilai) >= kkm).length;
  const remedial = selesai.filter((r) => Number(r.total_nilai) < kkm).length;
  const persenLulus = selesai.length > 0 ? Math.round((lulusKkm / selesai.length) * 100) : 0;

  // Build rows array for SheetJS
  const rows = [];

  // Row 0 (Excel Row 1): Document Title
  rows.push(['LEGER REKAPITULASI NILAI ASESMEN SISWA']);
  // Row 1 (Excel Row 2): Document Subtitle
  rows.push(['SISTEM ASESMEN ULANGAN DIGITAL • DOKUMEN REKAPITULASI RESMI SEKOLAH']);
  // Row 2 (Excel Row 3): Spacer
  rows.push([]);

  // Row 3 (Excel Row 4): Metadata Row 1
  rows.push([
    'Mata Pelajaran', '', `: ${examDetail?.mata_pelajaran || '-'}`, '', '', '',
    'Standar Kelulusan (KKM)', '', `: ${kkm}`, '', ''
  ]);
  // Row 4 (Excel Row 5): Metadata Row 2
  rows.push([
    'Nama Asesmen / Ujian', '', `: ${examDetail?.judul || '-'}`, '', '', '',
    'Target Rombel / Kelas', '', `: ${examDetail?.kelas_target || 'Semua Kelas'}`, '', ''
  ]);
  // Row 5 (Excel Row 6): Metadata Row 3
  rows.push([
    'Guru Pengampu', '', `: ${teacherName}`, '', '', '',
    'Tanggal Cetak Berkas', '', `: ${currentDate}`, '', ''
  ]);
  // Row 6 (Excel Row 7): Spacer
  rows.push([]);

  // Row 7 (Excel Row 8): Table Headers
  const headerCols = [
    'NO',
    'NO. ABSEN',
    'NISN / ID SISWA',
    'NAMA LENGKAP SISWA',
    'KELAS',
    'BENAR',
    'SALAH',
    'KOSONG',
    'NILAI AKHIR',
    'KKM',
    'STATUS KELULUSAN',
  ];
  rows.push(headerCols);

  // Rows 8.. (Excel Row 9..): Student Data Rows
  sorted.forEach((item, idx) => {
    const isSelesai = item.status === 'selesai';
    const nilai = isSelesai && item.total_nilai !== null ? Number(item.total_nilai) : 0;
    const isLulus = nilai >= kkm;
    const statusKet = !isSelesai
      ? item.status === 'ditangguhkan'
        ? 'DITANGGUHKAN'
        : 'BELUM SELESAI'
      : isLulus
      ? 'TUNTAS'
      : 'REMIDIAL';

    rows.push([
      idx + 1,
      item.no_absen ? Number(item.no_absen) : '-',
      item.username || '-',
      item.nama || 'Siswa',
      item.kelas || '-',
      item.jumlah_benar ?? 0,
      item.jumlah_salah ?? 0,
      item.jumlah_kosong ?? 0,
      nilai,
      kkm,
      statusKet,
    ]);
  });

  // Spacer row
  rows.push([]);

  // Summary and Signature Section
  const summaryStartRow = rows.length; // 0-indexed row in rows
  rows.push(['', '', 'RINGKASAN STATISTIK KELAS', '', '', '', '', '', `${currentDate}`, '', '']);
  rows.push(['', '', 'Total Siswa Terdaftar', '', `${sorted.length} Siswa`, '', '', '', 'Mengetahui / Guru Pengampu,', '', '']);
  rows.push(['', '', 'Total Siswa Selesai Mengikuti', '', `${selesai.length} Siswa`, '', '', '', '', '', '']);
  rows.push(['', '', 'Rata-Rata Nilai Kelas', '', Number(rataRata), '', '', '', '', '', '']);
  rows.push(['', '', 'Nilai Tertinggi Kelas', '', nilaiTertinggi, '', '', '', '', '', '']);
  rows.push(['', '', 'Nilai Terendah Kelas', '', nilaiTerendah, '', '', '', `( ${teacherName} )`, '', '']);
  rows.push(['', '', `Ketuntasan KKM (≥ ${kkm})`, '', `${lulusKkm} Siswa (${persenLulus}%)`, '', '', '', '', '', '']);
  rows.push(['', '', `Siswa Remedial (< ${kkm})`, '', `${remedial} Siswa`, '', '', '', '', '', '']);

  // Create sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Define All Merges
  const merges = [
    // Title
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    // Metadata Row 1
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } },
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
    { s: { r: 3, c: 8 }, e: { r: 3, c: 10 } },
    // Metadata Row 2
    { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
    { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } },
    { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
    { s: { r: 4, c: 8 }, e: { r: 4, c: 10 } },
    // Metadata Row 3
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 4 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } },
    { s: { r: 5, c: 8 }, e: { r: 5, c: 10 } },
    // Summary Header
    { s: { r: summaryStartRow, c: 2 }, e: { r: summaryStartRow, c: 4 } },
    // Summary Rows
    { s: { r: summaryStartRow + 1, c: 2 }, e: { r: summaryStartRow + 1, c: 3 } },
    { s: { r: summaryStartRow + 2, c: 2 }, e: { r: summaryStartRow + 2, c: 3 } },
    { s: { r: summaryStartRow + 3, c: 2 }, e: { r: summaryStartRow + 3, c: 3 } },
    { s: { r: summaryStartRow + 4, c: 2 }, e: { r: summaryStartRow + 4, c: 3 } },
    { s: { r: summaryStartRow + 5, c: 2 }, e: { r: summaryStartRow + 5, c: 3 } },
    { s: { r: summaryStartRow + 6, c: 2 }, e: { r: summaryStartRow + 6, c: 3 } },
    { s: { r: summaryStartRow + 7, c: 2 }, e: { r: summaryStartRow + 7, c: 3 } },
    // Signature Merges (Columns I to K = 8 to 10)
    { s: { r: summaryStartRow, c: 8 }, e: { r: summaryStartRow, c: 10 } },
    { s: { r: summaryStartRow + 1, c: 8 }, e: { r: summaryStartRow + 1, c: 10 } },
    { s: { r: summaryStartRow + 5, c: 8 }, e: { r: summaryStartRow + 5, c: 10 } },
  ];
  ws['!merges'] = merges;

  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  };

  const ensureCell = (r, c) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { v: '', t: 's' };
    return ws[ref];
  };

  // 1. Style Title (Row 0)
  for (let c = 0; c <= 10; c++) {
    const cell = ensureCell(0, c);
    cell.s = {
      fill: { fgColor: { rgb: '0F172A' } },
      font: { name: 'Calibri', sz: 15, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // 2. Style Subtitle (Row 1)
  for (let c = 0; c <= 10; c++) {
    const cell = ensureCell(1, c);
    cell.s = {
      fill: { fgColor: { rgb: '1E293B' } },
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'CBD5E1' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // 3. Style Metadata Rows (Rows 3, 4, 5)
  for (let r = 3; r <= 5; r++) {
    // Left Label (A:B)
    for (let c = 0; c <= 1; c++) {
      const cell = ensureCell(r, c);
      cell.s = {
        fill: { fgColor: { rgb: 'F1F5F9' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '334155' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      };
    }
    // Left Value (C:E)
    for (let c = 2; c <= 4; c++) {
      const cell = ensureCell(r, c);
      cell.s = {
        fill: { fgColor: { rgb: 'FFFFFF' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      };
    }
    // Right Label (G:H)
    for (let c = 6; c <= 7; c++) {
      const cell = ensureCell(r, c);
      cell.s = {
        fill: { fgColor: { rgb: 'F1F5F9' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '334155' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      };
    }
    // Right Value (I:K)
    for (let c = 8; c <= 10; c++) {
      const cell = ensureCell(r, c);
      cell.s = {
        fill: { fgColor: { rgb: 'FFFFFF' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder,
      };
    }
  }

  // 4. Style Table Header (Row 7)
  for (let c = 0; c <= 10; c++) {
    const cell = ensureCell(7, c);
    cell.s = {
      fill: { fgColor: { rgb: '0F172A' } },
      font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'medium', color: { rgb: '0F172A' } },
        bottom: { style: 'medium', color: { rgb: '0F172A' } },
        left: { style: 'thin', color: { rgb: '334155' } },
        right: { style: 'thin', color: { rgb: '334155' } },
      },
    };
  }

  // 5. Style Data Rows (Rows 8 to 8 + sorted.length - 1)
  const dataStartRow = 8;

  for (let i = 0; i < sorted.length; i++) {
    const r = dataStartRow + i;
    const isEven = i % 2 === 0;
    const rowBg = isEven ? 'FFFFFF' : 'F8FAFC';
    const item = sorted[i];
    const isSelesai = item.status === 'selesai';
    const nilai = isSelesai && item.total_nilai !== null ? Number(item.total_nilai) : 0;
    const isLulus = nilai >= kkm;

    for (let c = 0; c <= 10; c++) {
      const cell = ensureCell(r, c);
      let align = 'center';
      let fontColor = '1E293B';
      let fontBold = false;
      let fontSize = 10;
      let cellBg = rowBg;

      if (c === 0) {
        fontColor = '64748B';
      } else if (c === 1) {
        fontBold = true;
        fontColor = '334155';
      } else if (c === 2) {
        fontColor = '475569';
      } else if (c === 3) {
        align = 'left';
        fontBold = true;
        fontColor = '0F172A';
      } else if (c === 4) {
        fontColor = '334155';
      } else if (c === 5) {
        fontBold = true;
        fontColor = '16A34A';
      } else if (c === 6) {
        fontBold = true;
        fontColor = 'DC2626';
      } else if (c === 7) {
        fontColor = '64748B';
      } else if (c === 8) {
        fontBold = true;
        fontSize = 11;
        fontColor = isLulus ? '0F172A' : 'DC2626';
      } else if (c === 9) {
        fontColor = '64748B';
      } else if (c === 10) {
        fontBold = true;
        fontSize = 9.5;
        if (isSelesai) {
          if (isLulus) {
            cellBg = 'DCFCE7';
            fontColor = '15803D';
          } else {
            cellBg = 'FEE2E2';
            fontColor = 'B91C1C';
          }
        } else {
          cellBg = 'FEF3C7';
          fontColor = 'B45309';
        }
      }

      cell.s = {
        fill: { fgColor: { rgb: cellBg } },
        font: { name: 'Calibri', sz: fontSize, bold: fontBold, color: { rgb: fontColor } },
        alignment: { horizontal: align, vertical: 'center' },
        border: thinBorder,
      };
    }
  }

  // 6. Style Summary Statistics Block
  // Header row
  for (let c = 2; c <= 4; c++) {
    const cell = ensureCell(summaryStartRow, c);
    cell.s = {
      fill: { fgColor: { rgb: '1E293B' } },
      font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    };
  }

  // Summary Metrics Rows
  for (let sr = 1; sr <= 7; sr++) {
    const r = summaryStartRow + sr;
    for (let c = 2; c <= 3; c++) {
      const cell = ensureCell(r, c);
      cell.s = {
        fill: { fgColor: { rgb: 'F8FAFC' } },
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '475569' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      };
    }
    const valCell = ensureCell(r, 4);
    let valBg = 'FFFFFF';
    let valColor = '0F172A';
    if (sr === 4) valColor = '16A34A';
    if (sr === 5) valColor = 'DC2626';
    if (sr === 6) { valBg = 'DCFCE7'; valColor = '15803D'; }
    if (sr === 7) { valBg = 'FEE2E2'; valColor = 'B91C1C'; }

    valCell.s = {
      fill: { fgColor: { rgb: valBg } },
      font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: valColor } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    };
  }

  // 7. Style Signature Block (Columns 8 to 10 = I to K)
  for (let c = 8; c <= 10; c++) {
    const cell = ensureCell(summaryStartRow, c);
    cell.s = {
      font: { name: 'Calibri', sz: 10.5, color: { rgb: '334155' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
  for (let c = 8; c <= 10; c++) {
    const cell = ensureCell(summaryStartRow + 1, c);
    cell.s = {
      font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
  for (let c = 8; c <= 10; c++) {
    const cell = ensureCell(summaryStartRow + 5, c);
    cell.s = {
      font: { name: 'Calibri', sz: 11.5, bold: true, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'medium', color: { rgb: '0F172A' } },
      },
    };
  }

  // Column Widths
  ws['!cols'] = [
    { wch: 7 },  // No
    { wch: 13 }, // Absen
    { wch: 18 }, // NISN
    { wch: 38 }, // Nama
    { wch: 12 }, // Kelas
    { wch: 12 }, // Benar
    { wch: 12 }, // Salah
    { wch: 12 }, // Kosong
    { wch: 15 }, // Nilai
    { wch: 10 }, // KKM
    { wch: 22 }, // Keterangan
  ];

  // Row Heights
  const rowsHeights = [];
  rowsHeights[0] = { hpt: 30 }; // Title
  rowsHeights[1] = { hpt: 20 }; // Subtitle
  rowsHeights[2] = { hpt: 8 };  // Spacer
  rowsHeights[3] = { hpt: 20 }; // Meta 1
  rowsHeights[4] = { hpt: 20 }; // Meta 2
  rowsHeights[5] = { hpt: 20 }; // Meta 3
  rowsHeights[6] = { hpt: 10 }; // Spacer
  rowsHeights[7] = { hpt: 26 }; // Table Header

  for (let r = 8; r < 8 + sorted.length; r++) {
    rowsHeights[r] = { hpt: 20 }; // Data rows
  }
  ws['!rows'] = rowsHeights;
  ws['!views'] = [{ showGridLines: true }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai');

  const safeJudul = (examDetail?.judul || 'Ujian').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeKelas = (examDetail?.kelas_target || 'Kelas').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Rekap_Nilai_${safeJudul}_${safeKelas}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Generate a high-resolution, print-ready document image (.png) of the grade ledger
 */
export function generateRekapTableImage({ examDetail, results = [], guruNama = '' }) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 3; // Ultra-HD 3x resolution for pin-sharp document print & zoom (zero blur/pixelation)

    const kkm = Number(examDetail?.kkm) || 75;
    const teacherName = guruNama || examDetail?.guru_nama || 'Guru Pengampu';
    const currentDate = getFormalIndonesianDate();

    // Sort results naturally by absen
    const sorted = [...results].sort((a, b) => {
      const absA = a.no_absen ? Number(a.no_absen) : 9999;
      const absB = b.no_absen ? Number(b.no_absen) : 9999;
      if (absA !== absB) return absA - absB;
      return (a.nama || '').localeCompare(b.nama || '');
    });

    const selesai = sorted.filter((r) => r.status === 'selesai');
    const nilaiArr = selesai.map((r) => Number(r.total_nilai)).filter((n) => !isNaN(n));
    const rataRata = nilaiArr.length > 0 ? (nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length).toFixed(1) : '0';
    const nilaiTertinggi = nilaiArr.length > 0 ? Math.max(...nilaiArr) : 0;
    const nilaiTerendah = nilaiArr.length > 0 ? Math.min(...nilaiArr) : 0;
    const lulusKkm = selesai.filter((r) => Number(r.total_nilai) >= kkm).length;
    const remedial = selesai.filter((r) => Number(r.total_nilai) < kkm).length;
    const persenLulus = selesai.length > 0 ? Math.round((lulusKkm / selesai.length) * 100) : 0;

    const width = 1120;
    const padding = 36;
    const innerWidth = width - padding * 2;

    const rowH = 30;
    const headerHeight = 135;
    const tableHeaderH = 34;
    const tableRowsH = Math.max(sorted.length, 1) * rowH;
    const statsBoxH = 82;
    const footerH = 145;

    const totalHeight = padding + headerHeight + tableHeaderH + tableRowsH + 20 + statsBoxH + 24 + footerH + padding;

    canvas.width = width * scale;
    canvas.height = totalHeight * scale;
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Pure White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Outer framing: Clean double-stroke architectural frame
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14, 14, width - 28, totalHeight - 28);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(18, 18, width - 36, totalHeight - 36);

    let currentY = padding;

    // 2. Kop Dokumen Resmi
    ctx.fillStyle = '#475569';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText('SISTEM EVALUASI & ASESMEN ULANGAN DIGITAL', padding, currentY + 12);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('LEGER REKAPITULASI HASIL ASESMEN SISWA', padding, currentY + 36);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Dokumen rekapitulasi nilai resmi untuk evaluasi dan pengisian buku raport kelas.', padding, currentY + 54);

    // Thick Divider Line
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(padding, currentY + 66);
    ctx.lineTo(padding + innerWidth, currentY + 66);
    ctx.stroke();

    // Metadata Grid (2 Columns, Clean and Understated)
    currentY += 80;
    const col2X = padding + Math.floor(innerWidth / 2) + 16;

    // Col 1
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Mata Pelajaran', padding, currentY);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`: ${examDetail?.mata_pelajaran || '-'}`, padding + 115, currentY);

    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Judul Ujian', padding, currentY + 20);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`: ${examDetail?.judul || '-'}`, padding + 115, currentY + 20);

    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Kelas / Rombel', padding, currentY + 40);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`: ${examDetail?.kelas_target || 'Semua Kelas'}`, padding + 115, currentY + 40);

    // Col 2
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Standar KKM', col2X, currentY);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`: ${kkm}`, col2X + 115, currentY);

    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Guru Pengampu', col2X, currentY + 20);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`: ${teacherName}`, col2X + 115, currentY + 20);

    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Tanggal Cetak', col2X, currentY + 40);
    ctx.fillStyle = '#0f172a';
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`: ${currentDate}`, col2X + 115, currentY + 40);

    currentY += 56;

    // 3. Table Column Layout
    const cols = [
      { key: 'no', label: 'NO', width: 44, align: 'center' },
      { key: 'absen', label: 'ABS', width: 48, align: 'center' },
      { key: 'nisn', label: 'NISN / ID', width: 125, align: 'left' },
      { key: 'nama', label: 'NAMA LENGKAP SISWA', width: 335, align: 'left' },
      { key: 'kelas', label: 'KELAS', width: 85, align: 'center' },
      { key: 'benar', label: 'BENAR', width: 68, align: 'center' },
      { key: 'salah', label: 'SALAH', width: 68, align: 'center' },
      { key: 'kosong', label: 'KOSONG', width: 72, align: 'center' },
      { key: 'nilai', label: 'NILAI', width: 85, align: 'center' },
      { key: 'kkm', label: 'KKM', width: 50, align: 'center' },
      { key: 'ket', label: 'KETERANGAN', width: 68, align: 'center' },
    ];

    // Table Header Background (Monochrome Deep Slate)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(padding, currentY, innerWidth, tableHeaderH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    let colLeft = padding;
    cols.forEach((c) => {
      let tx = colLeft + 8;
      if (c.align === 'center') {
        tx = colLeft + c.width / 2;
        ctx.textAlign = 'center';
      } else {
        ctx.textAlign = 'left';
      }
      ctx.fillText(c.label, tx, currentY + 21);
      colLeft += c.width;
    });

    currentY += tableHeaderH;

    // Render Table Rows
    if (sorted.length === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(padding, currentY, innerWidth, rowH);
      ctx.strokeStyle = '#e2e8f0';
      ctx.strokeRect(padding, currentY, innerWidth, rowH);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Belum ada siswa yang mengikuti ujian ini.', padding + innerWidth / 2, currentY + 19);
      currentY += rowH;
    } else {
      sorted.forEach((item, idx) => {
        const isEven = idx % 2 === 0;
        ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
        ctx.fillRect(padding, currentY, innerWidth, rowH);

        // Row border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(padding, currentY, innerWidth, rowH);

        const isSelesai = item.status === 'selesai';
        const nilaiNum = isSelesai && item.total_nilai !== null ? Number(item.total_nilai) : 0;
        const isLulus = nilaiNum >= kkm;

        let curX = padding;
        cols.forEach((c) => {
          // Subtle column divider line
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(curX + c.width, currentY);
          ctx.lineTo(curX + c.width, currentY + rowH);
          ctx.stroke();

          let textVal = '';
          let textColor = '#1e293b';
          let fontStyle = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

          if (c.key === 'no') {
            textVal = String(idx + 1);
            textColor = '#64748b';
          } else if (c.key === 'absen') {
            textVal = item.no_absen ? String(item.no_absen) : '-';
            textColor = '#334155';
          } else if (c.key === 'nisn') {
            textVal = item.username ? String(item.username).slice(0, 16) : '-';
            textColor = '#475569';
          } else if (c.key === 'nama') {
            textVal = item.nama || 'Siswa';
            textColor = '#0f172a';
            fontStyle = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          } else if (c.key === 'kelas') {
            textVal = item.kelas || '-';
            textColor = '#475569';
          } else if (c.key === 'benar') {
            textVal = String(item.jumlah_benar ?? 0);
            textColor = '#16a34a';
          } else if (c.key === 'salah') {
            textVal = String(item.jumlah_salah ?? 0);
            textColor = '#dc2626';
          } else if (c.key === 'kosong') {
            textVal = String(item.jumlah_kosong ?? 0);
            textColor = '#64748b';
          } else if (c.key === 'nilai') {
            textVal = isSelesai ? String(nilaiNum) : '-';
            textColor = isLulus ? '#0f172a' : '#b91c1c';
            fontStyle = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          } else if (c.key === 'kkm') {
            textVal = String(kkm);
            textColor = '#64748b';
          } else if (c.key === 'ket') {
            if (!isSelesai) {
              textVal = item.status === 'ditangguhkan' ? 'SUSPEND' : 'PROSES';
              textColor = '#d97706';
            } else {
              textVal = isLulus ? 'TUNTAS' : 'REMIDI';
              textColor = isLulus ? '#15803d' : '#b91c1c';
              fontStyle = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            }
          }

          ctx.font = fontStyle;
          ctx.fillStyle = textColor;

          let tx = curX + 8;
          if (c.align === 'center') {
            tx = curX + c.width / 2;
            ctx.textAlign = 'center';
          } else {
            ctx.textAlign = 'left';
          }

          // Truncate name if too long
          if (c.key === 'nama') {
            const maxW = c.width - 16;
            let str = textVal;
            if (ctx.measureText(str).width > maxW) {
              while (str.length > 0 && ctx.measureText(str + '...').width > maxW) {
                str = str.slice(0, -1);
              }
              str += '...';
            }
            textVal = str;
          }

          ctx.fillText(textVal, tx, currentY + 19);
          curX += c.width;
        });

        currentY += rowH;
      });
    }

    currentY += 18;

    // 4. Clean Statistical Summary Box (4 metric cards in row)
    const cardGap = 12;
    const numCards = 4;
    const cardW = (innerWidth - cardGap * (numCards - 1)) / numCards;

    const summaryCards = [
      { label: 'TOTAL SISWA SELESAI', val: `${selesai.length} / ${sorted.length} Siswa`, sub: 'Mengikuti Ujian' },
      { label: 'RATA-RATA NILAI KELAS', val: rataRata, sub: `KKM Acuan: ${kkm}` },
      { label: 'NILAI TERTINGGI / TERENDAH', val: `${nilaiTertinggi} / ${nilaiTerendah}`, sub: 'Rentang Skor' },
      { label: 'KETUNTASAN KELAS', val: `${lulusKkm} Tuntas (${persenLulus}%)`, sub: `${remedial} Siswa Remidi` },
    ];

    summaryCards.forEach((c, i) => {
      const cx = padding + i * (cardW + cardGap);
      // Card box
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx, currentY, cardW, statsBoxH);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, currentY, cardW, statsBoxH);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 9.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(c.label, cx + 12, currentY + 20);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(c.val, cx + 12, currentY + 45);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(c.sub, cx + 12, currentY + 66);
    });

    currentY += statsBoxH + 24;

    // 5. Official Signature & Footer Area
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Aplikasi Asesmen Ulangan Digital', padding, currentY + 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Dokumen rekapitulasi nilai ini sah dan digenerate otomatis oleh sistem sekolah.', padding, currentY + 34);
    const nowWIB = formatWIB(new Date(), true);
    ctx.fillText(`Waktu cetak berkas: ${nowWIB}`, padding, currentY + 52);

    // Right Side: Teacher Signature Block (Dynamic centered line matching teacher name)
    const signBoxWidth = 260;
    const signX = padding + innerWidth - signBoxWidth;
    const signCenterX = signX + signBoxWidth / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#334155';
    ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${currentDate}`, signCenterX, currentY + 14);
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Mengetahui / Guru Pengampu,', signCenterX, currentY + 32);

    // Measure teacher's name dynamically
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const nameWidth = ctx.measureText(teacherName).width;
    const lineWidth = Math.max(nameWidth + 16, 80);
    const lineStartX = signCenterX - lineWidth / 2;
    const lineEndX = signCenterX + lineWidth / 2;

    // Dynamic centered signature line
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lineStartX, currentY + 98);
    ctx.lineTo(lineEndX, currentY + 98);
    ctx.stroke();

    // Centered teacher name directly beneath the line
    ctx.fillStyle = '#0f172a';
    ctx.fillText(teacherName, signCenterX, currentY + 116);
    ctx.textAlign = 'left';

    try {
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    } catch (err) {
      console.error('Failed to generate rekap image', err);
      resolve(null);
    }
  });
}

/**
 * Trigger immediate browser download of the ledger image (.png)
 */
export function downloadRekapImage(dataUrl, filename = 'Rekap_Nilai_Siswa.png') {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy image to clipboard for instant pasting
 */
export async function copyRekapImageToClipboard(dataUrl) {
  if (typeof window === 'undefined' || !navigator.clipboard || !window.ClipboardItem) {
    throw new Error('Clipboard API tidak didukung pada browser ini.');
  }

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ]);
  return true;
}

/**
 * Open a clean, beautifully formatted native print window (Print / PDF)
 */
export function printRekapDocument({ examDetail, results = [], guruNama = '' }) {
  if (typeof window === 'undefined') return;

  const kkm = Number(examDetail?.kkm) || 75;
  const teacherName = guruNama || examDetail?.guru_nama || 'Guru Pengampu';
  const currentDate = getFormalIndonesianDate();

  const sorted = [...results].sort((a, b) => {
    const absA = a.no_absen ? Number(a.no_absen) : 9999;
    const absB = b.no_absen ? Number(b.no_absen) : 9999;
    if (absA !== absB) return absA - absB;
    return (a.nama || '').localeCompare(b.nama || '');
  });

  const selesai = sorted.filter((r) => r.status === 'selesai');
  const nilaiArr = selesai.map((r) => Number(r.total_nilai)).filter((n) => !isNaN(n));
  const rataRata = nilaiArr.length > 0 ? (nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length).toFixed(1) : '0';
  const nilaiTertinggi = nilaiArr.length > 0 ? Math.max(...nilaiArr) : 0;
  const nilaiTerendah = nilaiArr.length > 0 ? Math.min(...nilaiArr) : 0;
  const lulusKkm = selesai.filter((r) => Number(r.total_nilai) >= kkm).length;
  const remedial = selesai.filter((r) => Number(r.total_nilai) < kkm).length;
  const persenLulus = selesai.length > 0 ? Math.round((lulusKkm / selesai.length) * 100) : 0;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Rekap Nilai Siswa - ${examDetail?.judul || 'Ujian'}</title>
        <style>
          @page { size: landscape; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .kop {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .kop-sub { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
          .kop-title { font-size: 18px; font-weight: 800; margin: 2px 0; }
          .meta-table { width: 100%; margin-bottom: 12px; }
          .meta-table td { font-size: 11px; padding: 2px 4px; vertical-align: top; }
          .meta-label { color: #475569; font-weight: 600; width: 120px; }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
          }
          .data-table th, .data-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            font-size: 10.5px;
          }
          .data-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-align: center;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .tuntas { color: #15803d; font-weight: 700; }
          .remidi { color: #b91c1c; font-weight: 700; }
          .stats-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 18px;
          }
          .stats-box {
            flex: 1;
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            background: #f8fafc;
          }
          .stats-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; }
          .stats-val { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          .footer-section {
            display: flex;
            justify-content: space-between;
            margin-top: 14px;
            page-break-inside: avoid;
          }
          .sign-box {
            text-align: center;
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            min-width: 220px;
          }
          .sign-wrapper {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            margin-top: 55px;
          }
          .sign-line {
            width: 100%;
            border-bottom: 1.5px solid #0f172a;
            margin-bottom: 5px;
          }
          .teacher-title {
            font-weight: 800;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div class="kop">
          <div class="kop-sub">SISTEM ASESMEN ULANGAN DIGITAL</div>
          <div class="kop-title">LEGER REKAPITULASI NILAI ASESMEN SISWA</div>
        </div>

        <table class="meta-table">
          <tr>
            <td class="meta-label">Mata Pelajaran</td>
            <td>: <strong>${examDetail?.mata_pelajaran || '-'}</strong></td>
            <td class="meta-label">Standar KKM</td>
            <td>: <strong>${kkm}</strong></td>
          </tr>
          <tr>
            <td class="meta-label">Judul Ujian</td>
            <td>: <strong>${examDetail?.judul || '-'}</strong></td>
            <td class="meta-label">Guru Pengampu</td>
            <td>: <strong>${teacherName}</strong></td>
          </tr>
          <tr>
            <td class="meta-label">Kelas / Target</td>
            <td>: <strong>${examDetail?.kelas_target || 'Semua Kelas'}</strong></td>
            <td class="meta-label">Tanggal Cetak</td>
            <td>: ${currentDate}</td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px;">NO</th>
              <th style="width: 45px;">ABS</th>
              <th style="width: 100px;">NISN / ID</th>
              <th>NAMA LENGKAP SISWA</th>
              <th style="width: 70px;">KELAS</th>
              <th style="width: 55px;">BENAR</th>
              <th style="width: 55px;">SALAH</th>
              <th style="width: 55px;">KOSONG</th>
              <th style="width: 65px;">NILAI</th>
              <th style="width: 45px;">KKM</th>
              <th style="width: 85px;">KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((item, idx) => {
              const isSelesai = item.status === 'selesai';
              const nilai = isSelesai && item.total_nilai !== null ? Number(item.total_nilai) : 0;
              const isLulus = nilai >= kkm;
              const statusKet = !isSelesai
                ? item.status === 'ditangguhkan' ? 'SUSPEND' : 'PROSES'
                : isLulus ? 'TUNTAS' : 'REMIDI';
              return `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td class="text-center">${item.no_absen || '-'}</td>
                  <td>${item.username || '-'}</td>
                  <td class="font-bold">${item.nama || 'Siswa'}</td>
                  <td class="text-center">${item.kelas || '-'}</td>
                  <td class="text-center" style="color: #16a34a;">${item.jumlah_benar ?? 0}</td>
                  <td class="text-center" style="color: #dc2626;">${item.jumlah_salah ?? 0}</td>
                  <td class="text-center" style="color: #64748b;">${item.jumlah_kosong ?? 0}</td>
                  <td class="text-center font-bold" style="font-size: 12px; color: ${isLulus ? '#0f172a' : '#b91c1c'};">${isSelesai ? nilai : '-'}</td>
                  <td class="text-center">${kkm}</td>
                  <td class="text-center ${isLulus ? 'tuntas' : 'remidi'}">${statusKet}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="stats-grid">
          <div class="stats-box">
            <div class="stats-label">Siswa Mengikuti</div>
            <div class="stats-val">${selesai.length} / ${sorted.length} Siswa</div>
          </div>
          <div class="stats-box">
            <div class="stats-label">Rata-Rata Nilai</div>
            <div class="stats-val">${rataRata}</div>
          </div>
          <div class="stats-box">
            <div class="stats-label">Skor Tertinggi / Terendah</div>
            <div class="stats-val">${nilaiTertinggi} / ${nilaiTerendah}</div>
          </div>
          <div class="stats-box">
            <div class="stats-label">Ketuntasan KKM</div>
            <div class="stats-val">${lulusKkm} Tuntas (${persenLulus}%)</div>
          </div>
        </div>

        <div class="footer-section">
          <div>
            <div style="font-weight: 700; color: #475569;">Aplikasi Asesmen Ulangan Digital</div>
            <div style="color: #94a3b8; font-size: 10px;">Dokumen Rekapitulasi Nilai Asli • Digenerate otomatis</div>
          </div>
          <div class="sign-box">
            <div>${currentDate}</div>
            <div style="font-weight: 600;">Mengetahui / Guru Pengampu,</div>
            <div class="sign-wrapper">
              <div class="sign-line"></div>
              <div class="teacher-title">${teacherName}</div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
