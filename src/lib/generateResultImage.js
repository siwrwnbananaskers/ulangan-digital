/**
 * Student Exam Result Image Generator (HTML5 Canvas)
 * Generates ultra-crisp, high-definition PNG images of individual student exam results
 * perfect for sharing directly with students/parents via WhatsApp or for printing.
 */

import { formatWIB } from './utils';

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
  let r = radius;
  if (typeof r === 'number') {
    r = { tl: r, tr: r, br: r, bl: r };
  } else {
    r = { tl: r?.tl || 0, tr: r?.tr || 0, br: r?.br || 0, bl: r?.bl || 0 };
  }

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();

  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function fitText(ctx, text, maxWidth) {
  if (!text) return '';
  const str = String(text);
  if (ctx.measureText(str).width <= maxWidth) return str;
  let res = str;
  while (res.length > 0 && ctx.measureText(res + '...').width > maxWidth) {
    res = res.slice(0, -1);
  }
  return res + '...';
}

export function generateResultImage({ sesi, jawaban = [], mode = 'ringkas', guruNama = '' }) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 2; // Retina 2x for razor-sharp text

    const width = 850;
    const padding = 28;
    const innerWidth = width - padding * 2;

    const listJawaban = Array.isArray(jawaban) ? jawaban : [];
    const hasJawaban = listJawaban.length > 0;

    // Calculate dynamic height based on mode
    let contentHeight = 0;
    const headerHeight = 90;
    const studentInfoHeight = 118;
    const scoreHeroHeight = 150;
    const footerHeight = 125;

    let questionSectionHeight = 0;
    if (mode === 'ringkas') {
      if (hasJawaban) {
        const cols = 5;
        const rows = Math.ceil(listJawaban.length / cols);
        questionSectionHeight = 42 + rows * 42 + 10;
      }
    } else {
      // mode === 'lengkap'
      const rowHeight = 36;
      questionSectionHeight = 44 + Math.max(listJawaban.length, 1) * rowHeight + 14;
    }

    contentHeight = padding + headerHeight + 16 + studentInfoHeight + 16 + scoreHeroHeight + (questionSectionHeight ? 16 + questionSectionHeight : 0) + 16 + footerHeight + padding;

    canvas.width = width * scale;
    canvas.height = contentHeight * scale;
    ctx.scale(scale, scale);

    // 1. Outer Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, contentHeight);

    // Subtle container border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 10, 10, width - 20, contentHeight - 20, 16, false, true);

    let currentY = padding;

    // 2. Header Banner
    const bannerRadius = { tl: 14, tr: 14, br: 14, bl: 14 };
    const bannerGradient = ctx.createLinearGradient(padding, currentY, padding + innerWidth, currentY + headerHeight);
    bannerGradient.addColorStop(0, '#0a66c2');
    bannerGradient.addColorStop(1, '#004182');
    ctx.fillStyle = bannerGradient;
    drawRoundedRect(ctx, padding, currentY, innerWidth, headerHeight, bannerRadius, true, false);

    // Header Logo Icon & Text
    // Small icon box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    drawRoundedRect(ctx, padding + 18, currentY + 18, 54, 54, 12, true, false);

    // Icon glyph
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('UD', padding + 27, currentY + 53);

    // App Title & Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('LEMBAR HASIL UJIAN SISWA', padding + 86, currentY + 41);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Sistem Asesmen Ulangan Digital • Dokumen Hasil Resmi', padding + 86, currentY + 61);

    // Right Status Badge in Header
    const isSelesai = sesi?.status === 'selesai';
    const statusText = isSelesai ? 'SELESAI DIKUMPULKAN' : 'SEDANG MENGERJAKAN';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const statusWidth = ctx.measureText(statusText).width + 24;
    const statusX = padding + innerWidth - statusWidth - 18;
    const statusY = currentY + 28;

    ctx.fillStyle = isSelesai ? '#dcfce7' : '#fef3c7';
    drawRoundedRect(ctx, statusX, statusY, statusWidth, 34, 17, true, false);

    ctx.fillStyle = isSelesai ? '#15803d' : '#b45309';
    ctx.fillText(statusText, statusX + 12, statusY + 21);

    currentY += headerHeight + 16;

    // 3. Student Identity Card (Spacious 3-row layout, completely prevents any overlap)
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, padding, currentY, innerWidth, studentInfoHeight, 12, true, true);

    // Row 1: Student Name (Dedicated full-width row - up to 750px without any collision!)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const namaSiswa = sesi?.nama || 'Nama Siswa';
    ctx.fillText(fitText(ctx, namaSiswa.toUpperCase(), innerWidth - 36), padding + 18, currentY + 30);

    // Subtle divider
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(padding + 18, currentY + 42);
    ctx.lineTo(padding + innerWidth - 18, currentY + 42);
    ctx.stroke();

    // Row 2:
    // Left: Kelas & Absen
    ctx.fillStyle = '#475569';
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Kelas: ${sesi?.kelas || '-'} (Absen: ${sesi?.no_absen || '-'})`, padding + 18, currentY + 68);

    // Right: Ujian
    ctx.fillStyle = '#1e293b';
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const judulUjian = fitText(ctx, `Ujian: ${sesi?.ujian_judul || '-'}`, 360);
    ctx.fillText(judulUjian, padding + 360, currentY + 68);

    // Row 3:
    // Left: Mapel
    ctx.fillStyle = '#475569';
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const mapel = fitText(ctx, `Mata Pelajaran: ${sesi?.mata_pelajaran || '-'}`, 330);
    ctx.fillText(mapel, padding + 18, currentY + 96);

    // Right: Waktu Pengumpulan (Synchronized with WIB / Asia/Jakarta timezone!)
    const waktuTeks = formatWIB(sesi?.waktu_selesai);
    ctx.fillText(`Waktu Pengumpulan: ${waktuTeks}`, padding + 360, currentY + 96);

    currentY += studentInfoHeight + 16;

    // 4. Score Hero & Stat Cards
    const totalNilai = sesi?.total_nilai !== null && sesi?.total_nilai !== undefined ? Number(sesi.total_nilai) : 0;
    const kkm = sesi?.kkm ? Number(sesi.kkm) : 75;
    const isLulus = totalNilai >= kkm;

    const heroScoreWidth = 240;
    const heroScoreHeight = scoreHeroHeight;

    // Left Box: Nilai Akhir
    ctx.fillStyle = isLulus ? '#f0fdf4' : '#fef2f2';
    ctx.strokeStyle = isLulus ? '#86efac' : '#fca5a5';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, padding, currentY, heroScoreWidth, heroScoreHeight, 14, true, true);

    ctx.fillStyle = '#64748b';
    ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('NILAI AKHIR SISWA', padding + 22, currentY + 30);

    ctx.fillStyle = isLulus ? '#16a34a' : '#dc2626';
    ctx.font = '900 60px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(String(totalNilai), padding + 22, currentY + 95);

    // KKM Pill
    const pillText = isLulus ? `TUNTAS KKM (${kkm})` : `REMIDIAL (KKM: ${kkm})`;
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const pillWidth = ctx.measureText(pillText).width + 16;
    ctx.fillStyle = isLulus ? '#dcfce7' : '#fee2e2';
    drawRoundedRect(ctx, padding + 22, currentY + 112, pillWidth, 24, 6, true, false);

    ctx.fillStyle = isLulus ? '#15803d' : '#b91c1c';
    ctx.fillText(pillText, padding + 30, currentY + 128);

    // Right Side: 4 Stat Cards (2x2 Grid)
    const statsX = padding + heroScoreWidth + 14;
    const statsWidth = innerWidth - heroScoreWidth - 14;
    const statCardW = (statsWidth - 12) / 2;
    const statCardH = (heroScoreHeight - 12) / 2;

    const statBoxes = [
      {
        label: 'Jawaban Benar',
        val: `${sesi?.jumlah_benar ?? 0} Butir`,
        sub: 'Poin Penuh',
        color: '#16a34a',
        bg: '#f0fdf4',
        border: '#bbf7d0',
      },
      {
        label: 'Jawaban Salah',
        val: `${sesi?.jumlah_salah ?? 0} Butir`,
        sub: 'Skor Nol / Kurang',
        color: '#dc2626',
        bg: '#fef2f2',
        border: '#fecaca',
      },
      {
        label: 'Tidak Dijawab',
        val: `${sesi?.jumlah_kosong ?? 0} Butir`,
        sub: 'Butir Kosong',
        color: '#64748b',
        bg: '#f8fafc',
        border: '#e2e8f0',
      },
      {
        label: 'Integritas / Audit',
        val: `${sesi?.jumlah_pelanggaran ?? 0}x`,
        sub: (sesi?.jumlah_pelanggaran || 0) > 0 ? 'Pelanggaran Tab' : 'Sangat Tertib',
        color: (sesi?.jumlah_pelanggaran || 0) > 0 ? '#dc2626' : '#16a34a',
        bg: (sesi?.jumlah_pelanggaran || 0) > 0 ? '#fef2f2' : '#f0fdf4',
        border: (sesi?.jumlah_pelanggaran || 0) > 0 ? '#fecaca' : '#bbf7d0',
      },
    ];

    statBoxes.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = statsX + col * (statCardW + 12);
      const by = currentY + row * (statCardH + 12);

      ctx.fillStyle = item.bg;
      ctx.strokeStyle = item.border;
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, bx, by, statCardW, statCardH, 10, true, true);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(item.label, bx + 14, by + 22);

      ctx.fillStyle = item.color;
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(item.val, bx + 14, by + 46);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(item.sub, bx + 14, by + 62);
    });

    currentY += scoreHeroHeight + 16;

    // 5. Question Breakdown Section
    if (questionSectionHeight > 0) {
      if (mode === 'ringkas') {
        // Section Header
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('REKAPITULASI BUTIR SOAL', padding, currentY + 16);

        ctx.fillStyle = '#64748b';
        ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Rincian jawaban siswa dan skor per butir pertanyaan:', padding, currentY + 32);

        currentY += 42;

        const cols = 5;
        const chipGap = 8;
        const chipWidth = (innerWidth - chipGap * (cols - 1)) / cols;
        const chipHeight = 34;

        listJawaban.forEach((item, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const cx = padding + col * (chipWidth + chipGap);
          const cy = currentY + row * (chipHeight + chipGap);

          const isBenar = item.is_benar === 1;
          const isSalah = item.is_benar === 0;
          const isKosong = !item.jawaban_siswa || item.jawaban_siswa.trim() === '';

          let chipBg = '#f8fafc';
          let chipBorder = '#e2e8f0';
          let chipColor = '#475569';

          if (isBenar) {
            chipBg = '#f0fdf4';
            chipBorder = '#86efac';
            chipColor = '#15803d';
          } else if (isSalah) {
            chipBg = '#fef2f2';
            chipBorder = '#fca5a5';
            chipColor = '#b91c1c';
          }

          ctx.fillStyle = chipBg;
          ctx.strokeStyle = chipBorder;
          ctx.lineWidth = 1;
          drawRoundedRect(ctx, cx, cy, chipWidth, chipHeight, 8, true, true);

          // Text inside chip: "#1: A  10p"
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const noText = `#${item.urutan || (idx + 1)}`;
          ctx.fillText(noText, cx + 8, cy + 21);

          ctx.fillStyle = chipColor;
          ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const ansText = isKosong ? 'Kosong' : (item.jawaban_siswa || '-').toUpperCase().slice(0, 4);
          ctx.fillText(ansText, cx + 36, cy + 21);

          // Points on the right
          ctx.fillStyle = '#64748b';
          ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const ptText = `${item.nilai_soal ?? 0}p`;
          const ptWidth = ctx.measureText(ptText).width;
          ctx.fillText(ptText, cx + chipWidth - ptWidth - 8, cy + 21);
        });

        const rows = Math.ceil(listJawaban.length / cols);
        currentY += rows * (chipHeight + chipGap) + 12;

      } else {
        // mode === 'lengkap' (Table Format)
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('RINCIAN LENGKAP JAWABAN SISWA', padding, currentY + 16);

        currentY += 28;

        // Table Header
        const rowH = 34;
        ctx.fillStyle = '#f1f5f9';
        drawRoundedRect(ctx, padding, currentY, innerWidth, rowH, { tl: 8, tr: 8, br: 0, bl: 0 }, true, false);

        ctx.fillStyle = '#334155';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('NO', padding + 12, currentY + 21);
        ctx.fillText('TIPE SOAL', padding + 48, currentY + 21);
        ctx.fillText('JAWABAN SISWA', padding + 180, currentY + 21);
        ctx.fillText('KUNCI', padding + 430, currentY + 21);
        ctx.fillText('NILAI / BOBOT', padding + 540, currentY + 21);
        ctx.fillText('STATUS', padding + 670, currentY + 21);

        currentY += rowH;

        listJawaban.forEach((item, idx) => {
          const isEven = idx % 2 === 0;
          ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
          ctx.fillRect(padding, currentY, innerWidth, rowH);

          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(padding, currentY, innerWidth, rowH);

          const isBenar = item.is_benar === 1;
          const isSalah = item.is_benar === 0;
          const isKosong = !item.jawaban_siswa || item.jawaban_siswa.trim() === '';

          // No
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(String(item.urutan || (idx + 1)), padding + 14, currentY + 21);

          // Tipe
          ctx.fillStyle = '#64748b';
          ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const tipeName = item.tipe === 'pg' ? 'Pilihan Ganda' : item.tipe === 'isian' ? 'Isian' : item.tipe === 'benar_salah' ? 'B / S' : 'Uraian';
          ctx.fillText(tipeName, padding + 48, currentY + 21);

          // Jawaban Siswa
          ctx.fillStyle = '#0f172a';
          ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const jwb = isKosong ? '(Tidak Dijawab)' : fitText(ctx, item.jawaban_siswa || '-', 230);
          ctx.fillText(jwb, padding + 180, currentY + 21);

          // Kunci
          ctx.fillStyle = '#334155';
          ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const kunci = fitText(ctx, item.kunci_jawaban || '-', 100);
          ctx.fillText(kunci, padding + 430, currentY + 21);

          // Skor
          ctx.fillStyle = '#1e293b';
          ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(`${item.nilai_soal ?? 0} / ${item.bobot || 10}`, padding + 540, currentY + 21);

          // Status Badge
          let statText = 'Benar';
          let statColor = '#15803d';
          let statBg = '#dcfce7';

          if (isSalah) {
            statText = 'Salah';
            statColor = '#b91c1c';
            statBg = '#fee2e2';
          } else if (isKosong) {
            statText = 'Kosong';
            statColor = '#64748b';
            statBg = '#f1f5f9';
          } else if (item.tipe === 'uraian' && item.is_benar === null) {
            statText = 'Review';
            statColor = '#b45309';
            statBg = '#fef3c7';
          }

          ctx.fillStyle = statBg;
          drawRoundedRect(ctx, padding + 670, currentY + 6, 80, 22, 6, true, false);

          ctx.fillStyle = statColor;
          ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(statText, padding + 682, currentY + 20);

          currentY += rowH;
        });

        currentY += 16;
      }
    }

    // 6. Footer Section
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(padding + innerWidth, currentY);
    ctx.stroke();

    currentY += 18;

    // Left Footer: Information & Timestamp
    ctx.fillStyle = '#475569';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Aplikasi Asesmen Ulangan Digital', padding, currentY + 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Dokumen ini digenerate secara otomatis oleh sistem evaluasi digital.', padding, currentY + 34);

    const nowStr = formatWIB(new Date(), true);
    ctx.fillText(`Dicetak pada: ${nowStr}`, padding, currentY + 52);

    // Right Footer: Teacher Signature Space (dynamic line length matching teacher name and centered)
    const teacherName = guruNama || sesi?.guru_nama || 'Guru Pengampu';
    const signBoxWidth = 240;
    const signX = padding + innerWidth - signBoxWidth;
    const signCenterX = signX + signBoxWidth / 2;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#334155';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Mengetahui / Guru Pengampu,', signCenterX, currentY + 16);

    // Measure teacher name width dynamically
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const nameWidth = ctx.measureText(teacherName).width;
    const lineWidth = Math.max(nameWidth + 16, 80);
    const lineStartX = signCenterX - lineWidth / 2;
    const lineEndX = signCenterX + lineWidth / 2;

    // Centered dynamic signature line
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(lineStartX, currentY + 70);
    ctx.lineTo(lineEndX, currentY + 70);
    ctx.stroke();

    // Centered teacher name directly beneath the line
    ctx.fillStyle = '#0f172a';
    ctx.fillText(teacherName, signCenterX, currentY + 88);
    ctx.textAlign = 'left';

    // Return Data URL
    try {
      const dataUrl = canvas.toDataURL('image/png');
      resolve(dataUrl);
    } catch (err) {
      console.error('Failed to export canvas image', err);
      resolve(null);
    }
  });
}

/**
 * Trigger immediate browser download of the image
 */
export function downloadResultImage(dataUrl, filename = 'Hasil_Ujian.png') {
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Copy image to clipboard for instant pasting into WhatsApp
 */
export async function copyImageToClipboard(dataUrl) {
  if (typeof window === 'undefined' || !navigator.clipboard || !window.ClipboardItem) {
    throw new Error('Clipboard API tidak didukung pada browser ini.');
  }

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob })
  ]);
  return true;
}
