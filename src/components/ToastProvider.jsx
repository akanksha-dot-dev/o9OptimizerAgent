import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const VARIANT_CONFIG = {
  success: {
    icon: <CheckCircle size={18} />,
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
    border: '#a7f3d0',
    color: '#059669',
    darkBg: 'linear-gradient(135deg, #0d3320 0%, #132e1f 100%)',
    darkBorder: '#166534',
    darkColor: '#34d399',
  },
  error: {
    icon: <XCircle size={18} />,
    bg: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
    border: '#fecaca',
    color: '#dc2626',
    darkBg: 'linear-gradient(135deg, #3b1515 0%, #2d1111 100%)',
    darkBorder: '#7f1d1d',
    darkColor: '#f87171',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    border: '#fde68a',
    color: '#d97706',
    darkBg: 'linear-gradient(135deg, #3b2e10 0%, #2d2408 100%)',
    darkBorder: '#854d0e',
    darkColor: '#fbbf24',
  },
  info: {
    icon: <Info size={18} />,
    bg: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)',
    border: '#bfdbfe',
    color: '#2563eb',
    darkBg: 'linear-gradient(135deg, #0f1525 0%, #111827 100%)',
    darkBorder: '#1e40af',
    darkColor: '#60a5fa',
  },
};

let toastIdCounter = 0;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, variant = 'success', duration = 4000) => {
    const id = ++toastIdCounter;
    const toast = { id, message, variant };
    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const isDark = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: 'fixed',
          top: 80,
          right: 24,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
          maxWidth: 380,
          width: '100%',
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const config = VARIANT_CONFIG[toast.variant] || VARIANT_CONFIG.info;
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 60, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.9 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md, 12px)',
                  background: isDark ? config.darkBg : config.bg,
                  border: `1px solid ${isDark ? config.darkBorder : config.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  cursor: 'pointer',
                }}
                onClick={() => removeToast(toast.id)}
              >
                <div style={{
                  color: isDark ? config.darkColor : config.color,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  {config.icon}
                </div>
                <span style={{
                  flex: 1,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: isDark ? config.darkColor : config.color,
                  lineHeight: 1.4,
                }}>
                  {toast.message}
                </span>
                <X
                  size={14}
                  style={{
                    color: isDark ? config.darkColor : config.color,
                    opacity: 0.5,
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
