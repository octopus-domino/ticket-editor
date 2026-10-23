/* ============================================================
   domain/slide/hitTest.ts

   ARC-LAYER-02: домен не знает про React/Konva.
   Чистые функции hit-testing по bbox. Без side effects.
   ============================================================ */

import type { CanvasElement } from '@/shared/types';

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
  el: { x: number; y: number; width: number; height: number; rows: number; cols: number },
  x: number,
  y: number,
): { row: number; col: number } | null {
  const lx = x - el.x;
  const ly = y - el.y;
  if (lx < 0 || ly < 0 || lx > el.width || ly > el.height) return null;
  const cellW = el.width / el.cols;
  const cellH = el.height / el.rows;
  const col = Math.max(0, Math.min(el.cols - 1, Math.floor(lx / cellW)));
  const row = Math.max(0, Math.min(el.rows - 1, Math.floor(ly / cellH)));
  return { row, col };
}