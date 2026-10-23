/* ============================================================
   stamps/shapes/registry.ts
   F-SSTRAT-06, F-SSTRAT-07.
   ============================================================ */

import React from 'react';
import type { StampShapeKind } from '@/shared/types';
import type { ShapeViewStrategy, ShapePanelContext } from './types';
import {
  RectView, CircleView, EllipseView, TriangleView, LineView, FillView,
} from './ShapeViews';
import {
  ClosedShapePanel, LinePanel, FillPanel,
} from './ShapePanels';

const RectPanel: React.FC<ShapePanelContext> = (props) =>
  React.createElement(ClosedShapePanel, { ...props, showCornerRadius: true });

export const shapeViews: Record<StampShapeKind, ShapeViewStrategy> = {
  rect:     { kind: 'rect',     View: RectView,     Panel: RectPanel },
  circle:   { kind: 'circle',   View: CircleView,   Panel: ClosedShapePanel },
  ellipse:  { kind: 'ellipse',  View: EllipseView,  Panel: ClosedShapePanel },
  triangle: { kind: 'triangle', View: TriangleView, Panel: ClosedShapePanel },
  line:     { kind: 'line',     View: LineView,     Panel: LinePanel },
  fill:     { kind: 'fill',     View: FillView,     Panel: FillPanel },
};

export function getShapeView(kind: StampShapeKind): ShapeViewStrategy {
  const s = shapeViews[kind];
  if (!s) throw new Error(`[stamps] no view strategy for kind="${kind}"`);
  return s;
}