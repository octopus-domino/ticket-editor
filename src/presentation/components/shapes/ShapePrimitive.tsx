import React from 'react';
import {
  Rect, Circle, Line, Star, Path, Shape as KonvaShape
} from 'react-konva';
import type {
  ShapeElement, StrokeAlign
} from '@/shared/types';

interface PrimitiveProps {
  el: ShapeElement;
  width: number;
  height: number;
  fillProps?: Record<string, any>;
  strokeProps?: {
    stroke: string;
    strokeWidth: number;
    dash?: number[];
    align?: StrokeAlign;
  };
  polygonD: string | null;
}

export const ShapePrimitive = React.memo<PrimitiveProps>(
  ({ el, width: w, height: h, fillProps = {}, strokeProps = {} as any, polygonD }) => {
    // strokeScaleEnabled={false}: обводка не масштабируется при ресайзе
    // элемента. Без этого флага Konva скейлит strokeWidth вместе с группой —
    // во время drag обводка толстеет, на mouseup возвращается.
    const common = { ...fillProps, ...strokeProps, perfectDrawEnabled: false, strokeScaleEnabled: false };
    const align: StrokeAlign = (strokeProps as any)?.align ?? 'center';
    const sw = (strokeProps as any)?.strokeWidth ?? 0;
    const swAlign = align !== 'center' && sw > 0 ? sw : 0;

    switch (el.shape) {
      case 'rect':
      case 'roundRect': {
        const half = swAlign / 2;
        let x = 0, y = 0, rw = w, rh = h;
        if (align === 'inside' && half > 0) { x = half; y = half; rw = Math.max(1, w - sw); rh = Math.max(1, h - sw); }
        else if (align === 'outside' && half > 0) { x = -half; y = -half; rw = w + sw; rh = h + sw; }
        const rx = el.shape === 'roundRect' ? (el.radius ?? 16) : 0;
        return <Rect x={x} y={y} width={rw} height={rh} cornerRadius={rx} {...common} />;
      }
      case 'circle': {
        const r = Math.min(w, h) / 2;
        let radius = r;
        if (align === 'inside' && sw > 0) radius = Math.max(1, r - sw / 2);
        else if (align === 'outside' && sw > 0) radius = r + sw / 2;
        return <Circle x={w / 2} y={h / 2} radius={radius} {...common} />;
      }
      case 'triangle': {
        if (el.polygonPoints && el.polygonPoints.length === 6) {
          return <Line points={el.polygonPoints} closed lineJoin="round" {...common} />;
        }
        if (el.polygonPoints && el.polygonPoints.length > 6) {
          if (!polygonD) return null;
          return <Path data={polygonD} fillRule="evenodd" {...common} />;
        }
        const cx = w / 2;
        const cy = h * 2 / 3;
        const k = align === 'inside' && sw > 0 ? Math.max(0, 1 - sw / Math.min(w, h))
          : align === 'outside' && sw > 0 ? 1 + sw / Math.min(w, h)
          : 1;
        const pts = [cx, 0, w, h, 0, h].map((v, i) => i % 2 === 0 ? cx + (v - cx) * k : cy + (v - cy) * k);
        return <Line points={pts} closed lineJoin="round" {...common} />;
      }
      case 'star': {
        const outerR = Math.min(w, h) / 2;
        const innerRatio = el.innerRadiusRatio ?? (1 / 2.4);
        const innerR = outerR * innerRatio;
        let oR = outerR;
        if (align === 'inside' && sw > 0) oR = Math.max(1, outerR - sw / 2);
        else if (align === 'outside' && sw > 0) oR = outerR + sw / 2;
        const iR = (innerR / outerR) * oR;
        return <Star x={w / 2} y={h / 2} numPoints={5} innerRadius={iR} outerRadius={oR} {...common} />;
      }
      case 'arrow': {
        const pts = [0, h / 2, w - 20, h / 2, w - 20, h / 2 - 15, w, h / 2, w - 20, h / 2 + 15, w - 20, h / 2];
        return <Line points={pts} lineJoin="round" {...common} />;
      }
      case 'polygon': {
        if (!polygonD) return null;
        return <Path data={polygonD} fillRule="evenodd" {...common} />;
      }
      case 'arc': {
        const cx = w / 2;
        const cy = h / 2;
        const baseOuter = Math.min(w, h) / 2;
        let outer = baseOuter * (el.arcOuterRadius ?? 1);
        const innerRatio = el.arcInnerRadius ?? 0.5;
        if (align === 'inside' && sw > 0) outer = Math.max(1, outer - sw / 2);
        else if (align === 'outside' && sw > 0) outer = outer + sw / 2;
        const inner = outer * innerRatio;
        const a0 = ((el.arcStartAngle ?? 0) * Math.PI) / 180;
        const a1 = ((el.arcEndAngle ?? 90) * Math.PI) / 180;
        return (
          <KonvaShape
            sceneFunc={(ctx, shape) => {
              const c = (ctx as any)._context as CanvasRenderingContext2D;
              c.beginPath();
              c.arc(cx, cy, outer, a0, a1, false);
              if (inner > 0.5) c.arc(cx, cy, inner, a1, a0, true);
              else c.lineTo(cx, cy);
              c.closePath();
              ctx.fillStrokeShape(shape);
            }}
            getSelfRect={() => ({ x: 0, y: 0, width: Math.max(1, w), height: Math.max(1, h) })}
            strokeScaleEnabled={false}
            {...common}
          />
        );
      }
      default:
        return null;
    }
  },
  (prev, next) => (
    prev.el === next.el &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.fillProps === next.fillProps &&
    prev.strokeProps === next.strokeProps &&
    prev.polygonD === next.polygonD
  ),
);