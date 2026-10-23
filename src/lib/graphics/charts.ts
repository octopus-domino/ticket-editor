/* ============================================================
   lib/graphics/charts.ts

   Чистые функции для вычисления геометрии Bar / Donut.
   Используются ChartEl (Konva) и toSvgChart (SVG).
   Не зависят от Konva/DOM — тестируются отдельно.
   ============================================================ */

export const CHART_PALETTE = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#0ea5e9', '#84cc16',
];

const AXIS_PADDING = 40;

export interface BarGeometry {
  x: number; y: number; width: number; height: number; fill: string;
}

export interface DonutGeometry {
  /** SVG-путь для сектора (в локальных координатах 0..totalW/0..totalH) */
  path: string;
  fill: string;
}

export interface BarChartOptions {
  barWidth?: number;
  gap?: number;
  palette?: string[];
}

export interface DonutChartOptions {
  innerRatio?: number;
  palette?: string[];
}

export function computeBarGeometry(
  values: readonly number[],
  totalW: number,
  totalH: number,
  opts: BarChartOptions = {},
): BarGeometry[] {
  if (!values.length || totalW <= 0 || totalH <= 0) return [];
  const { barWidth = 40, gap = 12, palette = CHART_PALETTE } = opts;
  const max = Math.max(...values) || 1;
  const chartH = Math.max(10, totalH - AXIS_PADDING * 2);
  const baseY = totalH - AXIS_PADDING;
  const startX = AXIS_PADDING;
  const out: BarGeometry[] = [];
  for (let i = 0; i < values.length; i++) {
    const h = (values[i] / max) * chartH;
    out.push({
      x: startX + i * (barWidth + gap),
      y: baseY - h,
      width: barWidth,
      height: Math.max(1, h),
      fill: palette[i % palette.length],
    });
  }
  return out;
}

export function computeDonutGeometry(
  values: readonly number[],
  totalW: number,
  totalH: number,
  opts: DonutChartOptions = {},
): DonutGeometry[] {
  if (!values.length || totalW <= 0 || totalH <= 0) return [];
  const total = values.reduce((s, v) => s + Math.max(0, v), 0);
  if (total <= 0) return [];
  const { innerRatio = 0.5, palette = CHART_PALETTE } = opts;
  const cx = totalW / 2;
  const cy = totalH / 2;
  const outerR = Math.max(4, Math.min(totalW, totalH) / 2 - 20);
  const innerR = outerR * Math.max(0, Math.min(1, innerRatio));

  const out: DonutGeometry[] = [];
  let angle = -Math.PI / 2;
  for (let i = 0; i < values.length; i++) {
    const share = Math.max(0, values[i]) / total;
    const a0 = angle;
    const a1 = angle + share * Math.PI * 2;
    angle = a1;
    const steps = Math.max(4, Math.round(share * 60));
    out.push({
      path: buildDonutSegment(cx, cy, outerR, innerR, a0, a1, steps),
      fill: palette[i % palette.length],
    });
  }
  return out;
}

function buildDonutSegment(
  cx: number, cy: number,
  outerR: number, innerR: number,
  a0: number, a1: number,
  steps: number,
): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = a0 + (a1 - a0) * (i / steps);
    pts.push(`${round(cx + Math.cos(t) * outerR)} ${round(cy + Math.sin(t) * outerR)}`);
  }
  for (let i = steps; i >= 0; i--) {
    const t = a0 + (a1 - a0) * (i / steps);
    pts.push(`${round(cx + Math.cos(t) * innerR)} ${round(cy + Math.sin(t) * innerR)}`);
  }
  return `M ${pts[0]} ` + pts.slice(1).map(p => `L ${p}`).join(' ') + ' Z';
}

const round = (n: number): number => Math.round(n * 100) / 100;