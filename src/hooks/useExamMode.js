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

  // Grace period ref to prevent false positives when entering the page
  const readyRef = useRef(false);

  // Keep latest recordViolation in a ref to avoid re-attaching listeners
  const recordViolationRef = useRef(recordViolation);
  recordViolationRef.current = recordViolation;

  useEffect(() => {
    if (!enabled) {
      readyRef.current = false;
      return;
    }

    // Allow 2 seconds for browser transition and fullscreen prompt to settle
    const graceTimer = setTimeout(() => {
      readyRef.current = true;
    }, 2000);

    // Check initial fullscreen state
    const currentFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
    setIsFullscreen(currentFS);

    // === Page Visibility API ===
    const handleVisibilityChange = () => {
      if (!readyRef.current) return;
      if (document.hidden) {
        recordViolationRef.current('tab_switch', 'Siswa berpindah tab/window (Page Visibility API)');
      }
    };

    // === Blur/Focus Detection ===
    const handleBlur = () => {
      if (!readyRef.current) return;
      if (isActiveRef.current) {
        isActiveRef.current = false;
        recordViolationRef.current('window_blur', 'Window kehilangan fokus (blur detection)');
      }
    };

    const handleFocus = () => {
      isActiveRef.current = true;
    };

    // === Fullscreen Change Detection ===
    const handleFullscreenChange = () => {
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFS);
      
      if (!readyRef.current) return;
      if (!isFS && enabled && !isSuspended) {
        recordViolationRef.current('exit_fullscreen', 'Siswa keluar dari mode fullscreen');
      }
    };

    // === Prevent keyboard shortcuts ===
    const handleKeyDown = (e) => {
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

    // Only attempt fullscreen if not already fullscreen
    if (!currentFS) {
      enterFullscreen();
    }

    return () => {
      clearTimeout(graceTimer);
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
  }, [enabled, isSuspended, enterFullscreen]);

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
