export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function isPointInTriangle(
  px: number, py: number,
  a: [number, number], b: [number, number], c: [number, number],
): boolean {
  const sign = (p1: [number, number], p2: [number, number], p3: [number, number]) =>
    (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = sign([px, py], a, b);
  const d2 = sign([px, py], b, c);
  const d3 = sign([px, py], c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

export interface SegmentDistanceResult {
  distance: number;
  t: number;
  qx: number;
  qy: number;
}

export function pointToSegmentDistance(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number,
): SegmentDistanceResult {
  const ex = bx - ax;
  const ey = by - ay;
  const lenSq = ex * ex + ey * ey || 1;
  const t = clamp(((px - ax) * ex + (py - ay) * ey) / lenSq, 0, 1);
  const qx = ax + t * ex;
  const qy = ay + t * ey;
  return { distance: Math.hypot(px - qx, py - qy), t, qx, qy };
}