/* ============================================================
   lib/stamps/rasterFill.ts

   Чистая async-функция растеризации заливок (§50).
   Работает и в Worker (OffscreenCanvas), и в main thread (HTMLCanvas).

   Контракт:
   - никогда не бросает;
   - возвращает Result<Blob, FillError>;
   - для anchor-fill (fill.target != null) маска target гарантирует
     заливку области, поэтому проверки touchesBorder / MAX_AREA_RATIO
     применяются только к legacy-fill без target.

   F-RFILL-05..11.
   ============================================================ */

import type { StampShapeItem } from '@/shared/types';
import { getShapeStrategy } from './shapes/registry';

const SCALE = 4;
const BORDER_THRESHOLD = 200;
const MIN_AREA = 16;
const MAX_AREA_RATIO = 0.85;
const SEED_SEARCH_RADIUS = 20;

const LBL_NONE    = 0;
const LBL_INSIDE  = 1;
const LBL_OUTSIDE = 2;
const LBL_NEUTRAL = 3;

export type FillError =
  | 'no-canvas'
  | 'no-2d-context'
  | 'no-path2d'
  | 'get-image-data-failed'
  | 'empty-target-mask'
  | 'no-seed-pixel'
  | 'zero-pixels'
  | 'area-too-small'
  | 'area-too-big'
  | 'open-region'
  | 'all-fills-rejected'
  | 'serialize-failed';

export type RasterizeResult =
  | { ok: true; value: Blob }
  | { ok: false; reason: FillError };

export interface FillSpec {
  px: number;
  py: number;
  color: string;
  target: StampShapeItem | null;
}

export interface CompositeFillOptions {
  width: number;
  height: number;
  shapes: StampShapeItem[];
  fills: FillSpec[];
}

/* ---------- canvas ---------- */

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function createCanvas(w: number, h: number): { canvas: AnyCanvas; ctx: Ctx2D } | null {
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      if (ctx) return { canvas, ctx };
    } catch { /* fall through */ }
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) return { canvas, ctx };
  }
  return null;
}

async function canvasToBlob(canvas: AnyCanvas): Promise<RasterizeResult> {
  const anyCanvas = canvas as unknown as {
    convertToBlob?: (o?: { type?: string }) => Promise<Blob>;
    toBlob?: (cb: (b: Blob | null) => void, type?: string) => void;
  };

  if (typeof anyCanvas.convertToBlob === 'function') {
    try {
      const blob = await anyCanvas.convertToBlob({ type: 'image/png' });
      return { ok: true, value: blob };
    } catch {
      return { ok: false, reason: 'serialize-failed' };
    }
  }

  if (typeof anyCanvas.toBlob === 'function') {
    return new Promise<RasterizeResult>((resolve) => {
      anyCanvas.toBlob!((blob) => {
        resolve(blob
          ? { ok: true, value: blob }
          : { ok: false, reason: 'serialize-failed' });
      }, 'image/png');
    });
  }

  return { ok: false, reason: 'serialize-failed' };
}

/* ---------- shape tracing ---------- */

function traceShapePath(ctx: Ctx2D, s: StampShapeItem): void {
  ctx.beginPath();
  const { x, y, width: w, height: h } = s;

  if (s.kind === 'rect') {
    const r = Math.max(0, Math.min(s.cornerRadius || 0, w / 2, h / 2));
    if (r > 0) {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    } else {
      ctx.rect(x, y, w, h);
    }
    return;
  }

  if (s.kind === 'circle' || s.kind === 'ellipse') {
    ctx.ellipse(
      x + w / 2, y + h / 2,
      Math.max(1, w / 2), Math.max(1, h / 2),
      0, 0, Math.PI * 2,
    );
    return;
  }

  if (s.kind === 'triangle') {
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    return;
  }

  if (s.kind === 'line') {
    const pts = s.points || [0, h / 2, w, h / 2];
    if (pts.length >= 4) {
      ctx.moveTo(x + pts[0], y + pts[1]);
      for (let i = 2; i + 1 < pts.length; i += 2) {
        ctx.lineTo(x + pts[i], y + pts[i + 1]);
      }
    }
  }
}

/* ---------- target mask ---------- */

function buildTargetMask(
  W: number,
  H: number,
  target: StampShapeItem,
): { ok: true; value: Uint8Array } | { ok: false; reason: FillError } {
  const made = createCanvas(W, H);
  if (!made) return { ok: false, reason: 'no-canvas' };

  made.ctx.scale(SCALE, SCALE);

  let path: Path2D;
  try {
    path = getShapeStrategy(target.kind).toPath(target);
  } catch {
    return { ok: false, reason: 'no-path2d' };
  }

  made.ctx.fillStyle = '#000000';
  made.ctx.fill(path);

  let img: ImageData;
  try {
    img = made.ctx.getImageData(0, 0, W, H);
  } catch {
    return { ok: false, reason: 'get-image-data-failed' };
  }

  const mask = new Uint8Array(W * H);
  for (let i = 0; i < mask.length; i++) {
    if (img.data[i * 4 + 3] > 128) mask[i] = 1;
  }
  return { ok: true, value: mask };
}

/* ---------- flood fill ---------- */

function floodFillLightFromSeed(
  data: Uint8ClampedArray,
  labels: Uint8Array,
  W: number,
  H: number,
  seedIdx: number,
  tag: number,
  targetMask: Uint8Array | null,
): { touchesBorder: boolean; count: number } {
  if (targetMask && !targetMask[seedIdx]) return { touchesBorder: false, count: 0 };

  const stack: number[] = [seedIdx];
  let touchesBorder = false;
  let count = 0;

  while (stack.length > 0) {
    const i = stack.pop()!;
    if (labels[i] !== LBL_NONE) continue;
    if (targetMask && !targetMask[i]) continue;

    const p = i * 4;
    if ((data[p] + data[p + 1] + data[p + 2]) / 3 < BORDER_THRESHOLD) continue;

    labels[i] = tag;
    count++;

    const x = i % W;
    const y = (i - x) / W;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touchesBorder = true;

    if (x > 0)     stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0)     stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
  return { touchesBorder, count };
}

function floodFillLightFromMany(
  data: Uint8ClampedArray,
  labels: Uint8Array,
  W: number,
  H: number,
  seedIdxs: number[],
  tag: number,
): void {
  const stack = seedIdxs.slice();
  while (stack.length > 0) {
    const i = stack.pop()!;
    if (labels[i] !== LBL_NONE) continue;

    const p = i * 4;
    if ((data[p] + data[p + 1] + data[p + 2]) / 3 < BORDER_THRESHOLD) continue;

    labels[i] = tag;
    const x = i % W;
    const y = (i - x) / W;
    if (x > 0)     stack.push(i - 1);
    if (x < W - 1) stack.push(i + 1);
    if (y > 0)     stack.push(i - W);
    if (y < H - 1) stack.push(i + W);
  }
}

function markNeutralWhiteRegions(data: Uint8ClampedArray, labels: Uint8Array): void {
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] !== LBL_NONE) continue;
    const p = i * 4;
    if ((data[p] + data[p + 1] + data[p + 2]) / 3 >= BORDER_THRESHOLD) {
      labels[i] = LBL_NEUTRAL;
    }
  }
}

function watershedByDistance(
  data: Uint8ClampedArray,
  labels: Uint8Array,
  W: number,
  H: number,
): void {
  const total = W * H;
  const di = new Int32Array(total).fill(-1);
  const dout = new Int32Array(total).fill(-1);

  const bfs = (dist: Int32Array, from: number): void => {
    const q: number[] = [];
    for (let i = 0; i < total; i++) if (labels[i] === from) { dist[i] = 0; q.push(i); }

    let h = 0;
    while (h < q.length) {
      const i = q[h++];
      const d = dist[i];
      const x = i % W;
      const y = (i - x) / W;

      const tryN = (ni: number): void => {
        if (ni < 0 || ni >= total) return;
        if (dist[ni] !== -1) return;
        if (labels[ni] !== LBL_NONE) return;
        const p = ni * 4;
        if ((data[p] + data[p + 1] + data[p + 2]) / 3 >= BORDER_THRESHOLD) return;
        dist[ni] = d + 1;
        q.push(ni);
      };

      if (x > 0)     tryN(i - 1);
      if (x < W - 1) tryN(i + 1);
      if (y > 0)     tryN(i - W);
      if (y < H - 1) tryN(i + W);
    }
  };

  bfs(di, LBL_INSIDE);
  bfs(dout, LBL_OUTSIDE);

  for (let i = 0; i < total; i++) {
    if (labels[i] !== LBL_NONE) continue;
    const a = di[i];
    const b = dout[i];
    if (a === -1 && b === -1) continue;
    if (a === -1)  { labels[i] = LBL_OUTSIDE; continue; }
    if (b === -1)  { labels[i] = LBL_INSIDE;  continue; }
    labels[i] = a <= b ? LBL_INSIDE : LBL_OUTSIDE;
  }
}

function findNearbyLightPixel(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  cx: number,
  cy: number,
  maxR: number,
  targetMask: Uint8Array | null,
): number | null {
  const isLight = (i: number): boolean => {
    if (targetMask && !targetMask[i]) return false;
    const p = i * 4;
    return (data[p] + data[p + 1] + data[p + 2]) / 3 >= BORDER_THRESHOLD;
  };

  const start = cy * W + cx;
  if (isLight(start)) return start;

  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x;
        if (isLight(i)) return i;
      }
    }
  }
  return null;
}

function computeMaskForFill(
  data: Uint8ClampedArray,
  W: number,
  H: number,
  px: number,
  py: number,
  target: StampShapeItem | null,
): { ok: true; value: Uint8Array } | { ok: false; reason: FillError } {
  const ax = Math.floor(px * SCALE);
  const ay = Math.floor(py * SCALE);
  if (ax < 0 || ay < 0 || ax >= W || ay >= H) return { ok: false, reason: 'no-seed-pixel' };

  let targetMask: Uint8Array | null = null;
  if (target) {
    const maskRes = buildTargetMask(W, H, target);
    if (!maskRes.ok) return maskRes;

    let any = false;
    for (let i = 0; i < maskRes.value.length; i++) {
      if (maskRes.value[i]) { any = true; break; }
    }
    if (!any) return { ok: false, reason: 'empty-target-mask' };
    targetMask = maskRes.value;
  }

  const start = findNearbyLightPixel(data, W, H, ax, ay, SEED_SEARCH_RADIUS, targetMask);
  if (start === null) return { ok: false, reason: 'no-seed-pixel' };

  const labels = new Uint8Array(W * H);
  if (targetMask) {
    for (let i = 0; i < labels.length; i++) {
      if (!targetMask[i]) labels[i] = LBL_OUTSIDE;
    }
  }

  const { touchesBorder, count } = floodFillLightFromSeed(
    data, labels, W, H, start, LBL_INSIDE, targetMask,
  );
  if (count === 0) return { ok: false, reason: 'zero-pixels' };

  if (!targetMask) {
    if (touchesBorder) return { ok: false, reason: 'open-region' };

    const seeds: number[] = [];
    for (let x = 0; x < W; x++) { seeds.push(x); seeds.push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { seeds.push(y * W); seeds.push(y * W + W - 1); }
    floodFillLightFromMany(data, labels, W, H, seeds, LBL_OUTSIDE);
  }

  markNeutralWhiteRegions(data, labels);
  watershedByDistance(data, labels, W, H);

  const mask = new Uint8Array(W * H);
  let c = 0;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === LBL_INSIDE) { mask[i] = 1; c++; }
  }

  if (c < MIN_AREA * SCALE * SCALE) return { ok: false, reason: 'area-too-small' };
  if (!targetMask && c > W * H * MAX_AREA_RATIO) return { ok: false, reason: 'area-too-big' };

  return { ok: true, value: mask };
}

/* ---------- main ---------- */

export async function rasterizeCompositeFills(
  opts: CompositeFillOptions,
): Promise<RasterizeResult> {
  const { width, height, shapes, fills } = opts;

  if (width <= 0 || height <= 0) return { ok: false, reason: 'no-canvas' };
  if (!fills.length) return { ok: false, reason: 'all-fills-rejected' };
  if (typeof Path2D === 'undefined') return { ok: false, reason: 'no-path2d' };

  const W = width * SCALE;
  const H = height * SCALE;

  const made = createCanvas(W, H);
  if (!made) return { ok: false, reason: 'no-canvas' };

  const { canvas, ctx } = made;

  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#000000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);

  for (const s of shapes) {
    if (s.hidden) continue;
    if (s.kind === 'fill') continue;
    traceShapePath(ctx, s);
    ctx.lineWidth = Math.max(2 / SCALE, s.strokeWidth || 2);
    ctx.stroke();
  }

  let img: ImageData;
  try {
    img = ctx.getImageData(0, 0, W, H);
  } catch {
    return { ok: false, reason: 'get-image-data-failed' };
  }

  const data = img.data;
  const resultR = new Uint8ClampedArray(W * H);
  const resultG = new Uint8ClampedArray(W * H);
  const resultB = new Uint8ClampedArray(W * H);
  const resultA = new Uint8Array(W * H);

  let anyPainted = false;
  let lastError: FillError = 'all-fills-rejected';

  for (const fill of fills) {
    const maskRes = computeMaskForFill(data, W, H, fill.px, fill.py, fill.target);
    if (!maskRes.ok) { lastError = maskRes.reason; continue; }

    const [cr, cg, cb] = hexToRgb(fill.color);
    const mask = maskRes.value;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        resultR[i] = cr;
        resultG[i] = cg;
        resultB[i] = cb;
        resultA[i] = 255;
      }
    }
    anyPainted = true;
  }

  if (!anyPainted) return { ok: false, reason: lastError };

  for (let i = 0; i < W * H; i++) {
    const p = i * 4;
    if (resultA[i]) {
      data[p]     = resultR[i];
      data[p + 1] = resultG[i];
      data[p + 2] = resultB[i];
      data[p + 3] = 255;
    } else {
      data[p + 3] = 0;
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.putImageData(img, 0, 0);

  return canvasToBlob(canvas);
}

/**
 * F-RFILL-10: парсер цвета.
 * Поддерживает #RGB и #RRGGBB (как приходит из <input type="color">,
 * который всегда отдаёт #rrggbb, но запасной вариант не помешает).
 */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return [r, g, b];
    }
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return [r, g, b];
    }
  }
  return [0, 0, 0];
}