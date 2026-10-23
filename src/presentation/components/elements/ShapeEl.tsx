import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Group, Rect, Circle, Line, Text, Star, Image as KImage, Path, Label, Tag,
  Shape as KonvaShape,
} from 'react-konva';
import type Konva from 'konva';
import type {
  ShapeElement, AppearanceFill, AppearanceStroke, StrokeAlign,
} from '@/shared/types';
import type { CommonProps } from './types';
import { fillToKonva } from '@/lib/graphics/fills';
import { useDocumentStore } from '@/ui/providers/EditorProvider';

interface Props extends CommonProps<ShapeElement> {
  el: ShapeElement;
  onUpdate: (p: Partial<ShapeElement>) => void;
  isEditing?: boolean;
}

function effectiveFills(el: ShapeElement): AppearanceFill[] {
  if (el.appearance?.fills && el.appearance.fills.length > 0) return el.appearance.fills;
  if (el.fill === 'transparent') return [];
  return [{ id: '__legacy_fill', type: 'solid', color: el.fill, opacity: 1 }];
}

function effectiveStrokes(el: ShapeElement): AppearanceStroke[] {
  if (el.appearance?.strokes && el.appearance.strokes.length > 0) return el.appearance.strokes;
  if (el.stroke && el.stroke !== 'transparent' && el.strokeWidth > 0) {
    return [{ id: '__legacy_stroke', color: el.stroke, width: el.strokeWidth, align: 'center' }];
  }
  return [];
}

function dashToArray(dash?: string): number[] | undefined {
  if (!dash || dash === 'solid') return undefined;
  switch (dash) {
    case 'dashed': return [10, 6];
    case 'dotted': return [2, 5];
    case 'dashdot': return [10, 5, 2, 5];
    case 'longdash': return [20, 8];
    default: return undefined;
  }
}

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

const Primitive = React.memo<PrimitiveProps>(
  ({ el, width: w, height: h, fillProps = {}, strokeProps = {} as any, polygonD }) => {
    const common = { ...fillProps, ...strokeProps };
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
        const innerR = outerR / 2.4;
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

function drawClipOutline(ctx: CanvasRenderingContext2D, shape: ShapeElement): void {
  const { x, y, width: w, height: h } = shape;
  ctx.beginPath();
  switch (shape.shape) {
    case 'rect':
    case 'roundRect':
      ctx.rect(x, y, w, h);
      break;
    case 'circle':
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      break;
    case 'polygon': {
      const pts = shape.polygonPoints ?? [];
      if (pts.length >= 6) {
        ctx.moveTo(x + pts[0], y + pts[1]);
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(x + pts[i], y + pts[i + 1]);
        ctx.closePath();
      }
      break;
    }
    case 'arc': {
      const cx = x + w / 2, cy = y + h / 2;
      const outerR = Math.min(w, h) / 2 * (shape.arcOuterRadius ?? 1);
      const innerR = outerR * (shape.arcInnerRadius ?? 0.5);
      const a0 = ((shape.arcStartAngle ?? 0) * Math.PI) / 180;
      const a1 = ((shape.arcEndAngle ?? 90) * Math.PI) / 180;
      ctx.arc(cx, cy, outerR, a0, a1, false);
      if (innerR > 0.5) ctx.arc(cx, cy, innerR, a1, a0, true);
      else ctx.lineTo(cx, cy);
      ctx.closePath();
      break;
    }
    default:
      break;
  }
}

export const ShapeEl: React.FC<Props> = ({
  el, onSelect, onDragStart, onDragMove, onDragEnd, onContextMenu, onDblClick, symbolName,
}) => {
  const docStore = useDocumentStore();
  const w = el.width;
  const h = el.height;

  const fills = useMemo(() => effectiveFills(el), [el]);
  const strokes = useMemo(() => effectiveStrokes(el), [el]);
  const fillPropsList = useMemo(() => fills.map((f) => fillToKonva(f, { width: el.width, height: el.height }) as Record<string, any>), [fills, el.width, el.height]);
  const strokePropsList = useMemo(() => strokes.map((s) => ({
    stroke: s.color, strokeWidth: s.width, dash: dashToArray(s.dash), align: s.align ?? 'center',
  })), [strokes]);

  const polygonD = useMemo(() => {
    if (el.shape !== 'polygon') return null;
    const subpaths = el.polygonSubpaths || (el.polygonPoints ? [el.polygonPoints] : []);
    if (subpaths.length === 0) return null;
    return subpaths.map((ring) => {
      if (ring.length < 6) return '';
      const pts: string[] = [];
      for (let i = 0; i < ring.length; i += 2) pts.push(`${ring[i]},${ring[i + 1]}`);
      return `M ${pts.join(' L ')} Z`;
    }).join(' ');
  }, [el.shape, el.polygonPoints, el.polygonSubpaths]);

  const [rasterImg, setRasterImg] = useState<HTMLImageElement | null>(null);
  const rasterSrc = el.rasterFill?.src;
  useEffect(() => {
    if (!rasterSrc) { setRasterImg(null); return; }
    const i = new window.Image();
    i.src = rasterSrc;
    i.onload = () => setRasterImg(i);
    i.onerror = () => setRasterImg(null);
  }, [rasterSrc]);

  const clipFunc = useCallback((ctx: Konva.Context) => {
    if (!el.clipPathId) return;
    const state = docStore.getState();
    const slide = state.slides.find((s) => s.id === state.activeId);
    if (!slide) return;
    const clipper = slide.elements.find((e) => e.id === el.clipPathId);
    if (!clipper || clipper.type !== 'shape') return;
    const c = (ctx as any)._context as CanvasRenderingContext2D;
    drawClipOutline(c, clipper);
  }, [el.clipPathId, docStore]);

  const textStr = String(el.text || '');
  const hasText = textStr.length > 0;
  const fontSize = el.fontSize || 18;
  const textPad = el.textPadding || { top: 8, right: 8, bottom: 8, left: 8 };
  const textAlign = el.textAlign || 'center';
  const textVerticalAlign = el.textVerticalAlign || 'middle';
  const textFontFamily = el.textFontFamily || 'Arial';
  const textLineHeight = el.textLineHeight || 1.3;
  const textFontStyle = el.textFontStyle || 'normal';
  const textDecoration = el.textDecoration || '';

  const innerW = Math.max(1, w - textPad.left - textPad.right);
  const innerH = Math.max(1, h - textPad.top - textPad.bottom);
  let tx = textPad.left, ty = textPad.top, tw = innerW, th = innerH;

  if (el.shape === 'circle') {
    const d = Math.min(w, h);
    tw = d * 0.7; th = d * 0.7;
    tx = (w - tw) / 2; ty = (h - th) / 2;
  } else if (el.shape === 'triangle') {
    tw = w * 0.55; th = h * 0.45;
    tx = (w - tw) / 2; ty = h * 0.5;
  } else if (el.shape === 'star') {
    tw = w * 0.5; th = h * 0.5;
    tx = (w - tw) / 2; ty = (h - th) / 2;
  }

  const lineBoxOffset = textVerticalAlign === 'top' ? ((textLineHeight - 1) * fontSize) / 2 : 0;

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x} y={el.y} rotation={el.rotation}
      draggable
      dragDistance={3}
      clipFunc={el.clipPathId ? clipFunc : undefined}
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
    >
      {/* Прозрачный прямоугольник для габаритов и кликов */}
      <Rect width={Math.max(1, w)} height={Math.max(1, h)} fill="rgba(0,0,0,0.001)" listening={true} />

      {el.rasterFill && rasterImg && (
        <KImage
          x={el.rasterFill.relX * w} y={el.rasterFill.relY * h}
          width={el.rasterFill.relW * w} height={el.rasterFill.relH * h}
          image={rasterImg} listening={false} perfectDrawEnabled={false}
        />
      )}

      {fills.map((fill, idx) => (
        <Primitive key={`fill-${fill.id}`} el={el} width={w} height={h} fillProps={fillPropsList[idx]} polygonD={polygonD} />
      ))}

      {[...strokes].reverse().map((stroke, idx) => (
        <Primitive key={`stroke-${stroke.id}`} el={el} width={w} height={h} fillProps={{ fill: 'transparent' }} strokeProps={strokePropsList[strokes.length - 1 - idx]} polygonD={polygonD} />
      ))}

      {hasText && (
        <Text
          x={tx} y={ty + lineBoxOffset} width={tw} height={th}
          text={textStr} fontSize={fontSize} fontFamily={textFontFamily}
          fontStyle={textFontStyle} textDecoration={textDecoration}
          fill={el.textFill || '#000000'} align={textAlign} verticalAlign={textVerticalAlign}
          lineHeight={textLineHeight} wrap="word" listening={false}
        />
      )}

      {symbolName && (
        <Label x={-4} y={-20} listening={false} opacity={0.9}>
          <Tag fill="#6366f1" cornerRadius={4} />
          <Text text={`🔗 ${symbolName}`} fill="#ffffff" fontSize={10} padding={4} fontStyle="bold" />
        </Label>
      )}
    </Group>
  );
};