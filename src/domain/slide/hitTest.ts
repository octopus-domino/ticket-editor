/* ============================================================
   domain/slide/hitTest.ts

   ARC-LAYER-02: домен не знает про React/Konva.
   Чистые функции hit-testing по bbox. Без side effects.
   ============================================================ */

import type { CanvasElement } from '@/shared/types';
import { tableAxis } from '@/lib/tableGeometry';

export interface HitTestOptions {
  /** Типы, которые не участвуют в hit-test (по умолчанию: connector, line, fill). */
  ignoreTypes?: string[];
  /** Учитывать заблокированные элементы? */
  includeLocked?: boolean;
}

const DEFAULT_IGNORE = ['connector', 'line', 'fill'];

/**
 * Ищет верхний элемент под точкой (x, y) в мировых координатах.
 * Возвращает null, если пусто.
 */
export function findElementAt(
  elements: CanvasElement[],
  x: number,
  y: number,
  options: HitTestOptions = {},
): CanvasElement | null {
  const ignore = new Set(options.ignoreTypes ?? DEFAULT_IGNORE);
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (ignore.has(el.type)) continue;
    if (el.locked && !options.includeLocked) continue;
    if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
      return el;
    }
  }
  return null;
}

/**
 * Для таблицы — находит конкретную ячейку под точкой (мировые координаты).
 */
export function findTableCellAt(
  el: { x: number; y: number; width: number; height: number; rows: number; cols: number; rotation?: number; rowHeights?: number[]; columnWidths?: number[] },
  x: number,
  y: number,
): { row: number; col: number } | null {
  const angle = -(el.rotation ?? 0) * Math.PI / 180;
  const lx = (x - el.x) * Math.cos(angle) - (y - el.y) * Math.sin(angle);
  const ly = (x - el.x) * Math.sin(angle) + (y - el.y) * Math.cos(angle);
  if (lx < 0 || ly < 0 || lx > el.width || ly > el.height) return null;
  const xs = tableAxis(el.width, el.cols, el.columnWidths);
  const ys = tableAxis(el.height, el.rows, el.rowHeights);
  const col = Math.max(0, xs.slice(1).findIndex((edge, index) => lx < edge || index === el.cols - 1));
  const row = Math.max(0, ys.slice(1).findIndex((edge, index) => ly < edge || index === el.rows - 1));
  return { row, col };
}
