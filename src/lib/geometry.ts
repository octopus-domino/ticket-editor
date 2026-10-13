import type { CanvasElement, Slide } from '../types';
import { GRID_SIZE } from '../types';

export interface BBox { x: number; y: number; w: number; h: number; }

export function getBBox(el: CanvasElement): BBox {
  if ((el.type === 'line' || el.type === 'fill') && el.points && el.points.length >= 4) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < el.points.length; i += 2) {
      xs.push(el.points[i]);
      ys.push(el.points[i + 1]);
    }
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { x: el.x + minX, y: el.y + minY, w: maxX - minX, h: maxY - minY };
  }
  return { x: el.x, y: el.y, w: el.width, h: el.height };
}

export function hitShapeEl(el: CanvasElement, px: number, py: number): boolean {
  if (el.type === 'shape') {
    if (px < el.x || py < el.y || px > el.x + el.width || py > el.y + el.height) return false;
    if (el.shape === 'circle') {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const r = Math.min(el.width, el.height) / 2;
      return Math.hypot(px - cx, py - cy) <= r;
    }
    return true;
  }
  if (el.type === 'fill' && el.points && el.points.length >= 6) {
    const pts = el.points;
    const n = pts.length / 2;
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = el.x + pts[i * 2];
      const yi = el.y + pts[i * 2 + 1];
      const xj = el.x + pts[j * 2];
      const yj = el.y + pts[j * 2 + 1];
      const intersect =
        yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 0.000001) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
  return false;
}

export function findElementAt(slide: Slide, x: number, y: number): CanvasElement | null {
  for (let i = slide.elements.length - 1; i >= 0; i--) {
    const el = slide.elements[i];
    if (el.type === 'line') {
      const pts = el.points || [0, el.height / 2, el.width, el.height / 2];
      const xs: number[] = [];
      const ys: number[] = [];
      for (let j = 0; j < pts.length; j += 2) {
        xs.push(el.x + pts[j]);
        ys.push(el.y + pts[j + 1]);
      }
      const bx = Math.min(...xs);
      const by = Math.min(...ys);
      const bw = Math.max(...xs) - bx;
      const bh = Math.max(...ys) - by;
      if (x >= bx - 6 && x <= bx + bw + 6 && y >= by - 6 && y <= by + bh + 6) return el;
      continue;
    }
    if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) return el;
  }
  return null;
}

export const gridRound = (v: number): number => Math.round(v / GRID_SIZE) * GRID_SIZE;