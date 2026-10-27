import { useEffect, useRef, useState, useCallback } from 'react';
import type { StampShapeItem } from '../types';
import type { FillSpec } from '../lib/stamps/rasterFill';

interface WorkerResult {
  key: string;
  url: string | null;
}

export function useFillWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [result, setResult] = useState<WorkerResult | null>(null);
  const pendingKeyRef = useRef<string>('');
  const seqRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/fillWorker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (e: MessageEvent<{ seq: number; url: string | null }>) => {
      if (e.data.seq !== seqRef.current) return;
      setResult({ key: pendingKeyRef.current, url: e.data.url });
    };

    worker.onerror = (err) => {
      console.error('[fillWorker] error', err);
    };

    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const rasterize = useCallback(
    (
      key: string,
      width: number,
      height: number,
      shapes: StampShapeItem[],
      fills: FillSpec[],
    ) => {
      const worker = workerRef.current;
      if (!worker) return;

      const seq = ++seqRef.current;
      pendingKeyRef.current = key;

      worker.postMessage({ seq, width, height, shapes, fills });
    },
    [],
  );

  return { result, rasterize };
}