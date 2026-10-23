/* ============================================================
   presentation/hooks/stamps/useStampShortcuts.ts
   F-STMP-E-17. CQ-SIZE-04: таблица handlers.
   ============================================================ */

import { useEffect } from 'react';
import { matches, type KeySpec } from '../shortcuts';

export interface StampShortcutsConfig {
  editingTextId: string | null;
  selectedId: string | null;
  onCloseTextEditor: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCloseEditor: () => void;
}

interface Handler {
  spec: KeySpec;
  handle(e: KeyboardEvent): void;
}

export function useStampShortcuts(config: StampShortcutsConfig) {
  const {
    editingTextId, selectedId, onCloseTextEditor, onClearSelection,
    onDelete, onDuplicate, onUndo, onRedo, onCloseEditor,
  } = config;

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      const isField =
        !!t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.tagName === 'SELECT' ||
          t.isContentEditable);

      if (isField) return;

      const handlers: Handler[] = [
        {
          spec: { key: 'Escape' },
          handle: () => {
            if (editingTextId) { onCloseTextEditor(); return; }
            if (selectedId) { onClearSelection(); return; }
            onCloseEditor();
          },
        },
        {
          spec: { key: 'Delete' },
          handle: (ev) => {
            if (!selectedId) return;
            ev.preventDefault();
            onDelete();
          },
        },
        {
          spec: { key: 'Backspace' },
          handle: (ev) => {
            if (!selectedId) return;
            ev.preventDefault();
            onDelete();
          },
        },
        {
          spec: { code: 'KeyD', ctrl: true },
          handle: (ev) => {
            if (!selectedId) return;
            ev.preventDefault();
            onDuplicate();
          },
        },
        {
          spec: { code: 'KeyZ', ctrl: true, shift: false },
          handle: (ev) => { ev.preventDefault(); onUndo(); },
        },
        {
          spec: { code: 'KeyY', ctrl: true },
          handle: (ev) => { ev.preventDefault(); onRedo(); },
        },
        {
          spec: { code: 'KeyZ', ctrl: true, shift: true },
          handle: (ev) => { ev.preventDefault(); onRedo(); },
        },
      ];

      for (const h of handlers) {
        if (matches(e, h.spec)) {
          h.handle(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    editingTextId, selectedId,
    onCloseTextEditor, onClearSelection, onDelete, onDuplicate,
    onUndo, onRedo, onCloseEditor,
  ]);
}