import type { StampShapeItem } from '@/shared/types';
import { buildTriangleEdges } from './edges';
import { isPointInTriangle, pointToSegmentDistance } from './math';

export function shapeContainsPoint(s: StampShapeItem, px: number, py: number): boolean {
  if (px < s.x || px > s.x + s.width) return false;
  if (py < s.y || py > s.y + s.height) return false;
  if (s.kind === 'circle' || s.kind === 'ellipse') {
    const cx = s.x + s.width / 2;
    const cy = s.y + s.height / 2;
    const rx = s.width / 2;
    const ry = s.height / 2;
    const dx = (px - cx) / Math.max(1e-6, rx);
    const dy = (py - cy) / Math.max(1e-6, ry);
    return dx * dx + dy * dy <= 1;
  }
  if (s.kind === 'triangle') {
    return isPointInTriangle(
      px - s.x, py - s.y,
      [s.width / 2, 0], [s.width, s.height], [0, s.height],
    );
  }
  return true;
}

export function distanceToPerimeter(s: StampShapeItem, px: number, py: number): number {
  const cx = s.x + s.width / 2;
  const cy = s.y + s.height / 2;
  const rx = s.width / 2;
  const ry = s.height / 2;
  const dx = px - cx;
  const dy = py - cy;

  if (s.kind === 'circle' || s.kind === 'ellipse') {
    const angle = Math.atan2(dy / Math.max(1e-6, ry), dx / Math.max(1e-6, rx));
    const ex = cx + rx * Math.cos(angle);
    const ey = cy + ry * Math.sin(angle);
    return Math.hypot(px - ex, py - ey);
  }
  if (s.kind === 'triangle') {
    const edges = buildTriangleEdges(s.width, s.height, 0);
    let best = Infinity;
    for (const e of edges) {
      const d = pointToSegmentDistance(px - s.x, py - s.y, e.x1, e.y1, e.x2, e.y2).distance;
      if (d < best) best = d;
    }
    return best;
  }
  return Math.min(
    Math.abs(px - s.x), Math.abs(px - (s.x + s.width)),
    Math.abs(py - s.y), Math.abs(py - (s.y + s.height)),
  );
}

export interface FindShapeResult {
  host: StampShapeItem;
  angleRad: number;
  isOutside: boolean;
}

export function findSnapTarget(
  px: number, py: number,
  excludeId: string,
  shapes: StampShapeItem[],
  maxDistance?: number,
): FindShapeResult | null {
  let best: StampShapeItem | null = null;
  let bestDist = Infinity;

  for (const s of shapes) {
    if (s.id === excludeId || s.hidden) continue;
    if (s.kind === 'line' || s.kind === 'fill') continue;
    if (s.width < 30 || s.height < 30) continue;

    const cx = s.x + s.width / 2;
    const cy = s.y + s.height / 2;
    const d = Math.hypot(px - cx, py - cy);
    if (d < bestDist) { bestDist = d; best = s; }
  }

  if (!best) return null;

  const cx = best.x + best.width / 2;
  const cy = best.y + best.height / 2;
  const rHost = Math.min(best.width, best.height) / 2;
  if (maxDistance !== undefined && bestDist > rHost + maxDistance) return null;

  return {
    host: best,
    angleRad: Math.atan2(py - cy, px - cx),
    isOutside: !shapeContainsPoint(best, px, py),
  };
}

export function findNearestShapeByCursor(
  px: number, py: number,
  shapes: StampShapeItem[],
  maxDistance = 260,
): FindShapeResult | null {
  let best: StampShapeItem | null = null;
  let bestDist = Infinity;

  for (const s of shapes) {
    if (s.hidden || s.kind === 'line' || s.kind === 'fill') continue;
    if (s.width < 20 || s.height < 20) continue;

    const d = distanceToPerimeter(s, px, py);
    if (d > maxDistance) continue;
    if (d < bestDist) { bestDist = d; best = s; }
  }

  if (!best) return null;
  const cx = best.x + best.width / 2;
  const cy = best.y + best.height / 2;
  return {
    host: best,
    angleRad: Math.atan2(py - cy, px - cx),
    isOutside: !shapeContainsPoint(best, px, py),
  };
}

export function findHostShape(
  px: number, py: number,
  excludeId: string, shapes: StampShapeItem[],
): StampShapeItem | null {
  const t = findSnapTarget(px, py, excludeId, shapes);
  return t ? t.host : null;
}

/** Самая маленькая по площади фигура, чей bbox содержит точку. */
export function findContainingShape(
  cx: number, cy: number,
  excludeId: string,
  shapes: StampShapeItem[],
): StampShapeItem | null {
  let best: StampShapeItem | null = null;
  let bestArea = Infinity;

  for (const s of shapes) {
    if (s.id === excludeId || s.hidden) continue;
    if (s.kind === 'line' || s.kind === 'fill') continue;
    if (cx < s.x || cx > s.x + s.width) continue;
    if (cy < s.y || cy > s.y + s.height) continue;

    const area = Math.max(1, s.width * s.height);
    if (area < bestArea) { bestArea = area; best = s; }
  }
  return best;
}

/**
 * Все фигуры (не line/fill), содержащие точку P.
 * Порядок — как в массиве shapes (он же z-order).
 */
export function findShapesContaining(
  px: number, py: number,
  shapes: StampShapeItem[],
): StampShapeItem[] {
  return shapes.filter((s) =>
    s.kind !== 'line' && s.kind !== 'fill'
    && !s.hidden
    && shapeContainsPoint(s, px, py),
  );
}