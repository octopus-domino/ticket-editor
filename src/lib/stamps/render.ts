import type { DashType } from '@/shared/types';

export const STAMP_DASH_MAP: Record<DashType, number[] | undefined> = {
  solid: undefined,
  dashed: [10, 6],
  dotted: [2, 5],
  dashdot: [10, 5, 2, 5],
  longdash: [20, 8],
};

export const konvaStyle = (s: string): string => {
  const parts: string[] = [];
  if (s.includes('bold')) parts.push('bold');
  if (s.includes('italic')) parts.push('italic');
  return parts.join(' ') || 'normal';
};

export const canvasFont = (family: string, style: string, size: number): string => {
  const parts: string[] = [];
  if (style.includes('italic')) parts.push('italic');
  if (style.includes('bold')) parts.push('bold');
  parts.push(`${size}px`);
  parts.push(family);
  return parts.join(' ');
};

export interface ArcTextParams {
  text: string;
  cx: number;
  cy: number;
  radius: number;
  radiusX?: number;
  radiusY?: number;
  startDeg: number;
  endDeg: number;
  flip: boolean;
  font: string;
  fill: string;
}

/* ============================================================
   Утилиты для эллипса
   ============================================================ */

/**
 * Длина эллиптической дуги от угла a0 до угла a1.
 * Численное интегрирование методом Симпсона по 64 шагам.
 * Используется для равномерной расстановки букв по длине.
 */
function ellipseArcLength(
  rx: number, ry: number,
  a0: number, a1: number,
): number {
  const N = 64;
  const h = (a1 - a0) / N;
  let sum = 0;
  for (let i = 0; i <= N; i++) {
    const a = a0 + i * h;
    const speed = Math.hypot(rx * Math.sin(a), ry * Math.cos(a));
    const w = (i === 0 || i === N) ? 1 : (i % 2 === 0 ? 2 : 4);
    sum += w * speed;
  }
  return Math.abs((h / 3) * sum);
}

/**
 * Найти угол a такой, что длина дуги от startDeg до a
 * равна target (доли от полной длины 0..1).
 * Бинарный поиск.
 */
function angleAtArcFraction(
  rx: number, ry: number,
  aStart: number, aEnd: number,
  fraction: number,
): number {
  const total = ellipseArcLength(rx, ry, aStart, aEnd);
  if (total === 0) return aStart;
  const target = total * fraction;

  let lo = 0, hi = 1;
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    const a = aStart + (aEnd - aStart) * mid;
    const len = ellipseArcLength(rx, ry, aStart, a);
    if (len < target) lo = mid; else hi = mid;
  }
  return aStart + (aEnd - aStart) * (lo + hi) / 2;
}

/* ============================================================
   Отрисовка текста по эллиптической дуге
   ============================================================ */

/**
 * Текст ложится вдоль эллипса с радиусами (rx, ry).
 *
 * Правила:
 *  - Для круга (rx == ry) поведение совпадает с классическим.
 *  - Буквы распределены РАВНОМЕРНО ПО ДЛИНЕ ДУГИ, а не по углу.
 *  - Каждая буква ориентирована по касательной к эллипсу
 *    («верх» буквы смотрит наружу от центра).
 *  - Значение flip игнорируется: положение уже задано углами
 *    startDeg/endDeg, а направление чтения — порядком букв.
 */
export function drawArcText(ctx: CanvasRenderingContext2D, p: ArcTextParams): void {
  if (!p.text) return;

  const rx = p.radiusX ?? p.radius;
  const ry = p.radiusY ?? p.radius;
  if (!rx || !ry) return;

  const startRad = (p.startDeg * Math.PI) / 180;
  const endRad = (p.endDeg * Math.PI) / 180;
  const chars = Array.from(p.text);
  const n = chars.length;
  if (n === 0) return;

  /* Полная длина дуги — для равномерного распределения */
  const totalLen = ellipseArcLength(rx, ry, startRad, endRad);
  if (totalLen === 0) return;

  ctx.save();
  ctx.font = p.font;
  ctx.fillStyle = p.fill;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < n; i++) {
    const ch = chars[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') continue;

    /* Доля от начала до ЦЕНТРА этой буквы */
    const fraction = n > 1 ? (i + 0.5) / n : 0.5;
    const a = angleAtArcFraction(rx, ry, startRad, endRad, fraction);

    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const x = p.cx + cosA * rx;
    const y = p.cy + sinA * ry;

    /* Касательная к эллипсу: d/da (rx·cos a, ry·sin a) = (-rx·sin a, ry·cos a) */
    const tx = -rx * sinA;
    const ty = ry * cosA;
    const rot = Math.atan2(ty, tx);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}