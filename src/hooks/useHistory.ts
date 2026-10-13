import { useState, useCallback } from 'react';
import type { Slide } from '../types';

export interface HistoryEntry {
  slides: Slide[];
  activeId: string;
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [index, setIndex] = useState(-1);

  const push = useCallback((slides: Slide[], activeId: string) => {
    setEntries((prev) => {
      const next = prev.slice(0, index + 1);
      next.push({ slides: JSON.parse(JSON.stringify(slides)), activeId });
      if (next.length > 50) next.shift();
      return next;
    });
    setIndex((prev) => Math.min(prev + 1, 49));
  }, [index]);

  const undo = useCallback((): HistoryEntry | null => {
    if (index <= 0) return null;
    const prev = entries[index - 1];
    setIndex(index - 1);
    return prev;
  }, [entries, index]);

  const redo = useCallback((): HistoryEntry | null => {
    if (index >= entries.length - 1) return null;
    const next = entries[index + 1];
    setIndex(index + 1);
    return next;
  }, [entries, index]);

  const reset = useCallback(() => {
    setEntries([]);
    setIndex(-1);
  }, []);

  const canUndo = index > 0;
  const canRedo = index < entries.length - 1;

  return { push, undo, redo, reset, canUndo, canRedo };
}