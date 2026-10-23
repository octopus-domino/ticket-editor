/* ============================================================
   lib/graphics/graphs.ts

   Генераторы графиков: BarChart, DonutChart.
   Возвращают массив готовых CanvasElement — их сразу можно
   положить в docStore.

   NFR-PERF: чистые функции, генерация O(n).
   ============================================================ */

import type { ShapeElement } from '@/shared/types';
import { generateIdWithPrefix } from '@/shared/utils/id';

export const CHART_PALETTE = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#0ea5e9', '#84cc16',
];

export interface BarChartOptions {
  x?: number;
  y?: number;
  barWidth?: number;
  gap?: number;
  maxHeight?: number;
  colors?: string[];
}

export function generateBarChart(
  values: readonly number[],
  options: BarChartOptions = {},
): ShapeElement[] {
  const {
    x = 120, y = 320,
    barWidth = 40, gap = 12, maxHeight = 220,
    colors = CHART_PALETTE,
  } = options;

  if (values.length === 0) return [];

  const max = Math.max(...values) || 1;
  const totalWidth = values.length * barWidth + (values.length - 1) * gap;

  const result: ShapeElement[] = [];

  // Ось Y
  result.push({
    id: generateIdWithPrefix('axis-y'),
    type: 'shape', shape: 'rect',
    x: x - 10, y: y - maxHeight - 20,
    width: 2, height: maxHeight + 20,
    rotation: 0, fill: '#cbd5e1', stroke: 'transparent', strokeWidth: 0,
    text: '', fontSize: 16, textFill: '#111',
  });

  // Ось X
  result.push({
    id: generateIdWithPrefix('axis-x'),
    type: 'shape', shape: 'rect',
    x: x - 10, y,
    width: totalWidth + 20, height: 2,
    rotation: 0, fill: '#cbd5e1', stroke: 'transparent', strokeWidth: 0,
    text: '', fontSize: 16, textFill: '#111',
  });

  // Столбики
  for (let i = 0; i < values.length; i++) {
    const h = (values[i] / max) * maxHeight;
    const color = colors[i % colors.length];
    result.push({
      id: generateIdWithPrefix('bar'),
      type: 'shape', shape: 'rect',
      x: x + i * (barWidth + gap),
      y: y - h,
      width: barWidth,
      height: Math.max(1, h),
      rotation: 0,
      fill: color, stroke: 'transparent', strokeWidth: 0,
      text: '', fontSize: 16, textFill: '#111',
    });
  }

  return result;
}

export interface DonutChartOptions {
  cx?: number;
  cy?: number;
  outerRadius?: number;
  innerRadius?: number;
  colors?: string[];
}

export function generateDonutChart(
  values: readonly number[],
  options: DonutChartOptions = {},
): ShapeElement[] {
  const {
    cx = 350, cy = 320,
    outerRadius = 140, innerRadius = 70,
    colors = CHART_PALETTE,
  } = options;

  const total = values.reduce((s, v) => s + v, 0);
  if (total <= 0) return [];

  const result: ShapeElement[] = [];
  let angle = -Math.PI / 2;

  for (let i = 0; i < values.length; i++) {
    const share = values[i] / total;
    const a0 = angle;
    const a1 = angle + share * Math.PI * 2;
    angle = a1;

    const steps = Math.max(4, Math.round(share * 60));
    const pts: number[] = [];

    for (let s = 0; s <= steps; s++) {
      const t = a0 + (a1 - a0) * (s / steps);
      pts.push(Math.cos(t) * outerRadius, Math.sin(t) * outerRadius);
    }
    for (let s = steps; s >= 0; s--) {
      const t = a0 + (a1 - a0) * (s / steps);
      pts.push(Math.cos(t) * innerRadius, Math.sin(t) * innerRadius);
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let k = 0; k < pts.length; k += 2) {
      if (pts[k] < minX) minX = pts[k];
      if (pts[k] > maxX) maxX = pts[k];
      if (pts[k + 1] < minY) minY = pts[k + 1];
      if (pts[k + 1] > maxY) maxY = pts[k + 1];
    }

    const localPts = pts.map((v, idx) =>
      idx % 2 === 0 ? Math.round(v - minX) : Math.round(v - minY),
    );

    result.push({
      id: generateIdWithPrefix('segment'),
      type: 'shape', shape: 'polygon',
      x: cx + minX,
      y: cy + minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
      rotation: 0,
      fill: colors[i % colors.length],
      stroke: '#ffffff', strokeWidth: 1,
      text: '', fontSize: 16, textFill: '#111',
      polygonPoints: localPts,
    } as ShapeElement);
  }

  return result;
}