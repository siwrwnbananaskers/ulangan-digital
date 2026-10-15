'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * Modern Anti-AI-Slop Confirmation & Alert Dialog
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message,
  confirmText = 'Lanjutkan',
  cancelText = 'Batal',
  type = 'danger', // 'danger' | 'warning' | 'primary' | 'info' | 'success'
  isAlert = false,
  loading = false,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isDanger = type === 'danger';
  const isWarning = type === 'warning';
  const isSuccess = type === 'success';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 420,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          fontFamily: 'inherit',
          animation: 'modalPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Body with Icon and Text */}
        <div style={{ padding: '22px 22px 18px' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {/* Icon Avatar */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : isSuccess ? '#f0fdf4' : '#eff6ff',
                border: isDanger ? '1px solid #fee2e2' : isWarning ? '1px solid #fde68a' : isSuccess ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
                color: isDanger ? '#dc2626' : isWarning ? '#d97706' : isSuccess ? '#16a34a' : '#2563eb',
              }}
            >
              {isDanger && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              )}
              {isWarning && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              )}
              {isSuccess && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {!isDanger && !isWarning && !isSuccess && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>

            {/* Title & Message */}
            <div style={{ flex: 1, minWidth: 0, marginTop: 2 }}>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: '0 0 6px 0',
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </h3>
              <div
                style={{
                  fontSize: 13.5,
                  color: '#475569',
                  lineHeight: 1.55,
                  margin: 0,
                  wordBreak: 'break-word',
                }}
              >
                {message}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: '12px 18px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          {!isAlert && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              border: 'none',
              background: isDanger ? '#dc2626' : isWarning ? '#d97706' : isSuccess ? '#16a34a' : '#0a66c2',
              color: '#ffffff',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isDanger
                ? '0 1px 2px rgba(220, 38, 38, 0.25)'
                : '0 1px 2px rgba(10, 102, 194, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading && (
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable Hook to trigger confirmation or alert modal cleanly via Promises
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Lanjutkan',
    cancelText: 'Batal',
    type: 'danger',
    isAlert: false,
    loading: false,
  });

  const [resolver, setResolver] = useState(null);

  const confirm = useCallback(
    ({
      title = 'Konfirmasi Tindakan',
      message = 'Apakah Anda yakin ingin melanjutkan?',
      confirmText,
      cancelText = 'Batal',
      type = 'danger',
    }) => {
      return new Promise((resolve) => {
        setResolver(() => resolve);
        setDialogState({
          isOpen: true,
          title,
          message,
          confirmText: confirmText || (type === 'danger' ? 'Hapus' : 'Lanjutkan'),
          cancelText,
          type,
          isAlert: false,
          loading: false,
        });
      });
    },
    []
  );

  const alert = useCallback(
    ({
      title = 'Pemberitahuan',
      message = '',
      confirmText = 'Mengerti',
      type = 'info',
    }) => {
      return new Promise((resolve) => {
        setResolver(() => resolve);
        setDialogState({
          isOpen: true,
          title,
          message,
          confirmText,
          cancelText: 'Tutup',
          type,
          isAlert: true,
          loading: false,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (resolver) resolver(true);
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, [resolver]);

  const handleClose = useCallback(() => {
    if (resolver) resolver(false);
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, [resolver]);

  return {
    dialogState,
    confirm,
    alert,
    handleConfirm,
    handleClose,
  };
}
