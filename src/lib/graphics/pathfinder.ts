import { union, difference, intersection, xor } from 'polyclip-ts';
import type { CanvasElement, ShapeElement } from '@/shared/types';
import { logger } from '@/shared/logger';
import { generateIdWithPrefix } from '@/shared/utils/id';

// Локальные типы, так как polyclip-ts не экспортирует их наружу
type Point = [number, number];
type Ring = Point[];
type Polygon = Ring[];
type MultiPolygon = Polygon[];

const ELLIPSE_STEPS = 96;

export type PathfinderOp = 'union' | 'subtract' | 'intersect' | 'exclude';

export const PATHFINDER_OPS: readonly { op: PathfinderOp; label: string }[] = [
  { op: 'union',     label: 'Объединить' },
  { op: 'subtract',  label: 'Вычесть' },
  { op: 'intersect', label: 'Пересечь' },
  { op: 'exclude',   label: 'Исключить' },
];

export interface PolygonPoints {
  points: number[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isBooleanOperand(el: CanvasElement): boolean {
  if (el.type !== 'shape' && el.type !== 'line') return false;
  if (el.symbolId) return false;
  return true;
}

function toFlatPolygon(el: CanvasElement): Polygon | null {
  if (el.symbolId) return null;

  if (el.type === 'shape' && el.shape === 'rect') {
    const x = Number(el.x), y = Number(el.y);
    const w = Number(el.width), h = Number(el.height);
    if (w <= 0 || h <= 0) return null;
    return [[
      [x, y], [x, y + h], [x + w, y + h], [x + w, y],
    ]];
  }

  if (el.type === 'shape' && el.shape === 'circle') {
    const cx = Number(el.x) + Number(el.width) / 2;
    const cy = Number(el.y) + Number(el.height) / 2;
    const rx = Number(el.width) / 2;
    const ry = Number(el.height) / 2;
    if (rx <= 0 || ry <= 0) return null;
    const ring: Ring = [];
    for (let i = 0; i < ELLIPSE_STEPS; i++) {
      const t = -(i / ELLIPSE_STEPS) * Math.PI * 2;
      ring.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
    }
    return [ring];
  }

  if (el.type === 'shape' && el.shape === 'triangle') {
    const x = Number(el.x), y = Number(el.y);
    const w = Number(el.width), h = Number(el.height);
    if (w <= 0 || h <= 0) return null;
    return [[
      [x + w / 2, y], [x, y + h], [x + w, y + h],
    ]];
  }

  if (el.type === 'shape' && el.shape === 'star') {
    const cx = Number(el.x) + Number(el.width) / 2;
    const cy = Number(el.y) + Number(el.height) / 2;
    const rOuter = Math.min(Number(el.width), Number(el.height)) / 2;
    const rInner = rOuter / 2.4;
    if (rOuter <= 0) return null;
    const points = 5;
    const ring: Ring = [];
    for (let i = 0; i < points * 2; i++) {
      const t = -(i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      ring.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    return [ring];
  }

  if (el.type === 'shape' && el.shape === 'polygon' && el.polygonPoints && el.polygonPoints.length >= 6) {
    const ring: Ring = [];
    for (let i = 0; i < el.polygonPoints.length; i += 2) {
      ring.push([Number(el.x) + el.polygonPoints[i], Number(el.y) + el.polygonPoints[i + 1]]);
    }
    return [ring];
  }

  if (el.type === 'line' && Array.isArray(el.points) && el.points.length >= 6) {
    const ring: Ring = [];
    for (let i = 0; i < el.points.length; i += 2) {
      ring.push([Number(el.x) + el.points[i], Number(el.y) + el.points[i + 1]]);
    }
    return [ring];
  }

  return null;
}

function extractRings(multi: MultiPolygon): { rings: number[][]; bbox: { x: number; y: number; width: number; height: number } } | null {
  if (!multi || multi.length === 0) return null;

  const rawRings: Ring[] = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const polygon of multi) {
    for (const ring of polygon) {
      if (ring.length < 3) continue;
      rawRings.push(ring);
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (rawRings.length === 0) return null;

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  const localRings = rawRings.map(ring =>
    ring.flatMap(([x, y]) => [Math.round(x - minX), Math.round(y - minY)])
  );

  return { rings: localRings, bbox: { x: minX, y: minY, width, height } };
}

export function applyPathfinder(
  elements: readonly CanvasElement[],
  op: PathfinderOp,
): ShapeElement | null {
  if (elements.length < 2) return null;

  const operands = elements
    .map(toFlatPolygon)
    .filter((p): p is Polygon => p !== null);

  if (operands.length < 2) {
    console.warn('[pathfinder] less than 2 valid operands', operands.length);
    return null;
  }

  let result: MultiPolygon;

  try {
    // Приводим типы, так как функции могут ожидать MultiPolygon (массив полигонов)
    const ops = operands as unknown as MultiPolygon[];
    if (op === 'union') result = union(ops[0], ...ops.slice(1));
    else if (op === 'subtract') result = difference(ops[0], ...ops.slice(1));
    else if (op === 'intersect') result = intersection(ops[0], ...ops.slice(1));
    else result = xor(ops[0], ...ops.slice(1));
  } catch (err) {
    console.error('[pathfinder] operation failed:', err);
    logger.error('pathfinder.failed', err, { op, count: operands.length });
    return null;
  }

  const extracted = extractRings(result);
  if (!extracted) {
    console.warn('[pathfinder] result extraction returned null');
    return null;
  }

  const source = elements[0];
  const defaultFills = source.type === 'shape'
    ? [{ id: generateIdWithPrefix('pf'), type: 'solid' as const, color: source.fill, opacity: 1 }]
    : [];
  const defaultStrokes = source.type === 'shape' && source.stroke !== 'transparent'
    ? [{ id: generateIdWithPrefix('pfs'), color: source.stroke, width: source.strokeWidth, align: 'center' as const }]
    : [];

  return {
    id: generateIdWithPrefix('path'),
    type: 'shape',
    shape: 'polygon',
    x: extracted.bbox.x,
    y: extracted.bbox.y,
    width: extracted.bbox.width,
    height: extracted.bbox.height,
    rotation: 0,
    appearance: {
      fills: source.appearance?.fills ?? defaultFills,
      strokes: source.appearance?.strokes ?? defaultStrokes,
    },
    fill: source.type === 'shape' ? source.fill : '#888888',
    stroke: source.type === 'shape' ? source.stroke : 'transparent',
    strokeWidth: source.type === 'shape' ? source.strokeWidth : 0,
    text: '',
    fontSize: 16,
    textFill: '#111',
    polygonPoints: extracted.rings[0],
    polygonSubpaths: extracted.rings,
  } as ShapeElement;
}