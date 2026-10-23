import type { Slide, CanvasElement } from '@/shared/types';
import { GRID_SIZE, SNAP_THRESHOLD } from '@/shared/constants';

export interface SnapResult {
  x: number;
  y: number;
  v: number[];
  h: number[];
}

const gridRound = (v: number): number => Math.round(v / GRID_SIZE) * GRID_SIZE;

interface Candidate {
  val: number;
  guide: number;
  type: 'grid' | 'slide' | 'element';
}

export function computeSnap(
  el: CanvasElement | { id: string; x: number; y: number; width: number; height: number },
  x: number,
  y: number,
  slide: Slide,
  excludeIds: string[] = []
): SnapResult {
  const xs: Candidate[] = [];
  const ys: Candidate[] = [];

  const bw = el.width;
  const bh = el.height;

  // 1. Сетка
  const gx = gridRound(x);
  const gy = gridRound(y);
  xs.push({ val: gx, guide: gx, type: 'grid' });
  ys.push({ val: gy, guide: gy, type: 'grid' });

  // 2. Слайд: края + центр
  const stageW = slide.width;
  const stageH = slide.height;

  xs.push({ val: stageW / 2 - bw / 2, guide: stageW / 2, type: 'slide' });
  xs.push({ val: 0, guide: 0, type: 'slide' });
  xs.push({ val: stageW - bw, guide: stageW, type: 'slide' });

  ys.push({ val: stageH / 2 - bh / 2, guide: stageH / 2, type: 'slide' });
  ys.push({ val: 0, guide: 0, type: 'slide' });
  ys.push({ val: stageH - bh, guide: stageH, type: 'slide' });

  // 3. Padding
  const pad = slide.padding;
  xs.push({ val: pad.left, guide: pad.left, type: 'slide' });
  xs.push({ val: stageW - pad.right - bw, guide: stageW - pad.right, type: 'slide' });
  ys.push({ val: pad.top, guide: pad.top, type: 'slide' });
  ys.push({ val: stageH - pad.bottom - bh, guide: stageH - pad.bottom, type: 'slide' });

  // 4. Другие элементы
  for (const other of slide.elements) {
    if (excludeIds.includes(other.id) || (el as any).id === other.id) continue;
    if (other.locked) continue;

    const oL = other.x;
    const oR = other.x + other.width;
    const oC = other.x + other.width / 2;
    const oT = other.y;
    const oB = other.y + other.height;
    const oM = other.y + other.height / 2;

    xs.push({ val: oL, guide: oL, type: 'element' });
    xs.push({ val: oR - bw, guide: oR, type: 'element' });
    xs.push({ val: oC - bw / 2, guide: oC, type: 'element' });

    ys.push({ val: oT, guide: oT, type: 'element' });
    ys.push({ val: oB - bh, guide: oB, type: 'element' });
    ys.push({ val: oM - bh / 2, guide: oM, type: 'element' });
  }

  let bestX: Candidate | null = null;
  let minDx = Infinity;
  for (const c of xs) {
    const d = Math.abs(x - c.val);
    if (d < minDx) { 
      minDx = d; 
      bestX = c; 
    }
  }

  let bestY: Candidate | null = null;
  let minDy = Infinity;
  for (const c of ys) {
    const d = Math.abs(y - c.val);
    if (d < minDy) { 
      minDy = d; 
      bestY = c; 
    }
  }

  const v: number[] = [];
  const h: number[] = [];
  let finalX = x;
  let finalY = y;

  if (bestX !== null && minDx < SNAP_THRESHOLD) {
    finalX = bestX.val;
    if (bestX.type !== 'grid') v.push(bestX.guide);
  }
  if (bestY !== null && minDy < SNAP_THRESHOLD) {
    finalY = bestY.val;
    if (bestY.type !== 'grid') h.push(bestY.guide);
  }

  return { x: finalX, y: finalY, v, h };
}