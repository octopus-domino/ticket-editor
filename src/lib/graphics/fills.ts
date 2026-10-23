/* ============================================================
   lib/graphics/fills.ts

   Преобразование AppearanceFill / AppearanceStroke:
   · в Konva props (для ShapeEl, TextEl, LineEl)
   · в SVG defs + ссылка на fill (для exporters.ts)

   NFR-PERF: чистые функции, вызываются на каждом рендере.
   Кэш не нужен — вычисления тривиальны.
   ============================================================ */

import type {
  AppearanceFill, AppearanceStroke,
} from '@/shared/types';
import { escapeXml } from '@/lib/svg/escape';

/* ---------- Konva ---------- */

export interface KonvaFillProps {
  fill?: string;
  fillLinearGradientStartPoint?: { x: number; y: number };
  fillLinearGradientEndPoint?:   { x: number; y: number };
  fillLinearGradientColorStops?: (number | string)[];
  fillRadialGradientStartPoint?: { x: number; y: number };
  fillRadialGradientEndPoint?:   { x: number; y: number };
  fillRadialGradientStartRadius?: number;
  fillRadialGradientEndRadius?:   number;
  fillRadialGradientColorStops?: (number | string)[];
  opacity?: number;
}

/**
 * AppearanceFill → props для Konva. Для text всегда solid.
 */
export function fillToKonva(
  fill: AppearanceFill | undefined,
  bbox: { width: number; height: number },
  isText: boolean = false,
): KonvaFillProps {
  if (!fill) return { fill: '#888888' };

  if (isText || fill.type === 'solid') {
    return { fill: fill.color ?? '#888888', opacity: fill.opacity ?? 1 };
  }

  if (fill.type === 'linear') {
    const angleRad = ((fill.angle ?? 0) * Math.PI) / 180;
    const dx = Math.cos(angleRad);
    const dy = Math.sin(angleRad);
    const cx = bbox.width / 2;
    const cy = bbox.height / 2;
    const len = Math.hypot(bbox.width, bbox.height) / 2;
    const stops = (fill.stops ?? []).flatMap(s => [s.offset, s.color]);
    return {
      fillLinearGradientStartPoint: { x: cx - dx * len, y: cy - dy * len },
      fillLinearGradientEndPoint:   { x: cx + dx * len, y: cy + dy * len },
      fillLinearGradientColorStops: stops,
      opacity: fill.opacity ?? 1,
    };
  }

  // radial
  const cx = bbox.width / 2;
  const cy = bbox.height / 2;
  const r = Math.max(bbox.width, bbox.height) / 2;
  const stops = (fill.stops ?? []).flatMap(s => [s.offset, s.color]);
  return {
    fillRadialGradientStartPoint: { x: cx, y: cy },
    fillRadialGradientEndPoint:   { x: cx, y: cy },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndRadius: r,
    fillRadialGradientColorStops: stops,
    opacity: fill.opacity ?? 1,
  };
}

/* ---------- SVG ---------- */

export interface SvgFillResult {
  defs: string;
  fillAttr: string;
  opacityAttr: string;
}

const DEF_ID_PREFIX = 'grad_';

/**
 * AppearanceFill → SVG defs (для <defs>) + значение для атрибута fill.
 * Уникальный id генерируется от fill.id — стабильно между рендерами.
 *
 * ВАЖНО: exporters.ts должен собрать все <defs> сверху слайда.
 * Здесь только возвращаем строку — склейка в serialize.ts.
 */
export function fillToSvg(
  fill: AppearanceFill | undefined,
  _bbox: { width: number; height: number },
): SvgFillResult {
  if (!fill) {
    return { defs: '', fillAttr: '#888888', opacityAttr: '' };
  }

  if (fill.type === 'solid') {
    return {
      defs: '',
      fillAttr: escapeXml(fill.color ?? '#888888'),
      opacityAttr: fill.opacity !== undefined && fill.opacity !== 1
        ? ` opacity="${fill.opacity}"`
        : '',
    };
  }

  const defId = DEF_ID_PREFIX + fill.id;
  const stops = (fill.stops ?? [])
    .map(s => `<stop offset="${s.offset * 100}%" stop-color="${escapeXml(s.color)}"/>`)
    .join('');

  let defs: string;

  if (fill.type === 'linear') {
    const angle = fill.angle ?? 0;
    const angleRad = (angle * Math.PI) / 180;
    const x1 = 50 - Math.cos(angleRad) * 50;
    const y1 = 50 - Math.sin(angleRad) * 50;
    const x2 = 50 + Math.cos(angleRad) * 50;
    const y2 = 50 + Math.sin(angleRad) * 50;
    defs = `<linearGradient id="${defId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">${stops}</linearGradient>`;
  } else {
    defs = `<radialGradient id="${defId}" cx="50%" cy="50%" r="50%">${stops}</radialGradient>`;
  }

  return {
    defs,
    fillAttr: `url(#${defId})`,
    opacityAttr: fill.opacity !== undefined && fill.opacity !== 1
      ? ` opacity="${fill.opacity}"`
      : '',
  };
}

/* ---------- Stroke ---------- */

export interface SvgStrokeAttrs {
  strokeAttr: string;
  strokeWidthAttr: string;
  dashAttr: string;
  alignAttr: string;
}

export function strokeToSvg(stroke: AppearanceStroke): SvgStrokeAttrs {
  const dashMap: Record<string, string> = {
    solid: '',
    dashed: '10,6',
    dotted: '2,5',
    dashdot: '10,5,2,5',
    longdash: '20,8',
  };
  return {
    strokeAttr: ` stroke="${escapeXml(stroke.color)}"`,
    strokeWidthAttr: ` stroke-width="${stroke.width}"`,
    dashAttr: stroke.dash && stroke.dash !== 'solid'
      ? ` stroke-dasharray="${dashMap[stroke.dash] ?? ''}"`
      : '',
    // SVG не поддерживает stroke-align — оставляем пустым
    alignAttr: '',
  };
}