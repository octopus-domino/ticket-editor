import { t as __tr } from '@/shared/i18n';
import React, { useEffect, useRef, useState } from 'react';

export interface InlineTextPromptProps {
  readonly initialValue?: string;
  readonly placeholder: string;
  readonly saveLabel?: string;
  readonly cancelLabel?: string;
  readonly onSave: (value: string) => void;
  readonly onCancel: () => void;
}

/**
 * Inline replacement for window.prompt (NFR-UX-01).
 * Renders a single <input>; Enter saves, Esc cancels, blur saves if non-empty.
 * No modal, no dialog element.
 */
export const InlineTextPrompt: React.FC<InlineTextPromptProps> = ({
  initialValue = '',
  placeholder,
  saveLabel = __tr("Сохранить"),
  cancelLabel = __tr("Отмена"),
  onSave,
  onCancel,
}) => {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialValue) inputRef.current?.select();
  }, [initialValue]);

  const commit = (): void => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = val.trim();
    if (trimmed) onSave(trimmed);
    else onCancel();
  };

  const cancel = (): void => {
    if (committedRef.current) return;
    committedRef.current = true;
    onCancel();
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        ref={inputRef}
        type="text"
        value={val}
        placeholder={placeholder}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        style={{
          flex: 1,
          padding: '5px 8px',
          fontSize: 12,
          border: '1px solid var(--accent)',
          borderRadius: 4,
          outline: 'none',
          boxShadow: '0 0 0 3px var(--accent-light)',
        }}
      />
      <button
        type="button"
        className="dp-btn"
        onMouseDown={(e) => { e.preventDefault(); commit(); }}
      >
        {saveLabel}
      </button>
      <button
        type="button"
        className="dp-btn"
        onMouseDown={(e) => { e.preventDefault(); cancel(); }}
      >
        {cancelLabel}
      </button>
    </div>
  );
};