/* ============================================================
   lib/polyline.ts

   Утилиты для работы с линиями: сериализация, поиск ближайшего
   сегмента, вставка/удаление точки, масштабирование, bbox.

   Используется и на канвасе (LineEl), и в штампах (LineView),
   и в панелях свойств.
   ============================================================ */

export interface PolylinePoint {
  x: number;
  y: number;
}

/** Разбор плоского массива [x1, y1, x2, y2, ...] в массив точек. */
export function parsePoints(flat: number[] | undefined): PolylinePoint[] {
  if (!flat || flat.length < 4) return [];
  const out: PolylinePoint[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    out.push({ x: flat[i], y: flat[i + 1] });
  }
  return out;
}

/** Сериализация массива точек в плоский массив. */
export function serializePoints(pts: PolylinePoint[]): number[] {
  const out: number[] = [];
  for (const p of pts) out.push(p.x, p.y);
  return out;
}

/**
 * Найти ближайший сегмент к точке (px, py).
 * Возвращает индекс сегмента, параметр t (0..1) на нём,
 * расстояние до сегмента и координаты проекции.
 */
export function findNearestSegment(
  points: PolylinePoint[],
  px: number,
  py: number,
): { segmentIndex: number; t: number; distance: number; pointX: number; pointY: number } {
  let best = {
    segmentIndex: 0, t: 0, distance: Infinity, pointX: 0, pointY: 0,
  };
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
    const qx = a.x + t * dx;
    const qy = a.y + t * dy;
    const d = Math.hypot(px - qx, py - qy);
    if (d < best.distance) {
      best = { segmentIndex: i, t, distance: d, pointX: qx, pointY: qy };
    }
  }
  return best;
}

/**
 * Вставить точку в ближайший сегмент.
 *  - snapRadius — не дублировать точку, если клик попал почти на существующую.
 *  - Возвращает новый массив; если изменений нет, вернёт исходный.
 */
export function insertPoint(
  points: PolylinePoint[],
  px: number,
  py: number,
  snapRadius = 5,
): PolylinePoint[] {
  for (const p of points) {
    if (Math.hypot(p.x - px, p.y - py) < snapRadius) return points;
  }

  const { segmentIndex, pointX, pointY } = findNearestSegment(points, px, py);
  const next = points.slice();
  next.splice(segmentIndex + 1, 0, { x: Math.round(pointX), y: Math.round(pointY) });
  return next;
}

/** Удалить точку по индексу. Минимум 2 точки должно остаться. */
export function removePoint(points: PolylinePoint[], index: number): PolylinePoint[] {
  if (points.length <= 2) return points;
  const next = points.slice();
  next.splice(index, 1);
  return next;
}

/** Масштабирование точек относительно точки привязки (в тех же координатах). */
export function scalePoints(
  points: PolylinePoint[],
  sx: number,
  sy: number,
  ox = 0,
  oy = 0,
): PolylinePoint[] {
  return points.map((p) => ({
    x: (p.x - ox) * sx + ox,
    y: (p.y - oy) * sy + oy,
  }));
}

/** BBox набора точек. */
export function getPointsBBox(points: PolylinePoint[]): {
  minX: number; minY: number; maxX: number; maxY: number;
  width: number; height: number;
} {
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Гарантирует минимум 2 точки: если пришёл пустой массив — вернёт горизонталь. */
export function ensureMinimalPoints(
  flat: number[] | undefined,
  width: number,
  height: number,
): number[] {
  if (flat && flat.length >= 4) return flat;
  return [0, height / 2, width, height / 2];
}