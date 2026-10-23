/* ============================================================
   presentation/hooks/stamps/useStampHistory.ts
   REG-B1, REG-B4. Один setState на push (устранён двойной re-render).
   ============================================================ */

import { useCallback, useRef, useState } from 'react';
import type {
  StampShapeItem, StampTextItem, StampImageItem,
} from '@/shared/types';

export interface StampSnapshot {
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images: StampImageItem[];
}

const MAX_HISTORY = 60;
const MERGE_TIMEOUT_MS = 600;

interface HistoryEntry {
  snapshot: StampSnapshot;
  mergeKey?: string;
  timestamp: number;
}

interface HistoryState {
  snapshot: StampSnapshot;
  canUndo: boolean;
  canRedo: boolean;
}

export function useStampHistory(initial: StampSnapshot) {
  const historyRef = useRef<HistoryEntry[]>([
    { snapshot: initial, timestamp: Date.now() },
  ]);
  const indexRef = useRef(0);

  const [state, setState] = useState<HistoryState>({
    snapshot: initial,
    canUndo: false,
    canRedo: false,
  });

  const commitState = useCallback((snapshot: StampSnapshot) => {
    setState({
      snapshot,
      canUndo: indexRef.current > 0,
      canRedo: indexRef.current < historyRef.current.length - 1,
    });
  }, []);

  const push = useCallback((next: StampSnapshot, mergeKey?: string) => {
    const now = Date.now();
    const idx = indexRef.current;
    const last = historyRef.current[idx];

    // REG-B1: тот же mergeKey в пределах окна — перезаписываем верхний entry
    if (mergeKey && last?.mergeKey === mergeKey && now - last.timestamp < MERGE_TIMEOUT_MS) {
      historyRef.current[idx] = { snapshot: next, mergeKey, timestamp: now };
      commitState(next);
      return;
    }

    const trimmed = historyRef.current.slice(0, idx + 1);
    trimmed.push({ snapshot: next, mergeKey, timestamp: now });
    while (trimmed.length > MAX_HISTORY) trimmed.shift();
    historyRef.current = trimmed;
    indexRef.current = trimmed.length - 1;
    commitState(next);
  }, [commitState]);

  const replace = useCallback((next: StampSnapshot) => {
    // Замена без записи в историю (inline-редактирование).
    setState((s) => ({ ...s, snapshot: next }));
  }, []);

  const undo = useCallback(() => {
    if (indexRef.current <= 0) return;
    indexRef.current -= 1;
    commitState(historyRef.current[indexRef.current].snapshot);
  }, [commitState]);

  const redo = useCallback(() => {
    if (indexRef.current >= historyRef.current.length - 1) return;
    indexRef.current += 1;
    commitState(historyRef.current[indexRef.current].snapshot);
  }, [commitState]);

  return {
    state: state.snapshot,
    push,
    replace,
    undo,
    redo,
    canUndo: state.canUndo,
    canRedo: state.canRedo,
  };
}