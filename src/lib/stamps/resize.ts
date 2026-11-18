import { produce } from 'immer';
import type { Slide, StampElement, StampShapeItem, StampTextItem } from '@/shared/types';

/** Keeps the drawing and its selection bounds together for both numeric and pointer resizing. */
export function normalizeStampSizes(previous: Slide[], next: Slide[]): Slide[] {
  if (previous === next) return next;
  const before = new Map(previous.map(slide => [slide.id, slide]));
  const changes = next.flatMap((slide, page) => {
    const old = before.get(slide.id);
    if (!old || old === slide) return [];
    const elements = new Map(old.elements.map(element => [element.id, element]));
    return slide.elements.flatMap((element, index) => {
      const prior = elements.get(element.id);
      return element.type === 'stamp' && prior?.type === 'stamp' && resizeOnly(prior, element)
        ? [{ page, index, sx: element.width / prior.width, sy: element.height / prior.height }] : [];
    });
  });
  if (!changes.length) return next;
  return produce(next, draft => changes.forEach(({ page, index, sx, sy }) => {
    resizeStampContents(draft[page].elements[index] as StampElement, sx, sy);
  }));
}

function resizeOnly(before: StampElement, after: StampElement): boolean {
  return before.width > 0 && before.height > 0 && after.width > 0 && after.height > 0
    && (before.width !== after.width || before.height !== after.height)
    && before.shapes === after.shapes && before.texts === after.texts && before.images === after.images;
}

/** Mutates only an Immer draft's internal drawing; supplied replacement geometry is handled separately. */
export function resizeStampContents(stamp: StampElement, sx: number, sy: number): void {
  const scalar = Math.sqrt(sx * sy);
  stamp.shapes?.forEach(shape => resizeShape(shape, sx, sy, scalar));
  stamp.texts?.forEach(text => resizeText(text, sx, sy, scalar));
  stamp.images?.forEach(image => { image.x *= sx; image.y *= sy; image.width *= sx; image.height *= sy; });
  for (const key of ['strokeWidth', 'innerStrokeWidth', 'topFontSize', 'centerFontSize', 'bottomFontSize'] as const) {
    if (stamp[key] !== undefined) stamp[key] *= scalar;
  }
  if (stamp.shape === 'circle' && sx !== sy) stamp.shape = 'oval';
}

function resizeShape(shape: StampShapeItem, sx: number, sy: number, scalar: number): void {
  shape.x *= sx; shape.y *= sy; shape.width *= sx; shape.height *= sy;
  shape.strokeWidth *= scalar; shape.cornerRadius *= scalar;
  shape.points = shape.points?.map((point, index) => point * (index % 2 === 0 ? sx : sy));
  if (shape.kind === 'circle' && sx !== sy) shape.kind = 'ellipse';
}

function resizeText(text: StampTextItem, sx: number, sy: number, scalar: number): void {
  text.x *= sx; text.y *= sy; text.width *= sx; text.fontSize *= scalar;
  text.arcCx *= sx; text.arcCy *= sy;
  text.arcRx = (text.arcRx ?? text.arcRadius) * sx;
  text.arcRy = (text.arcRy ?? text.arcRadius) * sy;
  text.arcRadius *= scalar;
  if (text.arcOffset !== undefined) text.arcOffset *= scalar;
}
