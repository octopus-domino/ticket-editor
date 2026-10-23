/* ============================================================
   stamps/shapes/ShapeViews.tsx
   F-STMP-E-06, F-LN-01..09, F-SSTRAT-05, REG-B3.
   ============================================================ */

import React from 'react';
import { Group, Ellipse, Rect, Line, Shape } from 'react-konva';
import type Konva from 'konva';
import type { StampShapeItem } from '@/shared/types';
import { STAMP_DASH_MAP } from '@/lib/stamps/render';
import { paintFill } from '@/lib/stamps/fillGeometry';
import type { ShapeViewContext } from './types';
import { PolylineRenderer } from '../../shapes/PolylineRenderer';
import {
  ensureMinimalPoints,
  parsePoints,
  serializePoints,
  insertPoint,
} from '@/lib/polyline';

function useGroupProps(ctx: ShapeViewContext) {
  const { shape: s } = ctx;
  const w = Math.max(1, s.width);
  const h = Math.max(1, s.height);

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    ctx.onSelect(s.id);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    ctx.onDragEnd(s.id, e);
  };

  return {
    group: {
      id: s.id,
      name: 'shape',
      x: s.x + w / 2,
      y: s.y + h / 2,
      offsetX: w / 2,
      offsetY: h / 2,
      rotation: s.rotation || 0,
      draggable: ctx.draggable,
      onDragEnd: handleDragEnd,
      onClick: handleClick,
      onTap: handleClick,
    },
    w,
    h,
  };
}

function useBaseStyle(s: StampShapeItem) {
  return {
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    dash: STAMP_DASH_MAP[s.dash],
    fill: s.fill || 'transparent',
    listening: true,
    perfectDrawEnabled: false as const,
  };
}

const RectViewInner: React.FC<ShapeViewContext> = (ctx) => {
  const { group, w, h } = useGroupProps(ctx);
  const base = useBaseStyle(ctx.shape);
  return (
    <Group {...group}>
      <Rect x={0} y={0} width={w} height={h} fill="rgba(0,0,0,0.001)" listening />
      <Rect x={0} y={0} width={w} height={h} cornerRadius={ctx.shape.cornerRadius} {...base} />
    </Group>
  );
};
export const RectView = React.memo(RectViewInner);

const CircleViewInner: React.FC<ShapeViewContext> = (ctx) => {
  const { group, w, h } = useGroupProps(ctx);
  const base = useBaseStyle(ctx.shape);
  const r = Math.max(1, Math.min(w, h) / 2);
  return (
    <Group {...group}>
      <Ellipse x={w / 2} y={h / 2} radiusX={r} radiusY={r} fill="rgba(0,0,0,0.001)" listening />
      <Ellipse x={w / 2} y={h / 2} radiusX={r} radiusY={r} {...base} />
    </Group>
  );
};
export const CircleView = React.memo(CircleViewInner);

const EllipseViewInner: React.FC<ShapeViewContext> = (ctx) => {
  const { group, w, h } = useGroupProps(ctx);
  const base = useBaseStyle(ctx.shape);
  const rx = Math.max(1, w / 2);
  const ry = Math.max(1, h / 2);
  return (
    <Group {...group}>
      <Ellipse x={w / 2} y={h / 2} radiusX={rx} radiusY={ry} fill="rgba(0,0,0,0.001)" listening />
      <Ellipse x={w / 2} y={h / 2} radiusX={rx} radiusY={ry} {...base} />
    </Group>
  );
};
export const EllipseView = React.memo(EllipseViewInner);

const TriangleViewInner: React.FC<ShapeViewContext> = (ctx) => {
  const { group, w, h } = useGroupProps(ctx);
  const base = useBaseStyle(ctx.shape);
  const points = [w / 2, 0, w, h, 0, h, w / 2, 0];
  return (
    <Group {...group}>
      <Line points={points} closed fill="rgba(0,0,0,0.001)" listening />
      <Line points={points} closed lineJoin="round" {...base} />
    </Group>
  );
};
export const TriangleView = React.memo(TriangleViewInner);

/* F-LN-02..09 */
const LineViewInner: React.FC<ShapeViewContext> = (ctx) => {
  const { group, w, h } = useGroupProps(ctx);
  const s = ctx.shape;
  const points = ensureMinimalPoints(s.points, w, h);

  const handleDblClick = (e: any) => {
    if (!ctx.onPointsChange) return;
    e.cancelBubble = true;

    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;

    let node: any = e.target;
    while (node && typeof node.name === 'function' && node.name() !== 'shape') {
      node = node.getParent?.();
    }
    if (!node) return;

    const inv = node.getAbsoluteTransform().copy().invert();
    const local = inv.point(pointer);
    const zoom = stage.scaleX() || 1;
    const snapRadius = 5 / zoom;

    const pts = parsePoints(points);
    const next = insertPoint(pts, local.x, local.y, snapRadius);
    if (next === pts) return;
    ctx.onPointsChange(s.id, serializePoints(next));
  };

  const handlePointMove = (index: number, x: number, y: number) => {
    if (!ctx.onPointsChange) return;
    const next = [...points];
    next[index * 2] = x;
    next[index * 2 + 1] = y;
    ctx.onPointsChange(s.id, next);
  };

  /**
   * F-LN-03 / F-LN-09: не удаляем сразу — показываем меню.
   * Fallback: если родитель не передал onPointContextMenu, удаляем
   * как раньше (обратная совместимость).
   */
  const handlePointContextMenu = (index: number, e: any) => {
    if (ctx.onPointContextMenu) {
      const clientX: number = e.evt?.clientX ?? 0;
      const clientY: number = e.evt?.clientY ?? 0;
      ctx.onPointContextMenu(s.id, index, clientX, clientY);
      return;
    }
    if (!ctx.onPointsChange) return;
    const pts = parsePoints(points);
    if (pts.length <= 2) return;
    const next = pts.slice();
    next.splice(index, 1);
    ctx.onPointsChange(s.id, serializePoints(next));
  };

  return (
    <Group {...group} onDblClick={handleDblClick} onDblTap={handleDblClick}>
      <PolylineRenderer
        points={points}
        stroke={s.stroke}
        strokeWidth={s.strokeWidth}
        dash={s.dash}
        isArrow={!!s.isArrow}
        isSelected={!!ctx.isSelected}
        onPointMove={handlePointMove}
        onPointContextMenu={handlePointContextMenu}
      />
    </Group>
  );
};
export const LineView = React.memo(LineViewInner);

/* F-LFILL-09: legacy path fill. */
const PathFillInner: React.FC<ShapeViewContext> = ({ shape: s, allShapes, onSelect }) => {
  const outer = s.fillOuterId
    ? allShapes.find((x) => x.id === s.fillOuterId) || null
    : null;
  if (!outer) return null;

  const holes = (s.fillHoleIds || [])
    .map((id) => allShapes.find((x) => x.id === id))
    .filter((x): x is StampShapeItem => !!x && !x.hidden && x.kind !== 'fill');

  const mode = s.fillMode || 'subtract';

  return (
    <Shape
      id={s.id}
      name="shape"
      listening
      draggable={false}
      perfectDrawEnabled={false}
      onClick={(e) => { e.cancelBubble = true; onSelect(s.id); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(s.id); }}
      sceneFunc={(c) => {
        const raw = (c as any)._context as CanvasRenderingContext2D;
        paintFill(raw, { outer, holes, mode }, s.fill || '#bfdbfe');
      }}
      hitFunc={(c) => {
        const raw = (c as any)._context as CanvasRenderingContext2D;
        paintFill(raw, { outer, holes, mode }, 'rgba(0,0,0,0.001)');
      }}
    />
  );
};
const PathFill = React.memo(PathFillInner);

const FillViewInner: React.FC<ShapeViewContext> = (ctx) => {
  if (ctx.shape.fillTargetShapeId) return null;
  return <PathFill {...ctx} />;
};
export const FillView = React.memo(FillViewInner);