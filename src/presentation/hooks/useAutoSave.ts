/* ============================================================
   presentation/hooks/useAutoSave.ts
   F-AS-02: debounce 2000ms.
   F-AS-03: TTL 24h.
   REG-B8: JSON.stringify в Web Worker; fallback — requestIdleCallback.
   NFR-OBS-03: structured logging.
   ============================================================ */

import { useEffect, useRef, type MutableRefObject } from 'react';
import type { Slide, DataRoot } from '@/shared/types';
import { logger } from '@/shared/logger';

const AUTO_SAVE_KEY = 'ticket-editor:autosave';
const AUTO_SAVE_INTERVAL_MS = 2000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface AutoSaveData {
  slides: Slide[];
  data: DataRoot[];
  activeSlideId: string | null;
  savedAt: string;
}

interface SerializeRequest { id: number; payload: unknown; }
interface SerializeResponse { id: number; ok: boolean; text?: string; error?: string; }

/**
 * В части браузеров (Safari < 18) `requestIdleCallback` отсутствует.
 * Типизируем через пересечение — не через extends Window, чтобы
 * не конфликтовать с lib.dom.d.ts.
 */
type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
};

export function useAutoSave(
  slides: Slide[],
  data: DataRoot[],
  activeSlideId: string | null,
): void {
  const timerRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef<number>(0);

  useEffect(() => {
    try {
      const worker = new Worker(
        new URL('../../workers/serializeWorker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;
      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (err) {
      logger.warn('autosave.worker_unavailable', { error: String(err) });
      return;
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      const saveData: AutoSaveData = {
        slides,
        data,
        activeSlideId,
        savedAt: new Date().toISOString(),
      };
      void writeAutoSave(saveData, workerRef, reqIdRef);
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [slides, data, activeSlideId]);
}

async function writeAutoSave(
  data: AutoSaveData,
  workerRef: MutableRefObject<Worker | null>,
  reqIdRef: MutableRefObject<number>,
): Promise<void> {
  const worker = workerRef.current;

  if (worker) {
    try {
      const id = ++reqIdRef.current;
      const text = await serializeViaWorker(worker, id, data);
      try {
        localStorage.setItem(AUTO_SAVE_KEY, text);
      } catch (err) {
        logger.warn('autosave.write_failed', { error: String(err) });
      }
      return;
    } catch (err) {
      logger.warn('autosave.worker_failed', { error: String(err) });
    }
  }

  const doSave = (): void => {
    try {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(data));
    } catch (err) {
      logger.warn('autosave.write_failed', { error: String(err) });
    }
  };

  const win = window as IdleCapableWindow;
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(doSave);
  } else {
    window.setTimeout(doSave, 0);
  }
}

function serializeViaWorker(
  worker: Worker,
  id: number,
  payload: unknown,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent<SerializeResponse>): void => {
      if (e.data.id !== id) return;
      worker.removeEventListener('message', handler);
      if (e.data.ok && typeof e.data.text === 'string') {
        resolve(e.data.text);
      } else {
        reject(new Error(e.data.error || 'serialize failed'));
      }
    };
    worker.addEventListener('message', handler);
    const request: SerializeRequest = { id, payload };
    worker.postMessage(request);
  });
}

export function loadAutoSave(): AutoSaveData | null {
  try {
    const saved = localStorage.getItem(AUTO_SAVE_KEY);
    if (!saved) return null;
    const data: AutoSaveData = JSON.parse(saved);
    if (Date.now() - new Date(data.savedAt).getTime() > MAX_AGE_MS) {
      clearAutoSave();
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  try { localStorage.removeItem(AUTO_SAVE_KEY); } catch { /* ignore */ }
}