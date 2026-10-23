/* ============================================================
   lib/stamps/geometry/arc.ts
   F-SGEO-01..03, F-STMP-N-09, F-STMP-N-05.
   Направление обхода дуги + точный старт по курсору.
   ============================================================ */

import type { StampShapeItem } from '@/shared/types';

export const DEFAULT_ARC_SPAN_DEG = 320;
export const MIN_ARC_SPAN_DEG = 20;
export const MAX_ARC_SPAN_DEG = 350;
export const DEFAULT_ARC_OFFSET = 6;

export type ArcDirection = 'cw' | 'ccw';

export interface ArcParams {
  arcCx: number;
  arcCy: number;
  arcRadius: number;
  arcRx?: number;
  arcRy?: number;
  arcStartDeg: number;
  arcEndDeg: number;
  arcFlip: boolean;
}

function arcRadiusFor(
  host: StampShapeItem,
  fontSize: number,
  isOutside: boolean,
  arcOffset: number,
): number {
  const baseR = Math.min(host.width, host.height) / 2;
  const safeOffset = Math.max(0, arcOffset);
  if (isOutside) return baseR + safeOffset;
  return Math.max(fontSize * 0.8, baseR - safeOffset);
}

function resolveSpanDeg(
  fontSize: number,
  textLength: number,
  radius: number,
  explicitSpan?: number,
): number {
  if (explicitSpan !== undefined && explicitSpan > 0) {
    return Math.min(MAX_ARC_SPAN_DEG, Math.max(MIN_ARC_SPAN_DEG, explicitSpan));
  }
  const charWidth = fontSize * 0.6;
  const textWidth = Math.max(charWidth, textLength * charWidth);
  const raw = (textWidth / Math.max(1, radius)) * (180 / Math.PI);
  return Math.min(MAX_ARC_SPAN_DEG, Math.max(MIN_ARC_SPAN_DEG, raw));
}

/**
 * Создание arc-текста «сверху» / «снизу» (используется фабриками).
 * direction применяется для form-параметра spanDeg.
 */
export function computeArcParams(
  host: StampShapeItem,
  fontSize: number,
  textLength: number,
  isTop: boolean,
  ringOffset = 0,
  arcOffset = DEFAULT_ARC_OFFSET,
  arcSpanDeg = DEFAULT_ARC_SPAN_DEG,
  direction: ArcDirection = 'cw',
): ArcParams {
  const cx = host.x + host.width / 2;
  const cy = host.y + host.height / 2;
  const radius = arcRadiusFor(host, fontSize, false, arcOffset) - ringOffset * 12;
  const span = resolveSpanDeg(fontSize, textLength, radius, arcSpanDeg);
  const half = span / 2;

  if (isTop) {
    if (direction === 'cw') {
      // верхняя дуга, по часовой (слева-направо над фигурой)
      return {
        arcCx: cx, arcCy: cy, arcRadius: radius,
        arcStartDeg: -90 - half,
        arcEndDeg: -90 + half,
        arcFlip: false,
      };
    }
    // верхняя дуга, против часовой
    return {
      arcCx: cx, arcCy: cy, arcRadius: radius,
      arcStartDeg: -90 + half,
      arcEndDeg: -90 - half,
      arcFlip: true,
    };
  }

  if (direction === 'cw') {
    return {
      arcCx: cx, arcCy: cy, arcRadius: radius,
      arcStartDeg: 90 + half,
      arcEndDeg: 90 - half,
      arcFlip: true,
    };
  }
  return {
    arcCx: cx, arcCy: cy, arcRadius: radius,
    arcStartDeg: 90 - half,
    arcEndDeg: 90 + half,
    arcFlip: false,
  };
}

/**
 * F-SGEO-02 / F-STMP-E-25: создать/обновить arc-текст по курсору.
 * `arcStartDeg` = ровно точка под курсором (с компенсацией на полсимвола,
 * чтобы первый символ не съезжал), `arcEndDeg = start ± span` в зависимости
 * от `direction`.
 *
 * В canvas-координатах (y вниз) рост угла — по часовой стрелке.
 *   cw:  endDeg > startDeg
 *   ccw: endDeg < startDeg
 */
export function computeArcParamsForAngle(
  host: StampShapeItem,
  angleRad: number,
  fontSize: number,
  isOutside: boolean,
  spanDeg: number,
  arcOffset: number = DEFAULT_ARC_OFFSET,
  direction: ArcDirection = 'cw',
  charCount: number = 1,
): ArcParams {
  const cx = host.x + host.width / 2;
  const cy = host.y + host.height / 2;
  const radius = arcRadiusFor(host, fontSize, isOutside, arcOffset);

  const anchorDeg = (angleRad * 180) / Math.PI;
  const clampedSpan = Math.min(MAX_ARC_SPAN_DEG, Math.max(MIN_ARC_SPAN_DEG, spanDeg));

  // Первый символ центрируется в anchorDeg:
  // startDeg сдвигаем на -halfChar (cw) или +halfChar (ccw).
  const charSpan = clampedSpan / Math.max(1, charCount);
  const halfChar = charSpan / 2;

  if (direction === 'cw') {
    const startDeg = anchorDeg - halfChar;
    return {
      arcCx: cx, arcCy: cy, arcRadius: radius,
      arcStartDeg: startDeg,
      arcEndDeg: startDeg + clampedSpan,
      arcFlip: false,
    };
  }
  const startDeg = anchorDeg + halfChar;
  return {
    arcCx: cx, arcCy: cy, arcRadius: radius,
    arcStartDeg: startDeg,
    arcEndDeg: startDeg - clampedSpan,
    arcFlip: true,
  };
}

export interface ArcBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** bbox для arc-текста (для hit-area / inline-editor). */
export function arcTextBBox(t: {
  text: string;
  arcCx: number; arcCy: number;
  arcRadius: number;
  arcRx?: number;
  arcRy?: number;
  arcStartDeg: number; arcEndDeg: number;
  fontSize: number;
}): ArcBBox {
  const rx = t.arcRx ?? t.arcRadius;
  const ry = t.arcRy ?? t.arcRadius;

  const chars = t.text.split('');
  if (chars.length === 0) {
    return { x: t.arcCx - 20, y: t.arcCy - 20, width: 40, height: 40 };
  }
  const start = (t.arcStartDeg * Math.PI) / 180;
  const end = (t.arcEndDeg * Math.PI) / 180;
  const step = chars.length > 1 ? (end - start) / (chars.length - 1) : 0;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  chars.forEach((_, i) => {
    const a = start + i * step;
    const x = t.arcCx + Math.cos(a) * rx;
    const y = t.arcCy + Math.sin(a) * ry;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  });
  const pad = t.fontSize;
  return {
    x: minX - pad, y: minY - pad,
    width: (maxX - minX) + pad * 2,
    height: (maxY - minY) + pad * 2,
  };
}