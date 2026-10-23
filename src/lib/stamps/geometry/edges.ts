import type { StampShapeItem } from '@/shared/types';

export interface Edge {
  x1: number; y1: number;
  x2: number; y2: number;
  len: number;
  dirX: number; dirY: number;
}

export function makeEdge(ax: number, ay: number, bx: number, by: number): Edge {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return { x1: ax, y1: ay, x2: bx, y2: by, len, dirX: dx / len, dirY: dy / len };
}

/** signedOffset > 0 — внутрь, < 0 — снаружи. */
export function buildRectEdges(w: number, h: number, signedOffset: number): Edge[] {
  const x1 = signedOffset, y1 = signedOffset;
  const x2 = w - signedOffset, y2 = h - signedOffset;
  return [
    makeEdge(x1, y1, x2, y1),
    makeEdge(x2, y1, x2, y2),
    makeEdge(x2, y2, x1, y2),
    makeEdge(x1, y2, x1, y1),
  ];
}

/** signedOffset > 0 — внутрь (к центроиду), < 0 — наружу. */
export function buildTriangleEdges(w: number, h: number, signedOffset: number): Edge[] {
  const cx = w / 2, cy = h / 2;
  const verts: [number, number][] = [[cx, 0], [w, h], [0, h]];
  const shrunk = verts.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const k = (dist - signedOffset) / dist;
    return [cx + dx * k, cy + dy * k] as [number, number];
  });
  return [
    makeEdge(shrunk[0][0], shrunk[0][1], shrunk[1][0], shrunk[1][1]),
    makeEdge(shrunk[1][0], shrunk[1][1], shrunk[2][0], shrunk[2][1]),
    makeEdge(shrunk[2][0], shrunk[2][1], shrunk[0][0], shrunk[0][1]),
  ];
}

export function buildPerimeterEdges(s: StampShapeItem, signedOffset: number): Edge[] {
  if (s.kind === 'rect') return buildRectEdges(s.width, s.height, signedOffset);
  if (s.kind === 'triangle') return buildTriangleEdges(s.width, s.height, signedOffset);
  return [];
}