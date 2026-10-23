import type { StampShapeItem } from '@/shared/types';

export const SNAP_TO_GRID = 10;
export const SNAP_THRESHOLD = 6;
export const GRID_SNAP_DIST = 2;

export function snapPosition(
  x: number, y: number, w: number, h: number,
  excludeId: string, shapes: StampShapeItem[],
  canvasW: number, canvasH: number, enableSnap: boolean,
): { x: number; y: number } {
  if (!enableSnap) return { x: Math.round(x), y: Math.round(y) };

  let fx = x, fy = y;

  const gridX = Math.round(x / SNAP_TO_GRID) * SNAP_TO_GRID;
  const gridY = Math.round(y / SNAP_TO_GRID) * SNAP_TO_GRID;
  if (Math.abs(gridX - x) <= GRID_SNAP_DIST) fx = gridX;
  if (Math.abs(gridY - y) <= GRID_SNAP_DIST) fy = gridY;

  const cx = canvasW / 2, cy = canvasH / 2;
  if (Math.abs((fx + w / 2) - cx) <= SNAP_THRESHOLD) fx = cx - w / 2;
  if (Math.abs((fy + h / 2) - cy) <= SNAP_THRESHOLD) fy = cy - h / 2;

  for (const s of shapes) {
    if (s.id === excludeId || s.hidden) continue;
    if (s.kind === 'line') continue;
    const pts = [
      { x: s.x, y: s.y },
      { x: s.x + s.width / 2, y: s.y + s.height / 2 },
      { x: s.x + s.width, y: s.y + s.height },
      { x: s.x + s.width, y: s.y },
      { x: s.x, y: s.y + s.height },
    ];
    for (const p of pts) {
      if (Math.abs(fx - p.x) <= SNAP_THRESHOLD) fx = p.x;
      if (Math.abs(fy - p.y) <= SNAP_THRESHOLD) fy = p.y;
      if (Math.abs((fx + w / 2) - p.x) <= SNAP_THRESHOLD) fx = p.x - w / 2;
      if (Math.abs((fy + h / 2) - p.y) <= SNAP_THRESHOLD) fy = p.y - h / 2;
    }
  }
  return { x: Math.round(fx), y: Math.round(fy) };
}

export interface HostCenterSnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
}

/** Центрирует фигуру относительно host с адаптивным порогом. */
export function snapToHostCenter(
  x: number, y: number, w: number, h: number,
  host: StampShapeItem | null,
  thresholdOverride?: number,
): HostCenterSnapResult {
  if (!host) return { x, y, snappedX: false, snappedY: false };

  const threshold = thresholdOverride ?? Math.max(30, Math.min(w, h) * 0.4);
  const hCx = host.x + host.width / 2;
  const hCy = host.y + host.height / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const snappedX = Math.abs(cx - hCx) <= threshold;
  const snappedY = Math.abs(cy - hCy) <= threshold;

  return {
    x: snappedX ? hCx - w / 2 : x,
    y: snappedY ? hCy - h / 2 : y,
    snappedX, snappedY,
  };
}

export type PlacementMode = 'inside' | 'outside' | 'next';

export function computeNewShapeGeometry(
  host: StampShapeItem | null,
  baseW: number, baseH: number,
  canvasW: number, canvasH: number,
  mode: PlacementMode,
  padding = 12,
): { x: number; y: number; width: number; height: number } {
  if (!host) {
    return {
      x: Math.round((canvasW - baseW) / 2),
      y: Math.round((canvasH - baseH) / 2),
      width: baseW, height: baseH,
    };
  }

  const hostCx = host.x + host.width / 2;
  const hostCy = host.y + host.height / 2;

  if (mode === 'inside') {
    const scale = 0.6;
    const w = Math.round(host.width * scale);
    const h = Math.round(host.height * scale);
    return { x: Math.round(hostCx - w / 2), y: Math.round(hostCy - h / 2), width: w, height: h };
  }

  if (mode === 'outside') {
    const w = Math.round(host.width + padding * 2);
    const h = Math.round(host.height + padding * 2);
    return { x: Math.round(hostCx - w / 2), y: Math.round(hostCy - h / 2), width: w, height: h };
  }

  return {
    x: Math.round(host.x + host.width + padding),
    y: Math.round(host.y),
    width: baseW, height: baseH,
  };
}