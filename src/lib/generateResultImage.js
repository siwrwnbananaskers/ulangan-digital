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

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function getStudentInitials(name) {
  if (!name) return 'S';
  const clean = String(name).replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function generateResultImage({ sesi, jawaban = [], mode = 'ringkas', guruNama = '', guruTtd = null }) {
  return new Promise(async (resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 3; // Ultra-HD 3x resolution for crystal-clear sharing and printing (zero blur/pixelation)

    const width = 850;
    const padding = 28;
    const innerWidth = width - padding * 2;

    // Maintain student's unique randomized order as answered in exam:
    // 1. Keep objective questions (Pilihan Ganda & Benar/Salah) grouped on top
    // 2. Keep subjective questions (Isian & Uraian/Essay) grouped on the bottom
    // 3. Do NOT sort by master urutan (uA - uB) so each student's unique randomized questions are preserved!
    const rawList = Array.isArray(jawaban) ? jawaban : [];
    const listJawaban = [...rawList].sort((a, b) => {
      const isObjA = a.tipe === 'pg' || a.tipe === 'benar_salah';
      const isObjB = b.tipe === 'pg' || b.tipe === 'benar_salah';
      if (isObjA && !isObjB) return -1;
      if (!isObjA && isObjB) return 1;
      return 0; // Stable sort: preserves the exact randomized order the student answered
    });
    const hasJawaban = listJawaban.length > 0;

    // Calculate dynamic height based on mode
    let contentHeight = 0;
    const headerHeight = 90;
    const studentInfoHeight = 118;
    const scoreHeroHeight = 150;
    const footerHeight = 125;

    const listObj = listJawaban.filter((j) => j.tipe === 'pg' || j.tipe === 'benar_salah');
    const listSubj = listJawaban.filter((j) => j.tipe !== 'pg' && j.tipe !== 'benar_salah');

    let questionSectionHeight = 0;
    if (mode === 'ringkas') {
      if (hasJawaban) {
        let secH = 40; // Main section title
        if (listObj.length > 0) {
          const pgRows = Math.ceil(listObj.length / 5);
          const hasBoth = listSubj.length > 0;
          secH += (hasBoth ? 24 : 0) + pgRows * 42 + 10;
        }
        if (listSubj.length > 0) {
          const hasBoth = listObj.length > 0;
          secH += (hasBoth ? 28 : 0) + listSubj.length * 44 + 6;
        }
        questionSectionHeight = secH;
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
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

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

    // Student Profile Avatar / Personalized Initials in Header
    const avatarX = padding + 18;
    const avatarY = currentY + 18;
    const avatarSize = 54;

    let avatarImg = null;
    if (sesi?.foto_profil) {
      try {
        avatarImg = await loadImage(sesi.foto_profil);
      } catch (e) {
        avatarImg = null;
      }
    }

    if (avatarImg) {
      ctx.save();
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 12, false, false);
      ctx.clip();
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 12, false, true);
    } else {
      // Rounded badge with student's actual initials (e.g. 'AR' for Abdul Rahman)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 12, true, true);

      const initials = getStudentInitials(sesi?.nama);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    // App Title & Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('LEMBAR HASIL UJIAN SISWA', padding + 86, currentY + 41);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '500 13px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Sistem Asesmen Ulangan Digital • Dokumen Hasil Resmi', padding + 86, currentY + 61);

    // Right Status Badge in Header
    const isSelesai = sesi?.status === 'selesai';
    const statusText = isSelesai ? 'SELESAI DIKUMPULKAN' : 'SEDANG MENGERJAKAN';
    ctx.font = 'bold 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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
    ctx.font = 'bold 19px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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
    ctx.font = '500 13px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Kelas: ${sesi?.kelas || '-'} (Absen: ${sesi?.no_absen || '-'})`, padding + 18, currentY + 68);

    // Right: Ujian
    ctx.fillStyle = '#1e293b';
    ctx.font = '600 13px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const judulUjian = fitText(ctx, `Ujian: ${sesi?.ujian_judul || '-'}`, 360);
    ctx.fillText(judulUjian, padding + 360, currentY + 68);

    // Row 3:
    // Left: Mapel
    ctx.fillStyle = '#475569';
    ctx.font = '500 13px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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

    // Left Box: Nilai Akhir (White background, centered text)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, padding, currentY, heroScoreWidth, heroScoreHeight, 14, true, true);

    const heroCenterX = padding + heroScoreWidth / 2;
    ctx.textAlign = 'center';

    ctx.fillStyle = '#64748b';
    ctx.font = '700 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('NILAI AKHIR SISWA', heroCenterX, currentY + 30);

    ctx.fillStyle = isLulus ? '#16a34a' : '#dc2626';
    ctx.font = '900 60px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(String(totalNilai), heroCenterX, currentY + 95);

    // KKM Pill (Centered inside Hero Score Box)
    const pillText = isLulus ? `TUNTAS KKM (${kkm})` : `REMIDIAL (KKM: ${kkm})`;
    ctx.font = 'bold 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const pillWidth = ctx.measureText(pillText).width + 20;
    const pillX = padding + (heroScoreWidth - pillWidth) / 2;
    ctx.fillStyle = isLulus ? '#dcfce7' : '#fee2e2';
    drawRoundedRect(ctx, pillX, currentY + 112, pillWidth, 24, 6, true, false);

    ctx.fillStyle = isLulus ? '#15803d' : '#b91c1c';
    ctx.fillText(pillText, heroCenterX, currentY + 128);

    // Calculate exact statistics (Benar Penuh, Nilai Sebagian / Parsial, Salah, Kosong)
    let countBenar = 0;
    let countSebagian = 0;
    let countSalah = 0;
    let countKosong = 0;

    listJawaban.forEach((item) => {
      const bobot = Number(item.bobot) || (item.tipe === 'uraian' ? 8 : 4);
      const score = item.nilai_soal !== null && item.nilai_soal !== undefined ? Number(item.nilai_soal) : null;
      const isKosong = !item.jawaban_siswa || item.jawaban_siswa.trim() === '';

      if (isKosong && (score === null || score === 0)) {
        countKosong++;
      } else if (score !== null) {
        if (score >= bobot) {
          countBenar++;
        } else if (score > 0) {
          countSebagian++;
        } else {
          countSalah++;
        }
      } else if (item.is_benar === 1) {
        countBenar++;
      } else {
        countSalah++;
      }
    });

    if (listJawaban.length === 0) {
      countBenar = sesi?.jumlah_benar ?? 0;
      countSalah = sesi?.jumlah_salah ?? 0;
      countKosong = sesi?.jumlah_kosong ?? 0;
    }

    // Right Side: 4 Stat Cards (2x2 Grid) - White cards with centered text
    const statsX = padding + heroScoreWidth + 14;
    const statsWidth = innerWidth - heroScoreWidth - 14;
    const statCardW = (statsWidth - 12) / 2;
    const statCardH = (heroScoreHeight - 12) / 2;

    const statBoxes = [
      {
        label: 'Jawaban Benar',
        val: `${countBenar} Butir`,
        sub: 'Poin Penuh',
        color: '#16a34a',
        bg: '#ffffff',
        border: '#e2e8f0',
      },
      countSebagian > 0 ? {
        label: 'Nilai Sebagian',
        val: `${countSebagian} Butir`,
        sub: 'Uraian Parsial',
        color: '#d97706',
        bg: '#fffbeb',
        border: '#fde68a',
      } : {
        label: 'Jawaban Salah',
        val: `${countSalah} Butir`,
        sub: 'Skor Nol',
        color: countSalah > 0 ? '#dc2626' : '#64748b',
        bg: '#ffffff',
        border: '#e2e8f0',
      },
      countSebagian > 0 ? {
        label: 'Jawaban Salah',
        val: `${countSalah} Butir`,
        sub: 'Skor Nol',
        color: countSalah > 0 ? '#dc2626' : '#64748b',
        bg: '#ffffff',
        border: '#e2e8f0',
      } : {
        label: 'Tidak Dijawab',
        val: `${countKosong} Butir`,
        sub: 'Butir Kosong',
        color: '#64748b',
        bg: '#ffffff',
        border: '#e2e8f0',
      },
      {
        label: 'Integritas / Audit',
        val: `${sesi?.jumlah_pelanggaran ?? 0}x`,
        sub: (sesi?.jumlah_pelanggaran || 0) > 0 ? 'Pelanggaran Tab' : 'Sangat Tertib',
        color: (sesi?.jumlah_pelanggaran || 0) > 0 ? '#dc2626' : '#16a34a',
        bg: '#ffffff',
        border: '#e2e8f0',
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

      const cardCenterX = bx + statCardW / 2;
      ctx.textAlign = 'center';

      ctx.fillStyle = '#64748b';
      ctx.font = '600 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(item.label, cardCenterX, by + 22);

      ctx.fillStyle = item.color;
      ctx.font = 'bold 18px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(item.val, cardCenterX, by + 46);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(item.sub, cardCenterX, by + 63);
    });

    // Reset textAlign to default left
    ctx.textAlign = 'left';

    currentY += scoreHeroHeight + 16;

    // 5. Question Breakdown Section
    if (questionSectionHeight > 0) {
      if (mode === 'ringkas') {
        // Section Header
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('REKAPITULASI BUTIR SOAL', padding, currentY + 16);

        ctx.fillStyle = '#64748b';
        ctx.font = '500 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('Rincian jawaban siswa dan skor per butir pertanyaan:', padding, currentY + 32);

        currentY += 42;

        // 1. Pilihan Ganda (Grid Chips)
        if (listObj.length > 0) {
          if (listSubj.length > 0) {
            ctx.fillStyle = '#334155';
            ctx.font = 'bold 12px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText('A. Pilihan Ganda', padding, currentY + 14);

            ctx.fillStyle = '#64748b';
            ctx.font = '500 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(`(${listObj.length} Butir)`, padding + ctx.measureText('A. Pilihan Ganda ').width + 4, currentY + 14);

            currentY += 24;
          }

          const cols = 5;
          const chipGap = 8;
          const chipWidth = (innerWidth - chipGap * (cols - 1)) / cols;
          const chipHeight = 34;

          listObj.forEach((item, oIdx) => {
            const col = oIdx % cols;
            const row = Math.floor(oIdx / cols);
            const cx = padding + col * (chipWidth + chipGap);
            const cy = currentY + row * (chipHeight + chipGap);

            const bobot = Number(item.bobot) || 4;
            const score = item.nilai_soal !== null && item.nilai_soal !== undefined ? Number(item.nilai_soal) : null;
            const isKosong = !item.jawaban_siswa || item.jawaban_siswa.trim() === '';

            let chipBg = '#f8fafc';
            let chipBorder = '#e2e8f0';
            let chipColor = '#475569';

            if (isKosong && (score === null || score === 0)) {
              chipBg = '#f8fafc';
              chipBorder = '#cbd5e1';
              chipColor = '#64748b';
            } else if (score !== null) {
              if (score >= bobot) {
                chipBg = '#f0fdf4';
                chipBorder = '#86efac';
                chipColor = '#15803d';
              } else if (score > 0) {
                chipBg = '#fffbeb';
                chipBorder = '#fde68a';
                chipColor = '#b45309';
              } else {
                chipBg = '#fef2f2';
                chipBorder = '#fca5a5';
                chipColor = '#b91c1c';
              }
            } else if (item.is_benar === 1) {
              chipBg = '#f0fdf4';
              chipBorder = '#86efac';
              chipColor = '#15803d';
            } else {
              chipBg = '#fef2f2';
              chipBorder = '#fca5a5';
              chipColor = '#b91c1c';
            }

            ctx.fillStyle = chipBg;
            ctx.strokeStyle = chipBorder;
            ctx.lineWidth = 1;
            drawRoundedRect(ctx, cx, cy, chipWidth, chipHeight, 8, true, true);

            // Question number
            ctx.textAlign = 'left';
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(`#${oIdx + 1}`, cx + 8, cy + 21);

            // Answer text
            ctx.fillStyle = chipColor;
            ctx.font = 'bold 12px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const ansText = isKosong ? 'Kosong' : (item.jawaban_siswa || '-').toUpperCase().slice(0, 2);
            ctx.fillText(ansText, cx + 36, cy + 21);

            // Points on right
            ctx.textAlign = 'right';
            ctx.fillStyle = '#64748b';
            ctx.font = '600 10px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(`${item.nilai_soal ?? 0}p`, cx + chipWidth - 8, cy + 21);
            ctx.textAlign = 'left';
          });

          const pgRows = Math.ceil(listObj.length / cols);
          currentY += pgRows * (chipHeight + chipGap) + 10;
        }

        // 2. Soal Uraian / Essay (Readable Horizontal Row Cards)
        if (listSubj.length > 0) {
          if (listObj.length > 0) {
            ctx.fillStyle = '#334155';
            ctx.font = 'bold 12px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText('B. Soal Uraian / Essay', padding, currentY + 16);

            ctx.fillStyle = '#64748b';
            ctx.font = '500 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(`(${listSubj.length} Butir)`, padding + ctx.measureText('B. Soal Uraian / Essay ').width + 4, currentY + 16);

            currentY += 28;
          }

          const cardH = 38;
          const cardGap = 6;

          listSubj.forEach((item, sIdx) => {
            const cy = currentY + sIdx * (cardH + cardGap);
            const qNum = listObj.length + sIdx + 1;
            const bobot = Number(item.bobot) || 8;
            const score = item.nilai_soal !== null && item.nilai_soal !== undefined ? Number(item.nilai_soal) : null;
            const isKosong = !item.jawaban_siswa || item.jawaban_siswa.trim() === '';

            let cardBg = '#f8fafc';
            let cardBorder = '#e2e8f0';
            let badgeBg = '#f1f5f9';
            let badgeColor = '#64748b';
            let statLabel = 'Kosong';

            if (isKosong && (score === null || score === 0)) {
              cardBg = '#f8fafc';
              cardBorder = '#cbd5e1';
              badgeBg = '#f1f5f9';
              badgeColor = '#64748b';
              statLabel = 'Kosong';
            } else if (score !== null) {
              if (score >= bobot) {
                cardBg = '#f0fdf4';
                cardBorder = '#bbf7d0';
                badgeBg = '#dcfce7';
                badgeColor = '#15803d';
                statLabel = 'Benar';
              } else if (score > 0) {
                cardBg = '#fffbeb';
                cardBorder = '#fde68a';
                badgeBg = '#fef3c7';
                badgeColor = '#b45309';
                statLabel = 'Sebagian';
              } else {
                cardBg = '#fef2f2';
                cardBorder = '#fecaca';
                badgeBg = '#fee2e2';
                badgeColor = '#b91c1c';
                statLabel = 'Skor Nol';
              }
            } else if (item.is_benar === 1) {
              cardBg = '#f0fdf4';
              cardBorder = '#bbf7d0';
              badgeBg = '#dcfce7';
              badgeColor = '#15803d';
              statLabel = 'Benar';
            } else if (item.is_benar === 0) {
              cardBg = '#fef2f2';
              cardBorder = '#fecaca';
              badgeBg = '#fee2e2';
              badgeColor = '#b91c1c';
              statLabel = 'Salah';
            }

            // Draw Card Container
            ctx.fillStyle = cardBg;
            ctx.strokeStyle = cardBorder;
            ctx.lineWidth = 1;
            drawRoundedRect(ctx, padding, cy, innerWidth, cardH, 8, true, true);

            // Left: Number Badge "#16 Uraian"
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 12px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`#${qNum}`, padding + 12, cy + 24);

            const numW = ctx.measureText(`#${qNum}`).width;
            ctx.fillStyle = '#64748b';
            ctx.font = '500 10.5px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText('Uraian', padding + 12 + numW + 6, cy + 23);

            // Center: Answer snippet
            const ansStartX = padding + 100;
            const maxAnsW = innerWidth - 100 - 155; // ~539px space for answer text

            if (isKosong) {
              ctx.fillStyle = '#94a3b8';
              ctx.font = 'italic 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              ctx.fillText('(Tidak dijawab / kosong)', ansStartX, cy + 24);
            } else {
              ctx.fillStyle = '#1e293b';
              ctx.font = '500 11.5px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
              const cleanAns = item.jawaban_siswa.replace(/\s+/g, ' ').trim();
              const snippet = fitText(ctx, `"${cleanAns}"`, maxAnsW);
              ctx.fillText(snippet, ansStartX, cy + 24);
            }

            // Right: Score & Status Pill
            const badgeW = 140;
            const badgeH = 24;
            const badgeX = padding + innerWidth - badgeW - 10;
            const badgeY = cy + (cardH - badgeH) / 2;

            ctx.fillStyle = badgeBg;
            drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 6, true, false);

            ctx.fillStyle = badgeColor;
            ctx.textAlign = 'center';
            ctx.font = 'bold 10px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            const scoreLabel = `${score ?? 0}/${bobot}p • ${statLabel}`;
            ctx.fillText(scoreLabel, badgeX + badgeW / 2, badgeY + 16);
            ctx.textAlign = 'left';
          });

          currentY += listSubj.length * (cardH + cardGap) + 12;
        }
      } else {
        // mode === 'lengkap' (Table Format)
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText('RINCIAN LENGKAP JAWABAN SISWA', padding, currentY + 16);

        currentY += 28;

        // Table Header
        const rowH = 34;
        ctx.fillStyle = '#f1f5f9';
        drawRoundedRect(ctx, padding, currentY, innerWidth, rowH, { tl: 8, tr: 8, br: 0, bl: 0 }, true, false);

        // Column Coordinates & Widths:
        // Total innerWidth = 794px
        // Col 1 (NO): 46px -> Center: padding + 23
        // Col 2 (TIPE SOAL): 100px -> Start: padding + 46, Left text: padding + 54
        // Col 3 (JAWABAN SISWA): 248px -> Start: padding + 146, Center: padding + 270
        // Col 4 (KUNCI): 160px -> Start: padding + 394, Center: padding + 474
        // Col 5 (NILAI / BOBOT): 110px -> Start: padding + 554, Center: padding + 609
        // Col 6 (STATUS): 130px -> Start: padding + 664, Center: padding + 729

        const colNoCenter = padding + 23;
        const colTipeLeft = padding + 54;
        const colJwbCenter = padding + 270;
        const colKunciCenter = padding + 474;
        const colSkorCenter = padding + 609;
        const colStatusCenter = padding + 729;

        ctx.fillStyle = '#334155';
        ctx.font = 'bold 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

        ctx.textAlign = 'center';
        ctx.fillText('NO', colNoCenter, currentY + 21);

        ctx.textAlign = 'left';
        ctx.fillText('TIPE SOAL', colTipeLeft, currentY + 21);

        ctx.textAlign = 'center';
        ctx.fillText('JAWABAN SISWA', colJwbCenter, currentY + 21);
        ctx.fillText('KUNCI', colKunciCenter, currentY + 21);
        ctx.fillText('NILAI / BOBOT', colSkorCenter, currentY + 21);
        ctx.fillText('STATUS', colStatusCenter, currentY + 21);

        currentY += rowH;

        listJawaban.forEach((item, idx) => {
          const isEven = idx % 2 === 0;
          ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
          ctx.fillRect(padding, currentY, innerWidth, rowH);

          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(padding, currentY, innerWidth, rowH);

          const bobot = Number(item.bobot) || (item.tipe === 'uraian' ? 8 : 4);
          const score = item.nilai_soal !== null && item.nilai_soal !== undefined ? Number(item.nilai_soal) : null;
          const isKosong = !item.jawaban_siswa || item.jawaban_siswa.trim() === '';

          // 1. NO (Center)
          ctx.textAlign = 'center';
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(String(idx + 1), colNoCenter, currentY + 21);

          // 2. TIPE SOAL (Left)
          ctx.textAlign = 'left';
          ctx.fillStyle = '#64748b';
          ctx.font = '500 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const tipeName = item.tipe === 'pg' ? 'Pilihan Ganda' : item.tipe === 'isian' ? 'Isian' : item.tipe === 'benar_salah' ? 'B / S' : 'Uraian';
          ctx.fillText(tipeName, colTipeLeft, currentY + 21);

          // 3. JAWABAN SISWA (Center)
          ctx.textAlign = 'center';
          ctx.fillStyle = '#0f172a';
          ctx.font = '600 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const jwb = isKosong ? '(Tidak Dijawab)' : fitText(ctx, item.jawaban_siswa || '-', 230);
          ctx.fillText(jwb, colJwbCenter, currentY + 21);

          // 4. KUNCI (Center)
          ctx.fillStyle = '#334155';
          ctx.font = '500 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const kunci = fitText(ctx, item.kunci_jawaban || '-', 140);
          ctx.fillText(kunci, colKunciCenter, currentY + 21);

          // 5. NILAI / BOBOT (Center)
          ctx.fillStyle = '#1e293b';
          ctx.font = '600 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          const skorText = `${item.nilai_soal ?? 0} / ${bobot}`;
          ctx.fillText(skorText, colSkorCenter, currentY + 21);

          // 6. STATUS (Center Badge)
          let statText = 'Benar';
          let statColor = '#15803d';
          let statBg = '#dcfce7';

          if (isKosong && (score === null || score === 0)) {
            statText = 'Kosong';
            statColor = '#64748b';
            statBg = '#f1f5f9';
          } else if (score !== null) {
            if (score >= bobot) {
              statText = 'Benar';
              statColor = '#15803d';
              statBg = '#dcfce7';
            } else if (score > 0) {
              statText = 'Sebagian';
              statColor = '#b45309';
              statBg = '#fef3c7';
            } else {
              statText = 'Salah';
              statColor = '#b91c1c';
              statBg = '#fee2e2';
            }
          } else if (item.is_benar === 1) {
            statText = 'Benar';
            statColor = '#15803d';
            statBg = '#dcfce7';
          } else if (item.is_benar === 0) {
            statText = 'Salah';
            statColor = '#b91c1c';
            statBg = '#fee2e2';
          } else if (item.tipe === 'uraian' && item.is_benar === null) {
            statText = 'Review';
            statColor = '#b45309';
            statBg = '#fef3c7';
          }

          const badgeW = 80;
          const badgeH = 22;
          const badgeX = colStatusCenter - badgeW / 2;
          const badgeY = currentY + (rowH - badgeH) / 2;

          ctx.fillStyle = statBg;
          drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 6, true, false);

          ctx.fillStyle = statColor;
          ctx.font = 'bold 10px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(statText, colStatusCenter, currentY + 21);

          currentY += rowH;
        });

        ctx.textAlign = 'left';
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
    ctx.font = '600 12px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Aplikasi Asesmen Ulangan Digital', padding, currentY + 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 11px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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
    ctx.font = '600 12px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Mengetahui / Guru Pengampu,', signCenterX, currentY + 16);

    // Draw digital signature if available
    const ttdSource = guruTtd || sesi?.guru_tanda_tangan || null;
    if (ttdSource) {
      try {
        const ttdImg = await loadImage(ttdSource);
        if (ttdImg) {
          const maxImgW = 120;
          const maxImgH = 46;
          let drawW = ttdImg.width;
          let drawH = ttdImg.height;
          const ratio = Math.min(maxImgW / drawW, maxImgH / drawH);
          drawW = Math.round(drawW * ratio);
          drawH = Math.round(drawH * ratio);
          ctx.drawImage(ttdImg, signCenterX - drawW / 2, currentY + 22 + (maxImgH - drawH) / 2, drawW, drawH);
        }
      } catch (err) {
        // ignore image draw error
      }
    }

    // Measure teacher name width dynamically
    ctx.font = 'bold 12px Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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
