import type { ShapeElement } from '@/shared/types';

/** Shared contour for aligned strokes; clipping, rather than scaling, preserves the original geometry. */
export function shapeContour(element: ShapeElement, width: number, height: number): Path2D {
  const path = new Path2D();
  if (element.shape === 'rect' || element.shape === 'roundRect') {
    path.roundRect(0, 0, width, height, element.shape === 'roundRect' ? (element.radius ?? 16) : 0);
  } else if (element.shape === 'circle')
    path.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
  else if (element.shape === 'arc') {
    const outer = (Math.min(width, height) / 2) * (element.arcOuterRadius ?? 1),
      inner = outer * (element.arcInnerRadius ?? 0.5);
    const start = ((element.arcStartAngle ?? 0) * Math.PI) / 180,
      end = ((element.arcEndAngle ?? 90) * Math.PI) / 180;
    path.arc(width / 2, height / 2, outer, start, end);
    if (inner > 0) path.arc(width / 2, height / 2, inner, end, start, true);
    else path.lineTo(width / 2, height / 2);
  } else {
    let rings = element.polygonSubpaths ?? (element.polygonPoints ? [element.polygonPoints] : []);
    if (!rings.length && element.shape === 'triangle')
      rings = [[width / 2, 0, width, height, 0, height]];
    if (!rings.length && element.shape === 'star') {
      const radius = Math.min(width, height) / 2;
      rings = [
        Array.from({ length: 20 }, (_, index) => {
          const vertex = Math.floor(index / 2),
            angle = -Math.PI / 2 + (vertex * Math.PI) / 5;
          const r = vertex % 2 ? radius * (element.innerRadiusRatio ?? 1 / 2.4) : radius;
          return index % 2 ? height / 2 + Math.sin(angle) * r : width / 2 + Math.cos(angle) * r;
        }),
      ];
    }
    if (!rings.length && element.shape === 'arrow')
      rings = [
        [
          0,
          height / 2,
          width - 20,
          height / 2,
          width - 20,
          height / 2 - 15,
          width,
          height / 2,
          width - 20,
          height / 2 + 15,
          width - 20,
          height / 2,
        ],
      ];
    for (const ring of rings) {
      for (let index = 0; index < ring.length; index += 2) {
        if (index === 0) path.moveTo(ring[index], ring[index + 1]);
        else path.lineTo(ring[index], ring[index + 1]);
      }
      path.closePath();
    }
  }
  path.closePath();
  return path;
}
