import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Group, Rect, Text, Image as KImage, Label, Tag } from 'react-konva';
import type Konva from 'konva';
import type {
  ShapeElement, AppearanceFill, AppearanceStroke,
} from '@/shared/types';
import type { CommonProps } from './types';
import { fillToKonva } from '@/lib/graphics/fills';
import { useDocumentStore } from '@/ui/providers/EditorProvider';
import { ShapePrimitive } from '../shapes/ShapePrimitive';
import { ShapeHandles } from '../shapes/ShapeHandles';

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
  el, onSelect, onDragStart, onDragMove, onDragEnd, onContextMenu, onDblClick, symbolName, isSelected, onUpdate,
}) => {
  const docStore = useDocumentStore();
  const w = el.width;
  const h = el.height;

  const [localPolygonPoints, setLocalPolygonPoints] = useState<number[] | null>(null);
  const [localStarRatio, setLocalStarRatio] = useState<number | null>(null);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);

  const activeEl = useMemo(() => {
    if (localPolygonPoints) return { ...el, polygonPoints: localPolygonPoints };
    if (localStarRatio !== null) return { ...el, innerRadiusRatio: localStarRatio };
    return el;
  }, [el, localPolygonPoints, localStarRatio]);

  const fills = useMemo(() => effectiveFills(activeEl), [activeEl]);
  const strokes = useMemo(() => effectiveStrokes(activeEl), [activeEl]);
  const fillPropsList = useMemo(() => fills.map((f) => fillToKonva(f, { width: activeEl.width, height: activeEl.height }) as Record<string, any>), [fills, activeEl.width, activeEl.height]);
  const strokePropsList = useMemo(() => strokes.map((s) => ({
    stroke: s.color, strokeWidth: s.width, dash: dashToArray(s.dash), align: s.align ?? 'center',
  })), [strokes]);

  const polygonD = useMemo(() => {
    if (activeEl.shape !== 'polygon' && activeEl.shape !== 'triangle') return null;
    if (activeEl.shape === 'triangle' && (!activeEl.polygonPoints || activeEl.polygonPoints.length === 0)) {
      return `M ${w/2} 0 L ${w} ${h} L 0 ${h} Z`;
    }
    const subpaths = activeEl.polygonSubpaths || (activeEl.polygonPoints ? [activeEl.polygonPoints] : []);
    if (subpaths.length === 0) return null;
    return subpaths.map((ring) => {
      if (ring.length < 6) return '';
      const pts: string[] = [];
      for (let i = 0; i < ring.length; i += 2) pts.push(`${ring[i]},${ring[i + 1]}`);
      return `M ${pts.join(' L ')} Z`;
    }).join(' ');
  }, [activeEl.shape, activeEl.polygonPoints, activeEl.polygonSubpaths, w, h]);

  const [rasterImg, setRasterImg] = useState<HTMLImageElement | null>(null);
  const rasterSrc = activeEl.rasterFill?.src;
  useEffect(() => {
    if (!rasterSrc) { setRasterImg(null); return; }
    const i = new window.Image();
    i.src = rasterSrc;
    i.onload = () => setRasterImg(i);
    i.onerror = () => setRasterImg(null);
  }, [rasterSrc]);

  const clipFunc = useCallback((ctx: Konva.Context) => {
    if (!activeEl.clipPathId) return;
    const state = docStore.getState();
    const slide = state.slides.find((s) => s.id === state.activeId);
    if (!slide) return;
    const clipper = slide.elements.find((e) => e.id === activeEl.clipPathId);
    if (!clipper || clipper.type !== 'shape') return;
    const c = (ctx as any)._context as CanvasRenderingContext2D;
    drawClipOutline(c, clipper);
  }, [activeEl.clipPathId, docStore]);

  const commitDrag = () => {
    if (localPolygonPoints) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let j = 0; j < localPolygonPoints.length; j += 2) {
        if (localPolygonPoints[j] < minX) minX = localPolygonPoints[j];
        if (localPolygonPoints[j + 1] < minY) minY = localPolygonPoints[j + 1];
        if (localPolygonPoints[j] > maxX) maxX = localPolygonPoints[j];
        if (localPolygonPoints[j + 1] > maxY) maxY = localPolygonPoints[j + 1];
      }
      const newW = Math.max(20, maxX - minX);
      const newH = Math.max(20, maxY - minY);
      const shiftedPts = localPolygonPoints.map((v, idx) => idx % 2 === 0 ? v - minX : v - minY);

      setLocalPolygonPoints(null);
      onUpdate({
        x: el.x + minX,
        y: el.y + minY,
        width: newW,
        height: newH,
        polygonPoints: shiftedPts,
      });
    } else if (localStarRatio !== null) {
      setLocalStarRatio(null);
      onUpdate({ innerRadiusRatio: localStarRatio });
    }
  };

  const textStr = String(activeEl.text || '');
  const hasText = textStr.length > 0;
  const fontSize = activeEl.fontSize || 18;
  const tPad = activeEl.textPadding || { top: 8, right: 8, bottom: 8, left: 8 };
  const innerW = Math.max(1, w - tPad.left - tPad.right);
  const innerH = Math.max(1, h - tPad.top - tPad.bottom);
  let tx = tPad.left, ty = tPad.top, tw = innerW, th = innerH;

  if (activeEl.shape === 'circle') {
    const d = Math.min(w, h);
    tw = d * 0.7; th = d * 0.7;
    tx = (w - tw) / 2; ty = (h - th) / 2;
  } else if (activeEl.shape === 'triangle') {
    tw = w * 0.55; th = h * 0.45;
    tx = (w - tw) / 2; ty = h * 0.5;
  } else if (activeEl.shape === 'star') {
    tw = w * 0.5; th = h * 0.5;
    tx = (w - tw) / 2; ty = (h - th) / 2;
  }

  // textLineHeight опционален в ShapeElement. Дефолт 1.3 совпадает
  // с newShape() из lib/factories.ts.
  const textLineHeight = activeEl.textLineHeight ?? 1.3;
  const lineBoxOffset = activeEl.textVerticalAlign === 'top'
    ? ((textLineHeight - 1) * fontSize) / 2
    : 0;

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      draggable={!isDraggingHandle}
      dragDistance={3}
      clipFunc={activeEl.clipPathId ? clipFunc : undefined}
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
    >
      <Rect width={Math.max(1, w)} height={Math.max(1, h)} fill="rgba(0,0,0,0.001)" listening={true} />

      {activeEl.rasterFill && rasterImg && (
        <KImage
          x={activeEl.rasterFill.relX * w} y={activeEl.rasterFill.relY * h}
          width={activeEl.rasterFill.relW * w} height={activeEl.rasterFill.relH * h}
          image={rasterImg} listening={false} perfectDrawEnabled={false}
        />
      )}

      {fills.map((fill, idx) => (
        <ShapePrimitive key={`fill-${fill.id}`} el={activeEl} width={w} height={h} fillProps={fillPropsList[idx]} polygonD={polygonD} />
      ))}

      {[...strokes].reverse().map((stroke, idx) => (
        <ShapePrimitive key={`stroke-${stroke.id}`} el={activeEl} width={w} height={h} fillProps={{ fill: 'transparent' }} strokeProps={strokePropsList[strokes.length - 1 - idx]} polygonD={polygonD} />
      ))}

      {hasText && (
        <Text
          x={tx} y={ty + lineBoxOffset} width={tw} height={th}
          text={textStr} fontSize={fontSize} fontFamily={activeEl.textFontFamily}
          fontStyle={activeEl.textFontStyle} textDecoration={activeEl.textDecoration}
          fill={activeEl.textFill || '#000000'} align={activeEl.textAlign} verticalAlign={activeEl.textVerticalAlign}
          lineHeight={textLineHeight} wrap="word" listening={false}
        />
      )}

      {symbolName && (
        <Label x={-4} y={-20} listening={false} opacity={0.9}>
          <Tag fill="#6366f1" cornerRadius={4} />
          <Text text={`🔗 ${symbolName}`} fill="#ffffff" fontSize={10} padding={4} fontStyle="bold" />
        </Label>
      )}

      {isSelected && (
        <ShapeHandles
          el={activeEl}
          points={activeEl.polygonPoints || (activeEl.shape === 'triangle' ? [w / 2, 0, w, h, 0, h] : [])}
          onUpdatePoints={(pts) => {
            if (activeEl.shape === 'star') {
              setLocalStarRatio(pts[0]);
            } else {
              setLocalPolygonPoints(pts);
            }
          }}
          onCommit={commitDrag}
          onDragStartHandle={() => setIsDraggingHandle(true)}
          onDragEndHandle={() => setIsDraggingHandle(false)}
        />
      )}
    </Group>
  );
};