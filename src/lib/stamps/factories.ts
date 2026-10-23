import type {
  StampElement, StampShape,
  StampShapeItem, StampTextItem, StampImageItem, StampShapeKind,
} from '@/shared/types';
import { uid } from '../uid';
import type { StampTemplate } from './types';
import {
  computeNewShapeGeometry,
  findHostShape,
  computeArcParams,
  DEFAULT_ARC_OFFSET,
  DEFAULT_ARC_SPAN_DEG,
  type PlacementMode,
} from './geometry';
import { getShapeStrategy } from './shapes';

/* ============================================================
   Обёртки для StampElement
   ============================================================ */

export function newStampFromTemplate(
  t: StampTemplate,
  x = 200,
  y = 200,
): StampElement {
  return {
    id: uid(),
    type: 'stamp',
    x, y,
    width: t.width,
    height: t.height,
    rotation: 0,
    libraryId: t.id,
    shapes: JSON.parse(JSON.stringify(t.shapes)),
    texts: JSON.parse(JSON.stringify(t.texts)),
    images: t.images ? JSON.parse(JSON.stringify(t.images)) : [],
  };
}

export function newLegacyStamp(shape: StampShape, x = 200, y = 200): StampElement {
  return {
    id: uid(), type: 'stamp', shape, x, y,
    width: shape === 'rect' ? 260 : shape === 'oval' ? 240 : 200,
    height: shape === 'rect' ? 120 : shape === 'oval' ? 150 : shape === 'triangle' ? 173 : 200,
    rotation: 0, stampColor: '#1a1a1a',
    strokeWidth: 3, strokeDash: 'solid',
    innerStrokeWidth: 1, innerStrokeDash: 'solid', showInner: true,
    topText: 'НАЗВАНИЕ', topFontSize: 14, topFontFamily: 'Arial',
    topFontStyle: 'bold', topTextDecoration: '', topColor: '#1a1a1a',
    centerText: '2026', centerFontSize: 20, centerFontFamily: 'Arial',
    centerFontStyle: 'bold', centerTextDecoration: '', centerColor: '#1a1a1a',
    bottomText: 'ГОРОД', bottomFontSize: 12, bottomFontFamily: 'Arial',
    bottomFontStyle: 'normal', bottomTextDecoration: '', bottomColor: '#1a1a1a',
  };
}

/* ============================================================
   Внутренние элементы штампа
   ============================================================ */

export type { PlacementMode };

export interface FactoryContext {
  shapes: StampShapeItem[];
  selectedId: string | null;
  selectedType: 'shape' | 'text' | 'image' | null;
  stampW: number;
  stampH: number;
  placementMode: PlacementMode;
}

function resolveHost(ctx: FactoryContext): StampShapeItem | null {
  if (ctx.selectedType !== 'shape' || !ctx.selectedId) return null;
  return ctx.shapes.find((s) => s.id === ctx.selectedId) || null;
}

export function createShape(kind: StampShapeKind, ctx: FactoryContext): StampShapeItem {
  const strategy = getShapeStrategy(kind);
  const def = strategy.defaultSize;
  const host = resolveHost(ctx);
  const geom = computeNewShapeGeometry(
    host, def.w, def.h, ctx.stampW, ctx.stampH, ctx.placementMode, 12,
  );
  const normalized = strategy.normalizeGeometry(geom);

  const shape: StampShapeItem = {
    id: uid(), kind,
    x: normalized.x, y: normalized.y,
    width: normalized.width, height: normalized.height,
    rotation: 0,
    cornerRadius: def.corner,
    stroke: '#1a1a1a',
    strokeWidth: 1,
    dash: 'solid',
  };
  if (kind === 'line') shape.points = [0, normalized.height / 2, normalized.width, normalized.height / 2];
  return shape;
}

export function createStraightText(ctx: FactoryContext): StampTextItem {
  const host = resolveHost(ctx);
  const w = 180, h = 24;
  const pos = host
    ? { x: host.x + (host.width - w) / 2, y: host.y + (host.height - h) / 2 }
    : { x: (ctx.stampW - w) / 2, y: (ctx.stampH - h) / 2 };

  return {
    id: uid(), text: 'Мой текст', mode: 'straight',
    x: Math.round(pos.x), y: Math.round(pos.y), width: w, align: 'center',
    arcCx: ctx.stampW / 2, arcCy: ctx.stampH / 2, arcRadius: 60,
    arcStartDeg: -30, arcEndDeg: 30, arcFlip: false,
    arcOffset: DEFAULT_ARC_OFFSET,
    arcSpanDeg: DEFAULT_ARC_SPAN_DEG,
    fontSize: 14, fontFamily: 'Arial', fontStyle: 'normal',
    textDecoration: '', fill: '#1a1a1a',
  };
}

export function createArcText(ctx: FactoryContext): StampTextItem {
  let host = resolveHost(ctx);
  if (!host) host = findHostShape(ctx.stampW / 2, ctx.stampH / 2, '', ctx.shapes);

  const fakeHost: StampShapeItem = host || {
    id: 'fake', kind: 'ellipse',
    x: 0, y: 0, width: ctx.stampW, height: ctx.stampH,
    rotation: 0, cornerRadius: 0, stroke: '', strokeWidth: 0, dash: 'solid',
  };

  const params = computeArcParams(
    fakeHost, 14, 'Новый текст'.length, true, 0,
    DEFAULT_ARC_OFFSET, DEFAULT_ARC_SPAN_DEG, 'cw',
  );

  return {
    id: uid(), text: 'Новый текст', mode: 'arc',
    x: 0, y: 0, width: 200, align: 'center',
    ...params,
    arcDirection: 'cw',
    arcOffset: DEFAULT_ARC_OFFSET,
    arcSpanDeg: DEFAULT_ARC_SPAN_DEG,
    arcHostId: host ? host.id : undefined,
    fontSize: 14, fontFamily: 'Arial', fontStyle: 'normal',
    textDecoration: '', fill: '#1a1a1a',
  };
}

export function createImage(
  src: string, w: number, h: number,
  stampW: number, stampH: number,
): StampImageItem {
  return {
    id: uid(), src,
    x: Math.round((stampW - w) / 2),
    y: Math.round((stampH - h) / 2),
    width: w, height: h,
    fit: 'contain',
    name: 'Картинка',
  };
}

export function createFillSubtract(
  shapes: StampShapeItem[],
  selectedId: string | null,
): StampShapeItem | null {
  let outer = selectedId
    ? shapes.find((s) => s.id === selectedId && s.kind !== 'fill') || null
    : null;

  if (!outer) {
    const candidates = shapes.filter(
      (s) => s.kind !== 'fill' && !s.hidden && s.kind !== 'line',
    );
    if (!candidates.length) return null;
    outer = candidates.reduce((a, b) =>
      a.width * a.height >= b.width * b.height ? a : b,
    );
  }

  const ox = outer.x, oy = outer.y, ow = outer.width, oh = outer.height;
  const holeIds: string[] = [];
  for (const s of shapes) {
    if (s.id === outer.id || s.kind === 'fill' || s.kind === 'line') continue;
    if (s.hidden) continue;
    const cx = s.x + s.width / 2, cy = s.y + s.height / 2;
    if (cx >= ox && cx <= ox + ow && cy >= oy && cy <= oy + oh) holeIds.push(s.id);
  }

  return {
    id: uid(), kind: 'fill',
    x: ox, y: oy, width: ow, height: oh,
    rotation: 0, cornerRadius: 0,
    stroke: '', strokeWidth: 0, dash: 'solid',
    fill: '#bfdbfe',
    name: 'Вычитание',
    fillMode: 'subtract',
    fillOuterId: outer.id,
    fillHoleIds: holeIds,
  };
}

export function createFillIntersect(
  shapes: StampShapeItem[],
  selectedId: string | null,
): StampShapeItem | null {
  let a = selectedId
    ? shapes.find((s) => s.id === selectedId && s.kind !== 'fill') || null
    : null;

  if (!a) {
    const candidates = shapes.filter(
      (s) => s.kind !== 'fill' && !s.hidden && s.kind !== 'line',
    );
    if (candidates.length < 2) return null;
    a = candidates[0];
  }

  const others = shapes.filter(
    (s) => s.id !== a!.id && s.kind !== 'fill' && !s.hidden && s.kind !== 'line',
  );
  if (!others.length) return null;

  const interArea = (p: StampShapeItem, q: StampShapeItem) => {
    const x1 = Math.max(p.x, q.x), y1 = Math.max(p.y, q.y);
    const x2 = Math.min(p.x + p.width, q.x + q.width);
    const y2 = Math.min(p.y + p.height, q.y + q.height);
    return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  };

  let b = others[0];
  let best = interArea(a, b);
  for (const o of others) {
    const v = interArea(a, o);
    if (v > best) { best = v; b = o; }
  }

  const minX = Math.min(a.x, b.x), minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);

  return {
    id: uid(), kind: 'fill',
    x: minX, y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    rotation: 0, cornerRadius: 0,
    stroke: '', strokeWidth: 0, dash: 'solid',
    fill: '#fca5a5',
    name: 'Пересечение',
    fillMode: 'intersect',
    fillOuterId: a.id,
    fillHoleIds: [b.id],
  };
}

export function createFillBetween(
  outer: StampShapeItem,
  holes: StampShapeItem[],
  color: string,
  name = 'Заливка области',
): StampShapeItem {
  return {
    id: uid(), kind: 'fill',
    x: outer.x, y: outer.y,
    width: Math.max(1, outer.width),
    height: Math.max(1, outer.height),
    rotation: 0, cornerRadius: 0,
    stroke: '', strokeWidth: 0, dash: 'solid',
    fill: color,
    name,
    fillMode: 'subtract',
    fillOuterId: outer.id,
    fillHoleIds: holes.map((h) => h.id),
  };
}