/* ============================================================
   lib/stamps/history/autoKey.ts

   REG-B1, REG-B4: определяет, какие поля патча относятся к
   «непрерывным» изменениям (drag/slider/number-input-hold) и
   могут быть склеены в один undo-шаг.
   ============================================================ */

/** Поля, генерирующие много событий при перетаскивании. */
const CONTINUOUS_FIELDS = new Set<string>([
  'points',
  'arcSpanDeg', 'arcOffset', 'arcRx', 'arcRy',
  'arcStartDeg', 'arcEndDeg',
  'fontSize', 'strokeWidth', 'cornerRadius', 'opacity',
  'fill', 'stroke',
  'topColor', 'centerColor', 'bottomColor',
]);

/** Поля, которые всегда создают отдельный undo-шаг (дискретные). */
const DISCRETE_FIELDS = new Set<string>([
  'x', 'y', 'width', 'height', 'rotation',
  'arcCx', 'arcCy',
  'text', 'mode', 'name',
  'fillTargetShapeId', 'fillMode', 'fillOuterId', 'fillHoleIds',
  'locked', 'hidden',
  'fontStyle', 'textDecoration', 'align', 'fontFamily',
  'arcFlip', 'arcOutside',
  'src', 'fit',
]);

/**
 * Возвращает mergeKey для `useStampHistory.push`, если патч
 * содержит только «непрерывные» поля. Для дискретных изменений
 * (или смешанных) возвращает `undefined` — отдельный undo-шаг.
 */
export function autoKey(id: string, patch: object): string | undefined {
  const keys = Object.keys(patch);
  if (keys.length === 0) return undefined;
  if (keys.some((k) => DISCRETE_FIELDS.has(k))) return undefined;
  if (!keys.some((k) => CONTINUOUS_FIELDS.has(k))) return undefined;
  return `${id}:${keys.slice().sort().join(',')}`;
}