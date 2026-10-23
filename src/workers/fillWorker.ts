/// <reference lib="webworker" />
/* ============================================================
   workers/fillWorker.ts
   Тонкая обёртка над rasterizeCompositeFills.
   ============================================================ */

import { rasterizeCompositeFills } from '@/lib/stamps/rasterFill';
import type { FillWorkerRequest, FillWorkerResponse } from './protocol';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<FillWorkerRequest>) => {
  const { seq, width, height, shapes, fills } = e.data;

  let response: FillWorkerResponse;

  try {
    const result = await rasterizeCompositeFills({ width, height, shapes, fills });
    response = result.ok
      ? { seq, ok: true, blob: result.value }
      : { seq, ok: false, reason: result.reason };
  } catch (err) {
    response = { seq, ok: false, reason: 'all-fills-rejected' };
    console.error('[fillWorker] unhandled exception', err);
  }

  ctx.postMessage(response);
};