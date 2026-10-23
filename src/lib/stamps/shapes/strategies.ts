import type { StampShapeItem } from '@/shared/types';
import type { ShapeStrategy, TransformInput, TransformOutput, Geometry } from './types';
import { findContainingShape, snapToHostCenter } from '../geometry';

/* ============================================================
   Path builders
   ============================================================ */

function buildRectPath(s: StampShapeItem): Path2D {
  const p = new Path2D();
  const { x, y, width: w, height: h } = s;
  const r = Math.max(0, s.cornerRadius || 0);
  const rr = Math.min(r, w / 2, h / 2);
  if (rr > 0) {
    p.moveTo(x + rr, y);
    p.lineTo(x + w - rr, y);
    p.arcTo(x + w, y, x + w, y + rr, rr);
    p.lineTo(x + w, y + h - rr);
    p.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    p.lineTo(x + rr, y + h);
    p.arcTo(x, y + h, x, y + h - rr, rr);
    p.lineTo(x, y + rr);
    p.arcTo(x, y, x + rr, y, rr);
    p.closePath();
  } else {
    p.rect(x, y, w, h);
  }
  return p;
}

function buildEllipsePath(s: StampShapeItem): Path2D {
  const p = new Path2D();
  const cx = s.x + s.width / 2;
  const cy = s.y + s.height / 2;
  p.ellipse(cx, cy, Math.max(1, s.width / 2), Math.max(1, s.height / 2), 0, 0, Math.PI * 2);
  return p;
}

function buildCirclePath(s: StampShapeItem): Path2D {
  const p = new Path2D();
  const cx = s.x + s.width / 2;
  const cy = s.y + s.height / 2;
  const r = Math.max(1, Math.min(s.width, s.height) / 2);
  p.ellipse(cx, cy, r, r, 0, 0, Math.PI * 2);
  return p;
}

function buildTrianglePath(s: StampShapeItem): Path2D {
  const p = new Path2D();
  const { x, y, width: w, height: h } = s;
  p.moveTo(x + w / 2, y);
  p.lineTo(x + w, y + h);
  p.lineTo(x, y + h);
  p.closePath();
  return p;
}

/* ============================================================
   Общая трансформация для closed-фигур
   ============================================================ */

interface TransformOpts {
  keepSquare?: boolean;
  noRotation?: boolean;
  noResize?: boolean;
}

function applyShapeTransform(input: TransformInput, opts: TransformOpts): TransformOutput {
  const { shape: s, nodeX, nodeY, nodeRotation, scaleX, scaleY, ctrl, shapes } = input;

  if (opts.noResize) {
    let nx = Math.round(nodeX - s.width / 2);
    let ny = Math.round(nodeY - s.height / 2);
    if (!ctrl) {
      const host = findContainingShape(nx + s.width / 2, ny + s.height / 2, s.id, shapes);
      const cs = snapToHostCenter(nx, ny, s.width, s.height, host);
      nx = Math.round(cs.x);
      ny = Math.round(cs.y);
    }
    return {
      patch: { x: nx, y: ny, rotation: opts.noRotation ? 0 : Math.round(nodeRotation) },
      resetScale: true,
    };
  }

  const rawW = Math.max(8, s.width * scaleX);
  const rawH = Math.max(8, s.height * scaleY);
  const fw = opts.keepSquare ? Math.max(rawW, rawH) : rawW;
  const fh = opts.keepSquare ? Math.max(rawW, rawH) : rawH;

  let nx = Math.round(nodeX - fw / 2);
  let ny = Math.round(nodeY - fh / 2);

  if (!ctrl) {
    const host = findContainingShape(nx + fw / 2, ny + fh / 2, s.id, shapes);
    const cs = snapToHostCenter(nx, ny, fw, fh, host);
    nx = Math.round(cs.x);
    ny = Math.round(cs.y);
  }

  return {
    patch: {
      x: nx, y: ny,
      rotation: Math.round(nodeRotation),
      width: Math.round(fw),
      height: Math.round(fh),
    },
    resetScale: true,
  };
}

/* ============================================================
   Стратегии
   ============================================================ */

export const rectStrategy: ShapeStrategy = {
  kind: 'rect',
  defaultSize: { w: 160, h: 100, corner: 12 },
  normalizeGeometry: (g: Geometry) => g,
  toPath: buildRectPath,
  applyTransform: (i) => applyShapeTransform(i, {}),
};

export const circleStrategy: ShapeStrategy = {
  kind: 'circle',
  defaultSize: { w: 140, h: 140, corner: 0 },
  normalizeGeometry: (g: Geometry) => {
    const side = Math.min(g.width, g.height);
    return { ...g, width: side, height: side };
  },
  toPath: buildCirclePath,
  applyTransform: (i) => applyShapeTransform(i, { keepSquare: true }),
};

export const ellipseStrategy: ShapeStrategy = {
  kind: 'ellipse',
  defaultSize: { w: 160, h: 160, corner: 0 },
  normalizeGeometry: (g: Geometry) => g,
  toPath: buildEllipsePath,
  applyTransform: (i) => applyShapeTransform(i, {}),
};

export const triangleStrategy: ShapeStrategy = {
  kind: 'triangle',
  defaultSize: { w: 140, h: 120, corner: 0 },
  normalizeGeometry: (g: Geometry) => g,
  toPath: buildTrianglePath,
  applyTransform: (i) => applyShapeTransform(i, {}),
};

export const lineStrategy: ShapeStrategy = {
  kind: 'line',
  defaultSize: { w: 160, h: 20, corner: 0 },
  normalizeGeometry: (g: Geometry) => g,
  toPath: () => new Path2D(),
  applyTransform: (i) => {
    const { shape: s, nodeX, nodeY, nodeRotation, scaleX, scaleY, ctrl, shapes } = i;

    const w = Math.max(1, s.width);
    const h = Math.max(1, s.height);

    const kx = scaleX;
    const ky = scaleY;

    const srcPoints = (s.points && s.points.length >= 4)
      ? s.points
      : [0, h / 2, w, h / 2];

    const scaledPoints = srcPoints.map((v, idx) =>
      idx % 2 === 0 ? v * kx : v * ky,
    );

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let k = 0; k < scaledPoints.length; k += 2) {
      const px = scaledPoints[k];
      const py = scaledPoints[k + 1];
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    const newW = Math.max(8, maxX - minX);
    const newH = Math.max(8, maxY - minY);

    let nx = Math.round(nodeX - newW / 2);
    let ny = Math.round(nodeY - newH / 2);

    if (!ctrl) {
      const host = findContainingShape(nx + newW / 2, ny + newH / 2, s.id, shapes);
      const cs = snapToHostCenter(nx, ny, newW, newH, host);
      nx = Math.round(cs.x);
      ny = Math.round(cs.y);
    }

    return {
      patch: {
        x: nx,
        y: ny,
        rotation: Math.round(nodeRotation),
        width: newW,
        height: newH,
        points: scaledPoints.map((v) => Math.round(v)),
      },
      resetScale: true,
    };
  },
};

export const fillStrategy: ShapeStrategy = {
  kind: 'fill',
  defaultSize: { w: 0, h: 0, corner: 0 },
  normalizeGeometry: (g: Geometry) => g,
  toPath: () => new Path2D(),
  applyTransform: () => ({ patch: {}, resetScale: false }),
};