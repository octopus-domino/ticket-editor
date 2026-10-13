import { useEffect } from 'react';

export interface ShortcutHandlers {
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onEscape?: () => void;
  onEnter?: () => void;
  disabled?: boolean;
}

/**
 * Горячие клавиши работают на любой раскладке (en, ru, ...),
 * потому что используем e.code (физическая позиция клавиши),
 * а не e.key (символ, зависящий от раскладки).
 */
export function useKeyboardShortcuts(h: ShortcutHandlers) {
  useEffect(() => {
    if (h.disabled) return;

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.tagName === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      // Undo / Redo
      if (ctrl && e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); h.onUndo(); return; }
      if (ctrl && e.code === 'KeyZ' && e.shiftKey) { e.preventDefault(); h.onRedo(); return; }
      if (ctrl && e.code === 'KeyY') { e.preventDefault(); h.onRedo(); return; }

      // Copy / Paste / Duplicate
      if (ctrl && e.code === 'KeyC') { e.preventDefault(); h.onCopy(); return; }
      if (ctrl && e.code === 'KeyV') { e.preventDefault(); h.onPaste(); return; }
      if (ctrl && e.code === 'KeyD') { e.preventDefault(); h.onDuplicate(); return; }

      // Delete / Backspace — одинаковы на всех раскладках
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        h.onDelete();
        return;
      }

      // Escape / Enter
      if (e.key === 'Escape') { h.onEscape?.(); return; }
      if (e.key === 'Enter') { h.onEnter?.(); }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h]);
}