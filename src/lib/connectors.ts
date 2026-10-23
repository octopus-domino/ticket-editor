// src/lib/connectors.ts
import type { CanvasElement, AnchorSide, ConnectorRouting } from '@/shared/types';
import { uid } from './uid';

export const ANCHOR_OFFSET = 8;
export const GHOST_MIN_GAP = 40;
export const GHOST_MIN_W = 80;
export const GHOST_MIN_H = 40;
export const GHOST_MAX_W = 320;
export const GHOST_MAX_H = 240;

export interface Rect { x: number; y: number; width: number; height: number; }

export function getAnchorPoint(
  el: CanvasElement,
  side: AnchorSide,
): { x: number; y: number } {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rot = ((el.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);

  const halfW = el.width / 2;
  const halfH = el.height / 2;

  let lx = 0;
  let ly = 0;
  if (side === 'top') { lx = 0; ly = -halfH - ANCHOR_OFFSET; }
  else if (side === 'right') { lx = halfW + ANCHOR_OFFSET; ly = 0; }
  else if (side === 'bottom') { lx = 0; ly = halfH + ANCHOR_OFFSET; }
  else { lx = -halfW - ANCHOR_OFFSET; ly = 0; }

  return {
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  };
}

export function getAnchorDirection(side: AnchorSide): { dx: number; dy: number } {
  if (side === 'top') return { dx: 0, dy: -1 };
  if (side === 'right') return { dx: 1, dy: 0 };
  if (side === 'bottom') return { dx: 0, dy: 1 };
  return { dx: -1, dy: 0 };
}

export function oppositeAnchor(side: AnchorSide): AnchorSide {
  if (side === 'top') return 'bottom';
  if (side === 'bottom') return 'top';
  if (side === 'left') return 'right';
  return 'left';
}

function routeStraight(
  from: CanvasElement, fromAnchor: AnchorSide,
  to: CanvasElement, toAnchor: AnchorSide,
): number[] {
  const a = getAnchorPoint(from, fromAnchor);
  const b = getAnchorPoint(to, toAnchor);
  return [a.x, a.y, b.x, b.y];
}

function segmentCrossesRect(
  x1: number, y1: number, x2: number, y2: number,
  rect: Rect, padding = 0,
): boolean {
  const rx = rect.x - padding;
  const ry = rect.y - padding;
  const rw = rect.width + padding * 2;
  const rh = rect.height + padding * 2;

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) return false;
  if (Math.abs(y1 - y2) < 1) return y1 > ry && y1 < ry + rh && maxX > rx && minX < rx + rw;
  if (Math.abs(x1 - x2) < 1) return x1 > rx && x1 < rx + rw && maxY > ry && minY < ry + rh;
  return false;
}

function routeOrthogonal(
  from: CanvasElement, fromAnchor: AnchorSide,
  to: CanvasElement, toAnchor: AnchorSide,
  obstacles: CanvasElement[],
): number[] {
  const a = getAnchorPoint(from, fromAnchor);
  const b = getAnchorPoint(to, toAnchor);

  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);

  // ФИКС: Принудительное выравнивание, если элементы почти на одной линии
  if (dx < 5) return [a.x, a.y, a.x, b.y];
  if (dy < 5) return [a.x, a.y, b.x, a.y];

  const obs = obstacles.filter((o) => o.id !== from.id && o.id !== to.id);

  const isBlocked = (path: number[]): boolean => {
    for (let i = 0; i < path.length - 2; i += 2) {
      const x1 = path[i], y1 = path[i + 1];
      const x2 = path[i + 2], y2 = path[i + 3];
      for (const o of obs) {
        if (segmentCrossesRect(x1, y1, x2, y2, o, 2)) return true;
      }
    }
    return false;
  };

  const isValidDir = (path: number[]): boolean => {
    if (path.length < 4) return true;
    const da = getAnchorDirection(fromAnchor);
    const dx1 = path[2] - path[0];
    const dy1 = path[3] - path[1];
    if (da.dx !== 0 && Math.sign(dx1) !== Math.sign(da.dx) && Math.abs(dx1) > 2) return false;
    if (da.dy !== 0 && Math.sign(dy1) !== Math.sign(da.dy) && Math.abs(dy1) > 2) return false;

    const db = getAnchorDirection(toAnchor);
    const n = path.length;
    const dx2 = path[n - 2] - path[n - 4];
    const dy2 = path[n - 1] - path[n - 3];
    if (db.dx !== 0 && Math.sign(dx2) !== -Math.sign(db.dx) && Math.abs(dx2) > 2) return false;
    if (db.dy !== 0 && Math.sign(dy2) !== -Math.sign(db.dy) && Math.abs(dy2) > 2) return false;
    return true;
  };

  const p1 = [a.x, a.y, b.x, a.y, b.x, b.y];
  const p2 = [a.x, a.y, a.x, b.y, b.x, b.y];

  if (!isBlocked(p1) && isValidDir(p1)) return p1;
  if (!isBlocked(p2) && isValidDir(p2)) return p2;

  const midX = (a.x + b.x) / 2;
  const p3 = [a.x, a.y, midX, a.y, midX, b.y, b.x, b.y];
  if (!isBlocked(p3) && isValidDir(p3)) return p3;

  const midY = (a.y + b.y) / 2;
  const p4 = [a.x, a.y, a.x, midY, b.x, midY, b.x, b.y];
  if (!isBlocked(p4) && isValidDir(p4)) return p4;

  if (obs.length === 0) return p1;

  const minY = Math.min(...obs.map((o) => o.y)) - 20;
  const maxY = Math.max(...obs.map((o) => o.y + o.height)) + 20;
  const minX = Math.min(...obs.map((o) => o.x)) - 20;
  const maxX = Math.max(...obs.map((o) => o.x + o.width)) + 20;

  const d1 = [a.x, a.y, a.x, minY, b.x, minY, b.x, b.y];
  if (!isBlocked(d1) && isValidDir(d1)) return d1;
  const d2 = [a.x, a.y, a.x, maxY, b.x, maxY, b.x, b.y];
  if (!isBlocked(d2) && isValidDir(d2)) return d2;
  const d3 = [a.x, a.y, minX, a.y, minX, b.y, b.x, b.y];
  if (!isBlocked(d3) && isValidDir(d3)) return d3;
  const d4 = [a.x, a.y, maxX, a.y, maxX, b.y, b.x, b.y];
  if (!isBlocked(d4) && isValidDir(d4)) return d4;

  return p1;
}

export function routeConnector(
  from: CanvasElement, fromAnchor: AnchorSide,
  to: CanvasElement, toAnchor: AnchorSide,
  routing: ConnectorRouting,
  obstacles: CanvasElement[] = [],
): number[] {
  if (routing === 'straight') return routeStraight(from, fromAnchor, to, toAnchor);
  return routeOrthogonal(from, fromAnchor, to, toAnchor, obstacles);
}

export function findNearestAnchor(
  el: CanvasElement, px: number, py: number,
): { side: AnchorSide; distance: number } {
  const sides: AnchorSide[] = ['top', 'right', 'bottom', 'left'];
  let best: { side: AnchorSide; distance: number } = { side: 'top', distance: Infinity };
  for (const side of sides) {
    const p = getAnchorPoint(el, side);
    const d = Math.hypot(p.x - px, p.y - py);
    if (d < best.distance) best = { side, distance: d };
  }
  return best;
}

export function findElementAt(
  elements: CanvasElement[], px: number, py: number, excludeIds: string[] = [],
): CanvasElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'connector' || el.type === 'line' || el.type === 'fill' || el.type === 'group') continue;
    if (excludeIds.includes(el.id) || el.locked) continue;
    if (px >= el.x && px <= el.x + el.width && py >= el.y && py <= el.y + el.height) return el;
  }
  return null;
}

export function findElementWithPadding(
  elements: CanvasElement[], px: number, py: number, padding: number, excludeIds: string[] = [],
): CanvasElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'connector' || el.type === 'line' || el.type === 'fill' || el.type === 'group') continue;
    if (excludeIds.includes(el.id) || el.locked) continue;
    if (px >= el.x - padding && px <= el.x + el.width + padding && py >= el.y - padding && py <= el.y + el.height + padding) return el;
  }
  return null;
}

export function resolveConnectorEnds(conn: { fromId: string; toId: string }, elements: CanvasElement[]): { from: CanvasElement | null; to: CanvasElement | null } {
  let from: CanvasElement | null = null;
  let to: CanvasElement | null = null;
  for (const el of elements) {
    if (el.id === conn.fromId) from = el;
    if (el.id === conn.toId) to = el;
    if (from && to) break;
  }
  return { from, to };
}

export function midpointOfPath(points: number[]): { x: number; y: number } {
  let totalLen = 0;
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number; len: number }> = [];
  for (let i = 0; i < points.length - 2; i += 2) {
    const x1 = points[i], y1 = points[i + 1];
    const x2 = points[i + 2], y2 = points[i + 3];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len });
    totalLen += len;
  }
  let target = totalLen / 2;
  for (const s of segs) {
    if (target <= s.len) {
      const t = s.len === 0 ? 0 : target / s.len;
      return { x: s.x1 + (s.x2 - s.x1) * t, y: s.y1 + (s.y2 - s.y1) * t };
    }
    target -= s.len;
  }
  return { x: points[0], y: points[1] };
}

export function ghostSizeFor(source: CanvasElement): { w: number; h: number } {
  let w = source.width, h = source.height;
  if (w > GHOST_MAX_W || h > GHOST_MAX_H) {
    const ratio = w / h;
    if (w > GHOST_MAX_W) { w = GHOST_MAX_W; h = Math.round(w / ratio); }
    if (h > GHOST_MAX_H) { h = GHOST_MAX_H; w = Math.round(h * ratio); }
  }
  return { w: Math.max(GHOST_MIN_W, Math.round(w)), h: Math.max(GHOST_MIN_H, Math.round(h)) };
}

export function computeGhostRect(source: CanvasElement, fromAnchor: AnchorSide, mouseX: number, mouseY: number): Rect {
  const { w, h } = ghostSizeFor(source);
  let left = mouseX - w / 2;
  let top = mouseY - h / 2;
  const srcLeft = source.x - GHOST_MIN_GAP, srcRight = source.x + source.width + GHOST_MIN_GAP;
  const srcTop = source.y - GHOST_MIN_GAP, srcBottom = source.y + source.height + GHOST_MIN_GAP;
  const overlapsX = left < srcRight && left + w > srcLeft;
  const overlapsY = top < srcBottom && top + h > srcTop;
  if (overlapsX && overlapsY) {
    const dir = getAnchorDirection(fromAnchor);
    if (dir.dx > 0) left = srcRight;
    else if (dir.dx < 0) left = srcLeft - w;
    else if (dir.dy > 0) top = srcBottom;
    else top = srcTop - h;
  }
  return { x: Math.round(left), y: Math.round(top), width: w, height: h };
}

export function nearestAnchorForSource(rect: Rect, source: CanvasElement): AnchorSide {
  const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
  const srcCx = source.x + source.width / 2, srcCy = source.y + source.height / 2;
  const dx = srcCx - cx, dy = srcCy - cy;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'bottom' : 'top';
}

export function cloneForConnector(rect: Rect, source: CanvasElement): CanvasElement {
  const newId = uid();
  const base = { id: newId, x: rect.x, y: rect.y, width: rect.width, height: rect.height, rotation: 0 };
  switch (source.type) {
    case 'shape': return { ...source, ...base, text: '' };
    case 'text': return { ...source, ...base, text: '', html: undefined };
    case 'image': return { ...source, ...base };
    case 'stamp': return { ...source, ...base };
    case 'table': return { ...source, ...base, data: source.data.map((row) => row.map(() => '')) };
    case 'footer': return { ...source, ...base, text: '' };
    case 'placeholder': return { ...source, ...base, sample: '' };
    default:
      return {
        type: 'shape', shape: 'roundRect', ...base, fill: '#eef2ff', stroke: '#6366f1', strokeWidth: 2,
        text: '', fontSize: 14, textFill: '#1e293b', radius: 8, textAlign: 'center', textVerticalAlign: 'middle',
        textPadding: { top: 8, right: 8, bottom: 8, left: 8 }, textFontFamily: 'Arial', textLineHeight: 1.3,
        textFontStyle: 'normal', textDecoration: '',
      } as CanvasElement;
  }
}