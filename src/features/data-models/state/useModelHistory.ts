import { useCallback, useReducer, useRef } from 'react';

interface Entry {
  values: Record<string, unknown>;
  mergeKey?: string;
  timestamp: number;
}
interface History {
  entries: Entry[];
  index: number;
}
export interface ModelHistoryApi {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  push(values: Record<string, unknown>, mergeKey?: string): void;
  undo(): Record<string, unknown> | null;
  redo(): Record<string, unknown> | null;
}

/** Each model keeps its own bounded history while this editor is mounted. */
export function useModelHistory(
  modelId: string,
  initialValues: Record<string, unknown>,
): ModelHistoryApi {
  const histories = useRef(new Map<string, History>());
  if (!histories.current.has(modelId)) {
    if (histories.current.size >= 30)
      histories.current.delete(histories.current.keys().next().value!);
    histories.current.set(modelId, {
      entries: [{ values: initialValues, timestamp: Date.now() }],
      index: 0,
    });
  }
  const history = histories.current.get(modelId)!;
  const [, render] = useReducer((value: number) => value + 1, 0);
  const push = useCallback(
    (values: Record<string, unknown>, mergeKey?: string) => {
      const now = Date.now(),
        last = history.entries[history.index];
      if (
        history.index === history.entries.length - 1 &&
        mergeKey &&
        last.mergeKey === mergeKey &&
        now - last.timestamp < 600
      ) {
        history.entries[history.index] = { values, mergeKey, timestamp: now };
      } else {
        history.entries = history.entries.slice(0, history.index + 1);
        history.entries.push({ values, mergeKey, timestamp: now });
        if (history.entries.length > 30) history.entries.shift();
        history.index = history.entries.length - 1;
      }
      render();
    },
    [history],
  );
  const undo = useCallback(() => {
    if (!history.index) return null;
    history.index--;
    render();
    return history.entries[history.index].values;
  }, [history]);
  const redo = useCallback(() => {
    if (history.index >= history.entries.length - 1) return null;
    history.index++;
    render();
    return history.entries[history.index].values;
  }, [history]);
  return {
    canUndo: history.index > 0,
    canRedo: history.index < history.entries.length - 1,
    push,
    undo,
    redo,
  };
}
