'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Exam Mode Hook - Handles fullscreen, tab detection, violation tracking
 * Uses Page Visibility API, blur/focus detection, and fullscreen API
 */
export function useExamMode({ 
  enabled = false, 
  batasPelanggaran = 3, 
  onViolation,
  sesiId,
  ujianId 
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isSuspended, setIsSuspended] = useState(false);
  const violationRef = useRef(0);
  const isActiveRef = useRef(true);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(() => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    } catch {}
    setIsFullscreen(false);
  }, []);

  // Record violation
  const recordViolation = useCallback(async (type, detail) => {
    if (!enabled || isSuspended) return;

    violationRef.current += 1;
    const count = violationRef.current;
    setViolations(count);

    // Log to server
    if (onViolation) {
      onViolation({
        sesi_id: sesiId,
        tipe_pelanggaran: type,
        detail: `${detail} (Pelanggaran ke-${count})`,
        timestamp: new Date().toISOString(),
      });
    }

    if (count >= batasPelanggaran) {
      setIsSuspended(true);
      setShowWarning(true);
      setWarningMessage('Ujian Ditangguhkan');
    } else {
      setShowWarning(true);
      setWarningMessage(`Terdeteksi aktivitas meninggalkan halaman ujian. Silakan kembali ke ujian. (Peringatan ${count}/${batasPelanggaran})`);
    }
  }, [enabled, batasPelanggaran, isSuspended, onViolation, sesiId]);

  // Dismiss warning and return to fullscreen
  const dismissWarning = useCallback(() => {
    if (isSuspended) return;
    setShowWarning(false);
    enterFullscreen();
  }, [isSuspended, enterFullscreen]);

  useEffect(() => {
    if (!enabled) return;

    // === Page Visibility API ===
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch', 'Siswa berpindah tab/window (Page Visibility API)');
      }
    };

    // === Blur/Focus Detection ===
    const handleBlur = () => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        recordViolation('window_blur', 'Window kehilangan fokus (blur detection)');
      }
    };

    const handleFocus = () => {
      isActiveRef.current = true;
    };

    // === Fullscreen Change Detection ===
    const handleFullscreenChange = () => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFS);
      
      if (!isFS && enabled && !isSuspended) {
        recordViolation('exit_fullscreen', 'Siswa keluar dari mode fullscreen');
      }
    };

    // === Prevent keyboard shortcuts ===
    const handleKeyDown = (e) => {
      // Block common escape keys
      if (e.key === 'F11' || 
          (e.ctrlKey && e.key === 'Tab') ||
          (e.altKey && e.key === 'Tab') ||
          (e.ctrlKey && e.key === 'w') ||
          (e.ctrlKey && e.key === 'n') ||
          (e.ctrlKey && e.key === 't') ||
          (e.altKey && e.key === 'F4')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // === Prevent right-click ===
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // === Prevent copy/paste ===
    const handleCopy = (e) => {
      e.preventDefault();
    };

    // Add listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);

    // Enter fullscreen on mount
    enterFullscreen();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
    };
  }, [enabled, isSuspended, recordViolation, enterFullscreen]);

  return {
    isFullscreen,
    violations,
    showWarning,
    warningMessage,
    isSuspended,
    enterFullscreen,
    exitFullscreen,
    dismissWarning,
    setViolations,
    setIsSuspended,
  };
}
