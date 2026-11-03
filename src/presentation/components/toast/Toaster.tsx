import React from 'react';
import { useStore } from '@/shared/store/store';
import { toastStore } from './toastStore';
import { toast } from './toast';
import type { ToastVariant } from './types';
import './toast.css';

const ICON: Record<ToastVariant, string> = {
  info: 'ℹ️',
  success: '✅',
  warn: '⚠️',
  error: '⛔',
};

/**
 * Renders the current toast queue. Mount once at app root.
 * Uses useStore → re-renders only this component, not the app tree.
 */
export const Toaster: React.FC = () => {
  const items = useStore(toastStore, (s) => s.items);
  if (items.length === 0) return null;

  return (
    <div
      className="toaster"
      role="region"
      aria-label="Уведомления"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.variant}`}
          role={t.variant === 'error' ? 'alert' : 'status'}
        >
          <span className="toast-icon" aria-hidden>{ICON[t.variant]}</span>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.description && <div className="toast-desc">{t.description}</div>}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => toast.dismiss(t.id)}
            aria-label="Закрыть уведомление"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};