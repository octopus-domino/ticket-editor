/* ============================================================
   workers/protocol.ts
   Типы сообщений main thread <-> fill worker.
   ============================================================ */

import type { FillSpec, FillError } from '@/lib/stamps/rasterFill';
import type { StampShapeItem } from '@/shared/types';

export interface FillWorkerRequest {
  seq: number;
  width: number;
  height: number;
  shapes: StampShapeItem[];
  fills: FillSpec[];
}

export type FillWorkerResponse =
  | { seq: number; ok: true; blob: Blob }
  | { seq: number; ok: false; reason: FillError };