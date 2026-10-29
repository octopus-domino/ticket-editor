import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

const DEFAULT_DEBOUNCE_MS = 300;

export interface UseLiveHtmlOptions {
  editor: Editor | null;
  onChange: (html: string) => void;
  debounceMs?: number;
  enabled?: boolean;
}

export function useLiveHtml({
  editor,
  onChange,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  enabled = true,
}: UseLiveHtmlOptions): void {
  const timerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editor || !enabled) return;

    const emit = () => {
      try {
        onChangeRef.current(editor.getHTML());
      } catch {
        /* noop */
      }
    };

    const handler = () => {
      if (timerRef.current !== null) return;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        emit();
      }, debounceMs);
    };

    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [editor, debounceMs, enabled]);
}