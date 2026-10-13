import type { CanvasElement, Slide } from '../types';
import { SNAP_THRESHOLD } from '../types';
import { gridRound } from '../lib/geometry';

export interface SnapResult {
  x: number;
  y: number;
  v: number[];
  h: number[];
}

export function computeSnap(
  el: CanvasElement,
  x: number,
  y: number,
  slide: Slide,
  showGrid: boolean,
): SnapResult {
  const v: number[] = [];
  const h: number[] = [];
  const bw = el.width;
  const bh = el.height;
  const xs: { v: number; d: number; guide: number }[] = [];
  const ys: { v: number; d: number; guide: number }[] = [];

  if (showGrid) {
    const gx = gridRound(x);
    const gy = gridRound(y);
    xs.push({ v: gx, d: Math.abs(x - gx), guide: gx });
    ys.push({ v: gy, d: Math.abs(y - gy), guide: gy });
  }

  const cx = x + bw / 2;
  const cy = y + bh / 2;
  const stageW = slide.width;
  const stageH = slide.height;

  xs.push({ v: stageW / 2 - bw / 2, d: Math.abs(cx - stageW / 2), guide: stageW / 2 });
  xs.push({ v: 0, d: Math.abs(x), guide: 0 });
  xs.push({ v: stageW - bw, d: Math.abs(x + bw - stageW), guide: stageW });

  const pad = slide.padding;
  xs.push({ v: pad.left, d: Math.abs(x - pad.left), guide: pad.left });
  xs.push({ v: stageW - pad.right - bw, d: Math.abs(x + bw - (stageW - pad.right)), guide: stageW - pad.right });

  ys.push({ v: pad.top, d: Math.abs(y - pad.top), guide: pad.top });
  ys.push({ v: stageH - pad.bottom - bh, d: Math.abs(y + bh - (stageH - pad.bottom)), guide: stageH - pad.bottom });
  ys.push({ v: stageH / 2 - bh / 2, d: Math.abs(cy - stageH / 2), guide: stageH / 2 });
  ys.push({ v: 0, d: Math.abs(y), guide: 0 });
  ys.push({ v: stageH - bh, d: Math.abs(y + bh - stageH), guide: stageH });

  for (const other of slide.elements) {
    if (other.id === el.id) continue;
    const oL = other.x;
    const oR = other.x + other.width;
    const oC = other.x + other.width / 2;
    const oT = other.y;
    const oB = other.y + other.height;
    const oM = other.y + other.height / 2;
    const l = x;
    const r = x + bw;
    const c = x + bw / 2;
    const t = y;
    const b = y + bh;
    const m = y + bh / 2;

    xs.push({ v: oL, d: Math.abs(l - oL), guide: oL });
    xs.push({ v: oR - bw, d: Math.abs(r - oR), guide: oR });
    xs.push({ v: oC - bw / 2, d: Math.abs(c - oC), guide: oC });
    ys.push({ v: oT, d: Math.abs(t - oT), guide: oT });
    ys.push({ v: oB - bh, d: Math.abs(b - oB), guide: oB });
    ys.push({ v: oM - bh / 2, d: Math.abs(m - oM), guide: oM });
  }

  const bestX = xs.reduce((a, b) => (b.d < a.d ? b : a), xs[0]);
  const bestY = ys.reduce((a, b) => (b.d < a.d ? b : a), ys[0]);
  if (bestX && bestX.d < SNAP_THRESHOLD) { x = bestX.v; v.push(bestX.guide); }
  if (bestY && bestY.d < SNAP_THRESHOLD) { y = bestY.v; h.push(bestY.guide); }

  return { x, y, v, h };
}