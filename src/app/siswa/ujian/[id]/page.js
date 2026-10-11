'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useExamMode } from '@/hooks/useExamMode';
import { parseWaktuWIB } from '@/lib/utils';

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
    enabled: !!sesi && !loading,
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
      const res = await authFetch(`/api/ujian/${examId}`);
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
        alert(data.error || 'Gagal mengumpulkan ujian');
        setIsSubmitting(false);
      }
    } catch {
      alert('Terjadi kesalahan koneksi saat mengumpulkan ujian. Coba lagi.');
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
          <div className={`violation-card ${isSuspended ? 'suspended-card' : ''}`}>
            <div className="violation-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            <h2>{isSuspended ? 'Ujian Ditangguhkan!' : 'Peringatan Pelanggaran!'}</h2>
            <p>{warningMessage}</p>

            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <span className="violation-count">
                {violations} / {ujian?.batas_pelanggaran || 3}
              </span>
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                Jumlah aktivitas meninggalkan halaman terdeteksi
              </p>
            </div>

            {isSuspended ? (
              <div style={{ background: 'var(--danger-light)', padding: 'var(--space-md)', borderRadius: 'var(--radius-lg)', color: '#991b1b', fontSize: 'var(--font-size-sm)' }}>
                <strong>Akses Terkunci:</strong> Anda telah mencapai batas maksimal pelanggaran ({ujian?.batas_pelanggaran || 3}x). Silakan angkat tangan dan lapor kepada Guru Pengawas untuk verifikasi dan pembukaan kunci ujian.
              </div>
            ) : (
              <button
                className="btn btn-danger btn-lg btn-block"
                onClick={dismissWarning}
              >
                Saya Mengerti, Kembali ke Ujian (Layar Penuh)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Bar with Timer, Status, and Controls */}
      <header className="exam-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--gray-900)' }}>
              {ujian?.judul}
            </h3>
            <p className="text-xs text-muted">
              {ujian?.mata_pelajaran} • {user?.nama} ({user?.kelas || '-'})
            </p>
          </div>
        </div>

        {/* Center: Server-synced Countdown Timer */}
        <div className={`exam-timer ${timerWarningClass}`}>
          <svg className="exam-timer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{formatTimerString(timeLeft)}</span>
        </div>

        {/* Right: Autosave status & Submit button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', fontSize: 'var(--font-size-xs)' }}>
            {autosaveStatus === 'menyimpan' && (
              <>
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                <span className="text-muted">Menyimpan...</span>
              </>
            )}
            {autosaveStatus === 'tersimpan' && (
              <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Tersimpan
              </span>
            )}
            {autosaveStatus === 'offline' && (
              <span style={{ color: 'var(--warning)' }}>Tersimpan Offline</span>
            )}
          </div>

          <button
            className="btn btn-success btn-sm"
            onClick={() => setShowSubmitModal(true)}
            id="btn-kumpulkan-ujian"
          >
            Kumpulkan Ujian
          </button>
        </div>
      </header>

      {/* Main Exam Body */}
      <div className="exam-body">
        {/* Left / Center: Question Panel */}
        <main className="exam-question-panel">
          {currentSoal ? (
            <div className="question-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <div className="question-number">
                  <span>Soal Nomor {currentIndex + 1} dari {soalList.length}</span>
                  <span className="question-type-badge">
                    {currentSoal.tipe === 'pg' ? 'Pilihan Ganda' :
                     currentSoal.tipe === 'isian' ? 'Isian Singkat' :
                     currentSoal.tipe === 'benar_salah' ? 'Benar / Salah' : 'Uraian'}
                  </span>
                </div>

                <button
                  type="button"
                  className={`btn btn-sm ${isCurrentFlagged ? 'btn-warning' : 'btn-secondary'}`}
                  onClick={toggleFlag}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isCurrentFlagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                  {isCurrentFlagged ? 'Ragu-ragu' : 'Tandai Ragu'}
                </button>
              </div>

              {/* Question Text */}
              <div className="question-text">
                {currentSoal.pertanyaan}
              </div>

              {/* Input for Answers depending on Question Type */}
              <div style={{ marginTop: 'var(--space-xl)' }}>
                {/* 1. Multiple Choice (PG) */}
                {currentSoal.tipe === 'pg' && (
                  <div className="options-list">
                    {['a', 'b', 'c', 'd', 'e'].map((letter) => {
                      const text = currentSoal[`pilihan_${letter}`];
                      if (!text) return null;
                      const isSelected = currentAnswer.toLowerCase() === letter;

                      return (
                        <div
                          key={letter}
                          className={`option-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleAnswerChange(letter)}
                        >
                          <div className="option-letter">{letter.toUpperCase()}</div>
                          <div className="option-text">{text}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Isian Singkat */}
                {currentSoal.tipe === 'isian' && (
                  <div>
                    <label className="form-label" style={{ marginBottom: 'var(--space-xs)' }}>
                      Ketikkan Jawaban Singkat Anda:
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Masukkan jawaban..."
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      style={{ fontSize: 'var(--font-size-lg)', padding: 'var(--space-md)' }}
                    />
                  </div>
                )}

                {/* 3. Benar / Salah */}
                {currentSoal.tipe === 'benar_salah' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                    {['Benar', 'Salah'].map((val) => {
                      const isSelected = currentAnswer.toLowerCase() === val.toLowerCase();
                      return (
                        <button
                          key={val}
                          type="button"
                          className={`btn ${isSelected ? (val === 'Benar' ? 'btn-success' : 'btn-danger') : 'btn-secondary'} btn-lg`}
                          style={{ height: 60, fontSize: 'var(--font-size-lg)', fontWeight: 700 }}
                          onClick={() => handleAnswerChange(val)}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 4. Uraian */}
                {currentSoal.tipe === 'uraian' && (
                  <div>
                    <label className="form-label" style={{ marginBottom: 'var(--space-xs)' }}>
                      Tuliskan Uraian / Penjelasan Jawaban Lengkap:
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      placeholder="Tuliskan jawaban Anda di sini..."
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      style={{ fontSize: 'var(--font-size-md)', lineHeight: 1.6 }}
                    />
                  </div>
                )}
              </div>

              {/* Bottom Nav Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--gray-200)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                >
                  ← Soal Sebelumnya
                </button>

                {currentIndex < soalList.length - 1 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setCurrentIndex((prev) => Math.min(soalList.length - 1, prev + 1))}
                  >
                    Soal Selanjutnya →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => setShowSubmitModal(true)}
                  >
                    Kumpulkan Ujian
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
    </div>
  );
}
