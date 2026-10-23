import type { StampShapeItem, StampFillMode } from '@/shared/types';
import { getShapeStrategy } from './shapes/registry';

export function shapeToPath2D(s: StampShapeItem): Path2D {
  return getShapeStrategy(s.kind).toPath(s);
}

export interface FillParticipants {
  outer: StampShapeItem;
  holes: StampShapeItem[];
  mode: StampFillMode;
}

export function paintFill(
  ctx: CanvasRenderingContext2D,
  { outer, holes, mode }: FillParticipants,
  color: string,
): void {
  const all = [outer, ...holes];
  const minX = Math.min(...all.map((p) => p.x));
  const minY = Math.min(...all.map((p) => p.y));
  const maxX = Math.max(...all.map((p) => p.x + p.width));
  const maxY = Math.max(...all.map((p) => p.y + p.height));

  ctx.save();
  if (mode === 'intersect' && holes.length > 0) {
    ctx.clip(shapeToPath2D(outer));
    for (const h of holes) ctx.clip(shapeToPath2D(h));
  } else {
    const combined = new Path2D();
    combined.addPath(shapeToPath2D(outer));
    for (const h of holes) combined.addPath(shapeToPath2D(h));
    ctx.clip(combined, 'evenodd');
  }
  ctx.fillStyle = color;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  ctx.restore();
}