'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useExamMode } from '@/hooks/useExamMode';
import { parseWaktuWIB } from '@/lib/utils';
import ConfirmModal, { useConfirmDialog } from '@/components/ConfirmModal';

export default function LembarUjianPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id;
  const { user, loading: authLoading, authFetch } = useAuth('siswa');

  // Exam Data
  const [ujian, setUjian] = useState(null);
  const [soalList, setSoalList] = useState([]);
  const [sesi, setSesi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const { dialogState, alert: showAlert, handleConfirm, handleClose } = useConfirmDialog();

  // Active question index (0-based)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Student answers { [soal_id]: string }
  const [jawabanMap, setJawabanMap] = useState({});
  // Flagged questions for review { [soal_id]: boolean }
  const [flaggedMap, setFlaggedMap] = useState({});

  // Autosave status
  const [autosaveStatus, setAutosaveStatus] = useState('tersimpan'); // 'tersimpan' | 'menyimpan' | 'offline'
  const isDirtyRef = useRef(false);

  // Remaining time in seconds
  const [timeLeft, setTimeLeft] = useState(null);
  const isTimeUpRef = useRef(false);

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMobileNavDrawer, setShowMobileNavDrawer] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Violation handling via hook
  const handleViolationCallback = useCallback(async (violationData) => {
    try {
      await authFetch(`/api/ujian/${examId}/violation`, {
        method: 'POST',
        body: JSON.stringify(violationData),
      });
    } catch (err) {
      console.warn('Failed to report violation to server', err);
    }
  }, [authFetch, examId]);

  const isExambroActive = ujian?.mode_exambro !== undefined ? !!ujian.mode_exambro : true;

  const {
    isFullscreen,
    violations,
    showWarning,
    warningMessage,
    isSuspended,
    enterFullscreen,
    dismissWarning,
    setViolations,
    setIsSuspended,
  } = useExamMode({
    enabled: !!sesi && !loading && isExambroActive,
    batasPelanggaran: ujian?.batas_pelanggaran || 3,
    onViolation: handleViolationCallback,
    sesiId: sesi?.id,
    ujianId: examId,
  });

  // Load Exam and Session Data
  useEffect(() => {
    if (!user || !examId) return;
    loadExamData();
  }, [user, examId]);

  const loadExamData = async () => {
    try {
      const res = await authFetch(`/api/ujian/${examId}?_t=${Date.now()}`, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal memuat ujian');
        setLoading(false);
        return;
      }

      setUjian(data.ujian);
      setSoalList(data.soal || []);
      setSesi(data.sesi);

      if (data.sesi?.status === 'selesai') {
        router.push(`/siswa/selesai?ujian_id=${examId}&sesi_id=${data.sesi.id}`);
        return;
      }

      if (data.sesi?.status === 'ditangguhkan') {
        setIsSuspended(true);
      }

      if (data.sesi?.jumlah_pelanggaran) {
        setViolations(data.sesi.jumlah_pelanggaran);
      }

      // Populate answers from server or localStorage
      const initialMap = {};
      if (data.jawaban && Array.isArray(data.jawaban)) {
        for (const j of data.jawaban) {
          initialMap[j.soal_id] = j.jawaban_siswa || '';
        }
      }

      // Check localStorage for offline backup
      try {
        const localBackup = localStorage.getItem(`exam_answers_${data.sesi?.id}`);
        if (localBackup) {
          const parsed = JSON.parse(localBackup);
          Object.assign(initialMap, parsed);
        }
      } catch {}

      setJawabanMap(initialMap);

      // Compute initial remaining time
      if (data.sesi?.waktu_mulai && data.ujian?.durasi_menit) {
        // SQLite datetime('now') is UTC (e.g. "2026-10-11 14:25:03")
        let waktuMulaiStr = String(data.sesi.waktu_mulai).trim().replace(' ', 'T');
        if (!waktuMulaiStr.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(waktuMulaiStr)) {
          waktuMulaiStr += 'Z';
        }
        const mulai = new Date(waktuMulaiStr).getTime();
        const batasDurasi = (isNaN(mulai) ? Date.now() : mulai) + (Number(data.ujian.durasi_menit) || 60) * 60 * 1000;
        const batasJadwal = parseWaktuWIB(data.ujian.jadwal_selesai);
        const batasAkhir = isNaN(batasJadwal) ? batasDurasi : Math.min(batasDurasi, batasJadwal);
        const remaining = Math.max(0, Math.floor((batasAkhir - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || isSuspended || loading) return;

    if (timeLeft <= 0) {
      if (!isTimeUpRef.current) {
        isTimeUpRef.current = true;
        handleAutoSubmit();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isTimeUpRef.current) {
            isTimeUpRef.current = true;
            handleAutoSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSuspended, loading]);

  // Periodic Autosave every 20 seconds
  useEffect(() => {
    if (!sesi?.id || isSuspended) return;

    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        performAutosave();
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [sesi, isSuspended, jawabanMap]);

  // Real-time unfreeze listener: when suspended, polls server every 2.5s to auto-unlock without browser reload!
  const batasPelanggaranVal = Number(ujian?.batas_pelanggaran) || 3;
  const isCurrentlyLocked = isSuspended || violations >= batasPelanggaranVal || sesi?.status === 'ditangguhkan';

  useEffect(() => {
    if (!isCurrentlyLocked || !examId) return;

    const unfreezePoll = setInterval(async () => {
      try {
        const res = await authFetch(`/api/ujian/${examId}?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          const serverSesi = data.sesi;
          const serverBatas = Number(data.ujian?.batas_pelanggaran) || 3;
          const serverViolations = Number(serverSesi?.jumlah_pelanggaran) || 0;

          // STRICT CHECK: An exam is ONLY restored if teacher explicitly un-froze it,
          // which resets status = 'berlangsung' AND jumlah_pelanggaran = 0.
          const isExplicitlyUnfrozenByTeacher =
            serverSesi &&
            serverSesi.status === 'berlangsung' &&
            serverViolations === 0;

          if (isExplicitlyUnfrozenByTeacher) {
            setIsSuspended(false);
            setShowWarning(false);
            setViolations(0);
            setSesi(serverSesi);
            // Re-request fullscreen if exam requires exambro
            if (data.ujian?.mode_exambro !== 0) {
              try {
                if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              } catch (_) {}
            }
          } else if (serverSesi?.status === 'ditangguhkan' || serverViolations >= serverBatas) {
            // Re-affirm lock from server authoritative data
            setIsSuspended(true);
            setShowWarning(true);
            setViolations(Math.max(violations, serverViolations));
          }
        }
      } catch (_) {}
    }, 2500);

    return () => clearInterval(unfreezePoll);
  }, [isCurrentlyLocked, examId, violations, setIsSuspended, setViolations]);

  const performAutosave = async () => {
    if (!sesi?.id) return;
    setAutosaveStatus('menyimpan');

    try {
      const payload = Object.entries(jawabanMap).map(([soal_id, jawaban_siswa]) => ({
        soal_id,
        jawaban_siswa,
      }));

      // Cache locally
      localStorage.setItem(`exam_answers_${sesi.id}`, JSON.stringify(jawabanMap));

      const res = await authFetch(`/api/ujian/${examId}/autosave`, {
        method: 'POST',
        body: JSON.stringify({
          sesi_id: sesi.id,
          jawaban: payload,
        }),
      });

      if (res.ok) {
        isDirtyRef.current = false;
        setAutosaveStatus('tersimpan');
      } else {
        setAutosaveStatus('offline');
      }
    } catch {
      setAutosaveStatus('offline');
    }
  };

  const handleAnswerChange = (val) => {
    if (isSuspended) return;
    const currentSoal = soalList[currentIndex];
    if (!currentSoal) return;

    setJawabanMap((prev) => {
      const updated = { ...prev, [currentSoal.id]: val };
      try {
        localStorage.setItem(`exam_answers_${sesi?.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    isDirtyRef.current = true;
  };

  const toggleFlag = () => {
    const currentSoal = soalList[currentIndex];
    if (!currentSoal) return;
    setFlaggedMap((prev) => ({
      ...prev,
      [currentSoal.id]: !prev[currentSoal.id],
    }));
  };

  // Submit Handler
  const handleSubmitExam = async (isForce = false) => {
    if (isSubmitting) return;
    const currentSesiId = sesi?.id;
    if (!currentSesiId) {
      console.warn('Session ID not found yet');
      return;
    }
    setIsSubmitting(true);

    try {
      // Final autosave first
      const payload = Object.entries(jawabanMap).map(([soal_id, jawaban_siswa]) => ({
        soal_id,
        jawaban_siswa,
      }));

      const res = await authFetch(`/api/ujian/${examId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          sesi_id: currentSesiId,
          jawaban: payload,
          force: isForce,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Clear local backup
        try {
          localStorage.removeItem(`exam_answers_${currentSesiId}`);
        } catch {}
        router.push(`/siswa/selesai?ujian_id=${examId}&sesi_id=${currentSesiId}`);
      } else {
        await showAlert({
          title: 'Gagal Mengumpulkan Ujian',
          message: data.error || 'Gagal mengumpulkan lembar jawaban ujian.',
          type: 'danger',
        });
        setIsSubmitting(false);
      }
    } catch {
      await showAlert({
        title: 'Kesalahan Jaringan',
        message: 'Terjadi kesalahan koneksi saat mengumpulkan ujian. Silakan coba lagi.',
        type: 'danger',
      });
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    handleSubmitExam(true);
  };

  // Format time remaining MM:SS or HH:MM:SS
  const formatTimerString = (seconds) => {
    if (seconds === null || seconds <= 0) return '00:00';
    const jam = Math.floor(seconds / 3600);
    const sisa = seconds % 3600;
    const menit = Math.floor(sisa / 60);
    const detik = sisa % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (jam > 0) {
      return `${pad(jam)}:${pad(menit)}:${pad(detik)}`;
    }
    return `${pad(menit)}:${pad(detik)}`;
  };

  if (authLoading || loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <p>Memuat lembar ujian & memverifikasi sesi...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="app-container">
        <main className="main-content">
          <div className="card" style={{ maxWidth: 600, margin: 'var(--space-3xl) auto', textAlign: 'center' }}>
            <div className="alert alert-danger" style={{ marginBottom: 'var(--space-lg)' }}>
              {errorMsg}
            </div>
            <a href="/siswa/dashboard" className="btn btn-secondary">
              Kembali ke Dashboard
            </a>
          </div>
        </main>
      </div>
    );
  }

  const currentSoal = soalList[currentIndex];
  const currentAnswer = currentSoal ? (jawabanMap[currentSoal.id] || '') : '';
  const isCurrentFlagged = currentSoal ? !!flaggedMap[currentSoal.id] : false;

  const totalAnswered = Object.values(jawabanMap).filter((v) => v !== '' && v !== undefined).length;
  const totalUnanswered = soalList.length - totalAnswered;

  const timerWarningClass = timeLeft !== null && timeLeft <= 60 ? 'danger' : timeLeft !== null && timeLeft <= 300 ? 'warning' : '';

  return (
    <div className="exam-container">
      {/* Violation / Suspended Overlay */}
      {showWarning && (
        <div className="violation-overlay">
          <div className={`violation-card ${isCurrentlyLocked ? 'suspended-card' : ''}`}>
            <div className="violation-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2>{isCurrentlyLocked ? 'Ujian Ditangguhkan!' : 'Peringatan Pelanggaran!'}</h2>
            <p>
              {isCurrentlyLocked
                ? 'Akun ujian Anda dinonaktifkan sementara karena mencapai batas pelanggaran integritas.'
                : warningMessage || 'Terdeteksi aktivitas meninggalkan halaman ujian. Silakan kembali ke lembar ujian.'}
            </p>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <span className="violation-count">
                {violations} / {ujian?.batas_pelanggaran || 3}
              </span>
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                Jumlah aktivitas meninggalkan halaman terdeteksi
              </p>
            </div>

            {isCurrentlyLocked ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#991b1b', fontSize: 13, textAlign: 'left', lineHeight: 1.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 4, color: '#b91c1c' }}>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#ef4444', borderTopColor: 'transparent', display: 'inline-block' }} />
                  <span>Ujian Terkunci — Menunggu Verifikasi Pengawas</span>
                </div>
                <p style={{ margin: '4px 0 0', color: '#7f1d1d' }}>
                  Batas pelanggaran tercapai ({ujian?.batas_pelanggaran || 3}x). Segera hubungi Guru Pengawas untuk pemulihan.
                  Lembar ujian akan terbuka otomatis tanpa refresh begitu Guru Pengawas menekan tombol Pulihkan di dashboard.
                </p>
                <div style={{ marginTop: 10, padding: '6px 10px', background: '#fee2e2', borderRadius: 6, fontSize: 11, color: '#991b1b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderColor: 'rgba(153, 27, 27, 0.2)', borderTopColor: '#991b1b' }} />
                  <span>Mengecek status pemulihan secara real-time...</span>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-danger btn-lg btn-block"
                onClick={dismissWarning}
              >
                Saya Mengerti, Kembali ke Ujian
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Bar with Timer, Status, and Controls */}
      <header className="exam-topbar">
        <div className="exam-topbar-main">
          {/* Left: Exam Info & Student Identity */}
          <div className="exam-meta-box">
            <div className="exam-title-row">
              <h1 className="exam-title-text" title={ujian?.judul}>
                {ujian?.judul || 'Ujian Digital'}
              </h1>
              {ujian?.mode_exambro === 0 ? (
                <span className="exam-mode-badge flexible">
                  Mode Fleksibel
                </span>
              ) : (
                <span className="exam-mode-badge kiosk">
                  Exambro Aman
                </span>
              )}
            </div>
            <div className="exam-student-row">
              <span className="exam-student-name">{user?.nama || 'Siswa'}</span>
              <span className="exam-dot-separator">•</span>
              <span className="exam-student-class">Kelas {user?.kelas || '-'}</span>
              {ujian?.mata_pelajaran && (
                <>
                  <span className="exam-dot-separator">•</span>
                  <span>{ujian.mata_pelajaran}</span>
                </>
              )}
            </div>

            {/* Mobile: Compact Status & Progress in single header bar */}
            <div className="exam-mobile-status-row">
              <span className="exam-status-chip">
                <span className={`exam-sync-dot ${autosaveStatus === 'tersimpan' ? 'success' : autosaveStatus === 'offline' ? 'warning' : 'spinning'}`} />
                <span>{autosaveStatus === 'tersimpan' ? 'Tersimpan' : autosaveStatus === 'offline' ? 'Offline' : 'Menyimpan...'}</span>
              </span>
              <span className="exam-dot-separator">•</span>
              <span className="exam-mobile-progress-text">{totalAnswered}/{soalList.length} Terjawab</span>
            </div>
          </div>

          {/* Right: Timer Pill, Mobile Drawer Toggle, and Desktop Submit */}
          <div className="exam-topbar-actions">
            <div className={`exam-timer-pill ${timerWarningClass}`}>
              <svg className="exam-timer-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{formatTimerString(timeLeft)}</span>
            </div>

            {/* Mobile Question Grid Drawer Button */}
            <button
              type="button"
              className="btn btn-secondary btn-sm exam-mobile-nav-toggle"
              onClick={() => setShowMobileNavDrawer(true)}
              style={{ padding: '6px 10px', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>{currentIndex + 1}/{soalList.length}</span>
            </button>

            {/* Desktop Direct Submit Button */}
            <button
              type="button"
              className="btn btn-success btn-sm exam-desktop-finish-btn"
              onClick={() => setShowSubmitModal(true)}
              id="btn-kumpulkan-ujian"
              style={{ fontWeight: 700 }}
            >
              Kumpulkan Ujian
            </button>
          </div>
        </div>

        {/* Sub-bar: Autosave status & Answer Progress */}
        <div className="exam-subbar">
          <div className="exam-autosave-indicator">
            {autosaveStatus === 'menyimpan' && (
              <>
                <span className="exam-sync-dot spinning" />
                <span className="text-muted">Menyimpan...</span>
              </>
            )}
            {autosaveStatus === 'tersimpan' && (
              <>
                <span className="exam-sync-dot success" />
                <span style={{ color: '#059669', fontWeight: 600 }}>Tersimpan</span>
              </>
            )}
            {autosaveStatus === 'offline' && (
              <>
                <span className="exam-sync-dot warning" />
                <span style={{ color: '#d97706', fontWeight: 600 }}>Tersimpan Offline</span>
              </>
            )}
          </div>

          <div className="exam-progress-info">
            <span>Terjawab: <strong>{totalAnswered}</strong> dari {soalList.length} soal</span>
          </div>
        </div>
      </header>

      {/* Main Exam Body */}
      <div className="exam-body">
        {/* Left / Center: Question Panel */}
        <main className="exam-question-panel">
          {currentSoal ? (
            <div className="question-card">
              {/* Question Card Header: Number pill, Type badge, Flag button */}
              <div className="exam-card-head">
                <div className="exam-qnum-badges">
                  <span className="exam-qnum-pill">
                    Soal {currentIndex + 1}
                  </span>
                  <span className="exam-qtype-pill">
                    {currentSoal.tipe === 'pg' ? 'Pilihan Ganda' :
                     currentSoal.tipe === 'isian' ? 'Isian Singkat' :
                     currentSoal.tipe === 'benar_salah' ? 'Benar / Salah' : 'Uraian'}
                  </span>
                </div>

                <button
                  type="button"
                  className={`exam-flag-btn ${isCurrentFlagged ? 'flagged' : ''}`}
                  onClick={toggleFlag}
                  title={isCurrentFlagged ? 'Hilangkan tanda ragu' : 'Tandai ragu-ragu'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isCurrentFlagged ? '#f59e0b' : 'none'} stroke={isCurrentFlagged ? '#f59e0b' : 'currentColor'} strokeWidth="2.2">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                  <span>{isCurrentFlagged ? 'Ragu-ragu' : 'Ragu'}</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="exam-question-text">
                {currentSoal.pertanyaan}
              </div>

              {/* Soal Bergambar (Jika tersedia gambar pada butir soal) */}
              {currentSoal.gambar && (
                <div className="exam-question-image-box">
                  <img
                    src={currentSoal.gambar}
                    alt={`Gambar Soal No. ${displayNumber}`}
                    className="exam-question-img"
                    onClick={() => setLightboxImage(currentSoal.gambar)}
                    title="Klik untuk memperbesar gambar (HD)"
                  />
                  <div className="exam-question-image-caption">
                    <span>🖼️ Gambar pendukung butir soal</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11, color: '#2563eb', fontWeight: 600, height: 26 }}
                      onClick={() => setLightboxImage(currentSoal.gambar)}
                    >
                      🔍 Perbesar Gambar (HD)
                    </button>
                  </div>
                </div>
              )}

              {/* Input for Answers depending on Question Type */}
              <div className="exam-answer-area">
                {/* 1. Multiple Choice (PG) */}
                {currentSoal.tipe === 'pg' && (
                  <div className="exam-options-list">
                    {['a', 'b', 'c', 'd', 'e'].map((letter) => {
                      const text = currentSoal[`pilihan_${letter}`];
                      if (!text) return null;
                      const isSelected = currentAnswer.toLowerCase() === letter;

                      return (
                        <div
                          key={letter}
                          className={`exam-option-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleAnswerChange(letter)}
                        >
                          <div className={`exam-option-letter ${isSelected ? 'selected' : ''}`}>
                            {letter.toUpperCase()}
                          </div>
                          <div className="exam-option-content">{text}</div>
                          {isSelected && (
                            <div className="exam-option-check">✓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Isian Singkat */}
                {currentSoal.tipe === 'isian' && (
                  <div className="exam-answer-box">
                    <label className="exam-answer-label">
                      Ketikkan Jawaban Anda:
                    </label>
                    <div className="exam-input-wrap">
                      <input
                        type="text"
                        className="exam-text-input"
                        placeholder="Ketik jawaban singkat di sini..."
                        value={currentAnswer}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                      {currentAnswer && (
                        <span className="exam-input-status">✓ Terisi</span>
                      )}
                    </div>
                    <p className="exam-answer-hint">
                      Jawaban Anda akan tersimpan otomatis saat Anda mengetik.
                    </p>
                  </div>
                )}

                {/* 3. Benar / Salah */}
                {currentSoal.tipe === 'benar_salah' && (
                  <div className="exam-truefalse-grid">
                    {['Benar', 'Salah'].map((val) => {
                      const isSelected = currentAnswer.toLowerCase() === val.toLowerCase();
                      const isBenar = val === 'Benar';
                      return (
                        <button
                          key={val}
                          type="button"
                          className={`exam-tf-card ${isBenar ? 'benar' : 'salah'} ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleAnswerChange(val)}
                        >
                          <span className="exam-tf-icon">{isBenar ? '✓' : '✕'}</span>
                          <span className="exam-tf-label">{val}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 4. Uraian */}
                {currentSoal.tipe === 'uraian' && (
                  <div className="exam-answer-box">
                    <label className="exam-answer-label">
                      Tuliskan Uraian / Penjelasan Jawaban Lengkap:
                    </label>
                    <textarea
                      className="exam-textarea-input"
                      rows={6}
                      placeholder="Tuliskan uraian jawaban Anda di sini..."
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                    />
                    <p className="exam-answer-hint">
                      Jawaban uraian akan dikoreksi dan dinilai langsung oleh guru.
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom Nav Buttons */}
              <div className="exam-card-foot">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  <span>Sebelumnya</span>
                </button>

                {/* Mobile Drawer Trigger button */}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm exam-mobile-nav-toggle"
                  onClick={() => setShowMobileNavDrawer(true)}
                  style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>No. {currentIndex + 1} dari {soalList.length}</span>
                </button>

                {currentIndex < soalList.length - 1 ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setCurrentIndex((prev) => Math.min(soalList.length - 1, prev + 1))}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, padding: '7px 16px' }}
                  >
                    <span>Selanjutnya</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => setShowSubmitModal(true)}
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px' }}
                  >
                    <span>Kumpulkan Ujian</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <p>Tidak ada soal pada ujian ini.</p>
              </div>
            </div>
          )}
        </main>

        {/* Right: Question Navigator Sidebar */}
        <aside className="exam-sidebar">
          <div className="question-nav">
            <div className="question-nav-title">Navigasi Nomor Soal</div>

            <div className="question-nav-grid">
              {soalList.map((soal, idx) => {
                const ans = jawabanMap[soal.id];
                const hasAnswer = ans !== undefined && ans !== '';
                const isFlagged = flaggedMap[soal.id];
                const isActive = idx === currentIndex;

                let cls = 'question-nav-btn';
                if (isActive) cls += ' active';
                else if (isFlagged) cls += ' flagged';
                else if (hasAnswer) cls += ' answered';

                return (
                  <button
                    key={soal.id}
                    className={cls}
                    onClick={() => setCurrentIndex(idx)}
                    title={`Nomor ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="question-nav-legend">
              <div className="legend-item">
                <div className="legend-dot current" />
                <span>Sedang dibuka</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot answered" />
                <span>Sudah dijawab</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: 'var(--warning-light)', borderColor: 'var(--warning)' }} />
                <span>Ragu-ragu</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot empty" />
                <span>Belum dijawab</span>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--gray-100)', fontSize: 'var(--font-size-xs)', color: 'var(--gray-500)' }}>
              <div>Terjawab: <strong>{totalAnswered}</strong> / {soalList.length}</div>
              {violations > 0 && (
                <div style={{ color: 'var(--danger)', marginTop: 4 }}>
                  Pelanggaran: <strong>{violations}</strong> / {ujian?.batas_pelanggaran || 3}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Question Navigator Drawer (Sheet) */}
      {showMobileNavDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
          onClick={() => setShowMobileNavDrawer(false)}
        >
          <div
            style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: 500,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '20px 20px 28px',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.2)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 40, height: 4, background: '#cbd5e1', borderRadius: 99 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                  Daftar Nomor Soal
                </h3>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Terjawab: <strong>{totalAnswered}</strong> dari {soalList.length} soal
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowMobileNavDrawer(false)}
                style={{ fontSize: 18, padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Grid of numbers */}
            <div className="question-nav-grid" style={{ marginBottom: 18 }}>
              {soalList.map((soal, idx) => {
                const ans = jawabanMap[soal.id];
                const hasAnswer = ans !== undefined && ans !== '';
                const isFlagged = flaggedMap[soal.id];
                const isActive = idx === currentIndex;

                let cls = 'question-nav-btn';
                if (isActive) cls += ' active';
                else if (isFlagged) cls += ' flagged';
                else if (hasAnswer) cls += ' answered';

                return (
                  <button
                    key={soal.id}
                    className={cls}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowMobileNavDrawer(false);
                    }}
                    title={`Nomor ${idx + 1}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="question-nav-legend" style={{ marginBottom: 20 }}>
              <div className="legend-item">
                <div className="legend-dot current" />
                <span>Aktif</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot answered" />
                <span>Dijawab</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: '#fef3c7', borderColor: '#f59e0b' }} />
                <span>Ragu</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot empty" />
                <span>Belum</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-success btn-block btn-lg"
              onClick={() => {
                setShowMobileNavDrawer(false);
                setShowSubmitModal(true);
              }}
              style={{ fontWeight: 700 }}
            >
              Kumpulkan Ujian Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Konfirmasi Pengumpulan Ujian</h2>
              <button
                className="modal-close"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
              Apakah Anda yakin ingin menyelesaikan dan mengumpulkan lembar jawaban ujian <strong>{ujian?.judul}</strong>?
            </p>

            <div style={{ background: 'var(--gray-50)', padding: 'var(--space-md)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 'var(--font-size-sm)' }}>
                <span>Total Soal:</span>
                <strong>{soalList.length} Butir</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 'var(--font-size-sm)', color: 'var(--success)' }}>
                <span>Sudah Dijawab:</span>
                <strong>{totalAnswered} Butir</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 'var(--font-size-sm)', color: totalUnanswered > 0 ? 'var(--danger)' : 'var(--gray-500)' }}>
                <span>Belum Dijawab:</span>
                <strong>{totalUnanswered} Butir</strong>
              </div>
              {Object.values(flaggedMap).filter(Boolean).length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 'var(--font-size-sm)', color: 'var(--warning)' }}>
                  <span>Ditandai Ragu-ragu:</span>
                  <strong>{Object.values(flaggedMap).filter(Boolean).length} Butir</strong>
                </div>
              )}
            </div>

            {totalUnanswered > 0 && (
              <div className="alert alert-warning" style={{ marginBottom: 'var(--space-lg)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Masih ada {totalUnanswered} soal yang belum Anda jawab. Jawaban kosong akan mendapat nilai 0.
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
              >
                Periksa Kembali
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSubmitExam(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Mengirimkan Jawaban...
                  </>
                ) : (
                  'Ya, Kumpulkan Jawaban'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi & Notifikasi Modern */}
      <ConfirmModal {...dialogState} onConfirm={handleConfirm} onClose={handleClose} />

      {/* Lightbox Modal HD Gambar Soal */}
      {lightboxImage && (
        <div className="soal-lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="soal-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="soal-lightbox-close"
              onClick={() => setLightboxImage(null)}
              title="Tutup Pratinjau"
            >
              ✕
            </button>
            <img src={lightboxImage} alt="Gambar Soal HD" className="soal-lightbox-img" />
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', textAlign: 'center' }}>
              Gambar Soal No. {displayNumber} (Resolusi HD) • Klik silang atau area luar untuk kembali
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
