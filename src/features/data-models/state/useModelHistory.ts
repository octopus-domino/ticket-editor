import { useCallback, useEffect, useReducer, useRef } from 'react';

interface Entry {
  values: Record<string, unknown>;
  mergeKey?: string;
  timestamp: number;
}

const MAX_HISTORY = 30;
const MERGE_TIMEOUT_MS = 600;

export interface ModelHistoryApi {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** Записать новое состояние. mergeKey — склеивает быстрые изменения одного поля. */
  push: (values: Record<string, unknown>, mergeKey?: string) => void;
  /** Вернуть предыдущее состояние (или null). */
  undo: () => Record<string, unknown> | null;
  /** Вернуть следующее состояние (или null). */
  redo: () => Record<string, unknown> | null;
}

/**
 * Микро-история правок одной модели данных.
 * Живёт в памяти компонента: смена modelId → сброс.
 * Автоматически склеивает правки одного и того же поля (mergeKey = path).
 */
export function useModelHistory(
  modelId: string,
  initialValues: Record<string, unknown>,
): ModelHistoryApi {
  const entriesRef = useRef<Entry[]>([
    { values: initialValues, timestamp: Date.now() },
  ]);
  const indexRef = useRef(0);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Смена модели — сброс истории
  useEffect(() => {
    entriesRef.current = [{ values: initialValues, timestamp: Date.now() }];
    indexRef.current = 0;
    forceUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const push = useCallback((values: Record<string, unknown>, mergeKey?: string) => {
    const now = Date.now();
    const entries = entriesRef.current;
    const idx = indexRef.current;
    const last = entries[idx];

    // Merge по ключу: если пользователь быстро печатает в том же поле
    if (mergeKey && last?.mergeKey === mergeKey && now - last.timestamp < MERGE_TIMEOUT_MS) {
      entries[idx] = { values, mergeKey, timestamp: now };
      forceUpdate();
      return;
    }

    const next = entries.slice(0, idx + 1);
    next.push({ values, mergeKey, timestamp: now });
    while (next.length > MAX_HISTORY) next.shift();
    entriesRef.current = next;
    indexRef.current = next.length - 1;
    forceUpdate();
  }, []);

  const undo = useCallback((): Record<string, unknown> | null => {
    if (indexRef.current <= 0) return null;
    indexRef.current -= 1;
    forceUpdate();
    return entriesRef.current[indexRef.current].values;
  }, []);

  const redo = useCallback((): Record<string, unknown> | null => {
    if (indexRef.current >= entriesRef.current.length - 1) return null;
    indexRef.current += 1;
    forceUpdate();
    return entriesRef.current[indexRef.current].values;
  }, []);

  return {
    canUndo: indexRef.current > 0,
    canRedo: indexRef.current < entriesRef.current.length - 1,
    push,
    undo,
    redo,
  };
}