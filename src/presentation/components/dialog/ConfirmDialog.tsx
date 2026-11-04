import { t as __tr } from '@/shared/i18n';
import React, { useEffect, useRef } from 'react';
import { useFocusTrap } from '@/presentation/hooks/useFocusTrap';
import './confirm-dialog.css';

export interface ConfirmDialogProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly variant?: 'default' | 'danger';
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Custom confirmation dialog — NOT native <dialog>, NOT window.confirm.
 * Respects NFR-UX-01 (no window.alert/confirm/prompt).
 *
 * Only used for destructive actions (delete, cancel); editing is inline
 * everywhere (spec §4 / F-GEN-08).
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = __tr("Подтвердить"),
  cancelLabel = __tr("Отмена"),
  variant = 'default',
  onConfirm,
  onCancel,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useFocusTrap(rootRef, isOpen, onCancel);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onConfirm();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="cd-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={rootRef}
        className="cd-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-title"
      >
        <h3 id="cd-title" className="cd-title">{title}</h3>
        {description && <p className="cd-desc">{description}</p>}
        <div className="cd-actions">
          <button type="button" className="cd-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`cd-btn ${variant === 'danger' ? 'cd-btn-danger' : 'cd-btn-primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};