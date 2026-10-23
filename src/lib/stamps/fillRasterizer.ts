/* ============================================================
   lib/stamps/fillRasterizer.ts
   F-RFILL-04, F-RFILL-12..13.
   NFR-MEM-03: LRU по байтам (32 MB) + по количеству (30).
   NFR-OBS-03: structured logs.
   ============================================================ */

import type { StampShapeItem } from '@/shared/types';
import {
  rasterizeCompositeFills,
  type FillSpec,
  type FillError,
} from './rasterFill';
import type {
  FillWorkerRequest,
  FillWorkerResponse,
} from '../../workers/protocol';
import { logger } from '@/shared/logger';

const CACHE_LIMIT = 30;
const CACHE_MAX_BYTES = 32 * 1024 * 1024;

const ENVIRONMENT_REASONS: ReadonlySet<FillError> = new Set<FillError>([
  'no-canvas',
  'no-2d-context',
  'no-path2d',
  'serialize-failed',
]);

export interface FillCacheEntry {
  image: HTMLImageElement | null;
  error: FillError | null;
}

export interface FillRequest {
  key: string;
  width: number;
  height: number;
  shapes: StampShapeItem[];
  fills: FillSpec[];
}

type Listener = (key: string, entry: FillCacheEntry) => void;

function estimateEntryBytes(entry: FillCacheEntry): number {
  if (!entry.image) return 256;
  const w = entry.image.naturalWidth || entry.image.width || 256;
  const h = entry.image.naturalHeight || entry.image.height || 256;
  return w * h * 4;
}

class FillRasterizer {
  private worker: Worker | null = null;
  private workerBroken = false;

  private cache = new Map<string, FillCacheEntry>();
  private cacheBytes = 0;
  private inflight = new Set<string>();
  private seqByKey = new Map<number, FillRequest>();
  private listeners = new Set<Listener>();
  private nextSeq = 0;

  constructor() {
    this.createWorker();
  }

  private createWorker(): void {
    try {
      const worker = new Worker(
        new URL('../../workers/fillWorker.ts', import.meta.url),
        { type: 'module' },
      );

      worker.onmessage = (e: MessageEvent<FillWorkerResponse>) => {
        void this.handleWorkerResponse(e.data);
      };

      worker.onerror = (err) => {
        this.handleWorkerFailure('worker crashed', err);
        try { worker.terminate(); } catch { /* ignore */ }
        this.worker = null;
      };

      this.worker = worker;
    } catch (err) {
      this.handleWorkerFailure('worker unavailable', err);
      this.worker = null;
    }
  }

  private handleWorkerFailure(reason: string, err: unknown): void {
    logger.warn('fill.worker_failure', { reason, error: String(err) });
    this.workerBroken = true;

    const pending = Array.from(this.seqByKey.values());
    this.seqByKey.clear();
    this.inflight.clear();

    for (const req of pending) {
      this.inflight.add(req.key);
      void this.rasterizeOnMainThread(req);
    }
  }

  private async handleWorkerResponse(res: FillWorkerResponse): Promise<void> {
    const req = this.seqByKey.get(res.seq);
    if (!req) return;
    this.seqByKey.delete(res.seq);

    if (!res.ok) {
      if (ENVIRONMENT_REASONS.has(res.reason)) {
        logger.warn('fill.worker_env_failure', { reason: res.reason, key: req.key });
        await this.rasterizeOnMainThread(req);
        return;
      }
      logger.warn('fill.rejected', { reason: res.reason, key: req.key });
      this.store(req.key, { image: null, error: res.reason });
      return;
    }

    const image = await loadImage(res.blob);
    this.store(
      req.key,
      image
        ? { image, error: null }
        : { image: null, error: 'serialize-failed' },
    );
  }

  private async rasterizeOnMainThread(req: FillRequest): Promise<void> {
    try {
      const result = await rasterizeCompositeFills({
        width: req.width,
        height: req.height,
        shapes: req.shapes,
        fills: req.fills,
      });

      if (!result.ok) {
        logger.warn('fill.main_thread_rejected', { reason: result.reason, key: req.key });
        this.store(req.key, { image: null, error: result.reason });
        return;
      }

      const image = await loadImage(result.value);
      this.store(
        req.key,
        image
          ? { image, error: null }
          : { image: null, error: 'serialize-failed' },
      );
    } catch (err) {
      logger.error('fill.main_thread_crash', err, { key: req.key });
      this.store(req.key, { image: null, error: 'all-fills-rejected' });
    }
  }

  private store(key: string, entry: FillCacheEntry): void {
    const prev = this.cache.get(key);
    if (prev) this.cacheBytes -= estimateEntryBytes(prev);
    this.cache.delete(key);

    this.cache.set(key, entry);
    this.cacheBytes += estimateEntryBytes(entry);

    while (
      (this.cache.size > CACHE_LIMIT || this.cacheBytes > CACHE_MAX_BYTES) &&
      this.cache.size > 1
    ) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey === undefined) break;
      const oldEntry = this.cache.get(oldestKey);
      if (oldEntry) this.cacheBytes -= estimateEntryBytes(oldEntry);
      this.cache.delete(oldestKey);
    }

    this.inflight.delete(key);
    for (const listener of this.listeners) listener(key, entry);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  get(key: string): FillCacheEntry | undefined {
    return this.cache.get(key);
  }

  isInflight(key: string): boolean {
    return this.inflight.has(key);
  }

  request(req: FillRequest): void {
    if (this.cache.has(req.key)) return;
    if (this.inflight.has(req.key)) return;

    this.inflight.add(req.key);

    if (this.worker && !this.workerBroken) {
      const seq = ++this.nextSeq;
      this.seqByKey.set(seq, req);

      const wire: FillWorkerRequest = {
        seq,
        width: req.width,
        height: req.height,
        shapes: req.shapes,
        fills: req.fills,
      };

      try {
        this.worker.postMessage(wire);
        return;
      } catch (err) {
        this.handleWorkerFailure('postMessage failed', err);
        this.seqByKey.delete(seq);
        try { this.worker?.terminate(); } catch { /* ignore */ }
        this.worker = null;
      }
    }

    void this.rasterizeOnMainThread(req);
  }

  dispose(): void {
    try { this.worker?.terminate(); } catch { /* ignore */ }
    this.worker = null;
    this.cache.clear();
    this.cacheBytes = 0;
    this.inflight.clear();
    this.seqByKey.clear();
    this.listeners.clear();
  }
}

function loadImage(blob: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

let singleton: FillRasterizer | null = null;

export function getFillRasterizer(): FillRasterizer {
  if (!singleton) singleton = new FillRasterizer();
  return singleton;
}

export function resetFillRasterizer(): void {
  singleton?.dispose();
  singleton = null;
}