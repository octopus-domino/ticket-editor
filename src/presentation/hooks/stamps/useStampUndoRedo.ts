import { useCallback } from 'react';
import type { useStampHistory } from './useStampHistory';

interface Args {
  history: ReturnType<typeof useStampHistory>;
  clearSelection: () => void;
}

export function useStampUndoRedo({ history, clearSelection }: Args) {
  const undo = useCallback(() => {
    history.undo();
    clearSelection();
  }, [history, clearSelection]);

  const redo = useCallback(() => {
    history.redo();
    clearSelection();
  }, [history, clearSelection]);

  return { undo, redo };
}