import React, { useEffect, useMemo, useState } from 'react';
import { Group, Rect, Circle, Ellipse, Line, Text as KonvaText, Shape as KonvaShape, Image as KImage } from 'react-konva';
import type { StampElement, StampShapeItem, StampTextItem, StampImageItem } from '@/shared/types';
import type { CommonProps } from './types';
import { drawArcText, canvasFont, konvaStyle, STAMP_DASH_MAP } from '@/lib/stamps/render';
import { CompositeFillLayer } from '../stamps/canvas/CompositeFillLayer';

interface Props extends CommonProps<StampElement> {
  el: StampElement;
  onUpdate: (p: Partial<StampElement>) => void;
}

export const StampEl: React.FC<Props> = ({
  el, onSelect, onUpdate: _onUpdate, onDblClick, onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => {
  // Мемоизируем массивы, чтобы useMemo ниже не срабатывал на каждый рендер.
  const shapes = useMemo(() => el.shapes ?? [], [el.shapes]);
  const texts = useMemo(() => el.texts ?? [], [el.texts]);
  const images = useMemo(() => el.images ?? [], [el.images]);

  const regularShapes = useMemo(() => shapes.filter((s) => s.kind !== 'fill'), [shapes]);
  const legacyFills = useMemo(() => shapes.filter((s) => s.kind === 'fill' && !s.fillTargetShapeId), [shapes]);

  // === LEGACY STAMP ===
  if (shapes.length === 0 && el.shape) {
    const {
      shape, stampColor, strokeWidth, strokeDash, showInner, innerStrokeWidth, innerStrokeDash, topText, centerText, bottomText,
      topFontSize, topFontFamily, topFontStyle, topTextDecoration, topColor,
      centerFontSize, centerFontFamily, centerFontStyle, centerTextDecoration, centerColor,
      bottomFontSize, bottomFontFamily, bottomFontStyle, bottomTextDecoration, bottomColor,
    } = el;
    const w = el.width, h = el.height;
    const pad = 8;

    return (
      <Group
        id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation} draggable
        onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
        onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
        onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
        onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={(e) => { onDragEnd?.(e); }}
        onContextMenu={onContextMenu}
      >
        <Rect width={w} height={h} fill="rgba(0,0,0,0.001)" listening />

        {shape === 'circle' && <Circle x={w/2} y={h/2} radius={Math.min(w,h)/2} stroke={stampColor} strokeWidth={strokeWidth} dash={STAMP_DASH_MAP[strokeDash || 'solid']} fill="transparent" />}
        {shape === 'oval' && <Ellipse x={w/2} y={h/2} radiusX={w/2} radiusY={h/2} stroke={stampColor} strokeWidth={strokeWidth} dash={STAMP_DASH_MAP[strokeDash || 'solid']} fill="transparent" />}
        {(shape === 'rect') && <Rect width={w} height={h} stroke={stampColor} strokeWidth={strokeWidth} dash={STAMP_DASH_MAP[strokeDash || 'solid']} fill="transparent" cornerRadius={12} />}
        {(shape === 'triangle') && <Line points={[w/2, 0, w, h, 0, h]} closed stroke={stampColor} strokeWidth={strokeWidth} dash={STAMP_DASH_MAP[strokeDash || 'solid']} fill="transparent" />}

        {showInner && shape === 'circle' && <Circle x={w/2} y={h/2} radius={Math.min(w,h)/2 - pad} stroke={stampColor} strokeWidth={innerStrokeWidth || 1} dash={STAMP_DASH_MAP[innerStrokeDash || 'solid']} fill="transparent" />}
        {showInner && shape === 'oval' && <Ellipse x={w/2} y={h/2} radiusX={w/2 - pad} radiusY={h/2 - pad} stroke={stampColor} strokeWidth={innerStrokeWidth || 1} dash={STAMP_DASH_MAP[innerStrokeDash || 'solid']} fill="transparent" />}
        {showInner && shape === 'rect' && <Rect x={pad} y={pad} width={w - pad*2} height={h - pad*2} stroke={stampColor} strokeWidth={innerStrokeWidth || 1} dash={STAMP_DASH_MAP[innerStrokeDash || 'solid']} fill="transparent" cornerRadius={6} />}
        {showInner && shape === 'triangle' && <Line points={[w/2, pad, w - pad, h - pad, pad, h - pad]} closed stroke={stampColor} strokeWidth={innerStrokeWidth || 1} dash={STAMP_DASH_MAP[innerStrokeDash || 'solid']} fill="transparent" />}

        {(shape === 'circle' || shape === 'oval') && topText && (
          <KonvaShape sceneFunc={(ctx) => {
            drawArcText((ctx as any)._context, { text: topText, cx: w/2, cy: h/2, radius: Math.min(w,h)/2 - 15, startDeg: -150, endDeg: -30, flip: false, font: canvasFont(topFontFamily||'Arial', topFontStyle||'bold', topFontSize||14), fill: topColor||stampColor||'#000' });
          }} listening={false} />
        )}
        {(shape === 'circle' || shape === 'oval') && bottomText && (
          <KonvaShape sceneFunc={(ctx) => {
            drawArcText((ctx as any)._context, { text: bottomText, cx: w/2, cy: h/2, radius: Math.min(w,h)/2 - 15, startDeg: 150, endDeg: 30, flip: true, font: canvasFont(bottomFontFamily||'Arial', bottomFontStyle||'normal', bottomFontSize||12), fill: bottomColor||stampColor||'#000' });
          }} listening={false} />
        )}

        {shape === 'rect' && topText && <KonvaText x={0} y={10} width={w} text={topText} fontSize={topFontSize||14} fontFamily={topFontFamily||'Arial'} fontStyle={topFontStyle||'bold'} textDecoration={topTextDecoration||''} fill={topColor||stampColor||'#000'} align="center" />}
        {shape === 'rect' && bottomText && <KonvaText x={0} y={h - (bottomFontSize||12) - 10} width={w} text={bottomText} fontSize={bottomFontSize||12} fontFamily={bottomFontFamily||'Arial'} fontStyle={bottomFontStyle||'normal'} textDecoration={bottomTextDecoration||''} fill={bottomColor||stampColor||'#000'} align="center" />}
        {centerText && <KonvaText x={0} y={h/2 - (centerFontSize||20)/2} width={w} text={centerText} fontSize={centerFontSize||20} fontFamily={centerFontFamily||'Arial'} fontStyle={centerFontStyle||'bold'} textDecoration={centerTextDecoration||''} fill={centerColor||stampColor||'#000'} align="center" />}

        {isSelected && <Rect width={w} height={h} stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} listening={false} />}
      </Group>
    );
  }

  // === NEW STAMP ===
  return (
    <Group
      id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation} draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
    >
      <Rect width={Math.max(1, el.width)} height={Math.max(1, el.height)} fill="rgba(0,0,0,0.001)" listening />
      <CompositeFillLayer width={el.width} height={el.height} shapes={shapes} />
      {legacyFills.map((s) => s.hidden ? null : <LegacyFillShape key={s.id} shape={s} allShapes={shapes} />)}
      {regularShapes.map((s) => s.hidden ? null : <ShapeNode key={s.id} shape={s} allShapes={shapes} />)}
      {images.map((im) => im.hidden ? null : <ImageNode key={im.id} im={im} />)}
      {texts.map((t) => t.hidden ? null : <TextNode key={t.id} t={t} />)}
      {isSelected && <Rect width={el.width} height={el.height} stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} listening={false} />}
    </Group>
  );
};

const ShapeNode: React.FC<{ shape: StampShapeItem; allShapes: StampShapeItem[] }> = ({ shape }) => {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const common = { stroke: shape.stroke, strokeWidth: shape.strokeWidth, dash: STAMP_DASH_MAP[shape.dash], fill: shape.fill || 'transparent', listening: false };
  if (shape.kind === 'rect') return <Rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} cornerRadius={shape.cornerRadius || 0} {...common} />;
  if (shape.kind === 'circle') return <Ellipse x={cx} y={cy} radiusX={Math.min(shape.width, shape.height)/2} radiusY={Math.min(shape.width, shape.height)/2} {...common} />;
  if (shape.kind === 'ellipse') return <Ellipse x={cx} y={cy} radiusX={shape.width/2} radiusY={shape.height/2} {...common} />;
  if (shape.kind === 'triangle') return <Line points={[cx, shape.y, shape.x + shape.width, shape.y + shape.height, shape.x, shape.y + shape.height]} closed lineJoin="round" {...common} />;
  if (shape.kind === 'line') {
    const pts = shape.points && shape.points.length >= 4 ? shape.points.slice() : [0, shape.height / 2, shape.width, shape.height / 2];
    return <Line x={shape.x} y={shape.y} points={pts} lineCap="round" lineJoin="round" {...common} />;
  }
  return null;
};

const LegacyFillShape: React.FC<{ shape: StampShapeItem; allShapes: StampShapeItem[] }> = ({ shape, allShapes }) => {
  const outer = shape.fillOuterId ? allShapes.find((x) => x.id === shape.fillOuterId) : null;
  if (!outer) return null;
  const holes = (shape.fillHoleIds || []).map((id) => allShapes.find((x) => x.id === id)).filter((x): x is StampShapeItem => !!x && !x.hidden);
  const mode = shape.fillMode || 'subtract';
  return (
    <KonvaShape listening={false} sceneFunc={(c) => {
      const raw = (c as any)._context as CanvasRenderingContext2D;
      const all = [outer, ...holes];
      const minX = Math.min(...all.map((p) => p.x));
      const minY = Math.min(...all.map((p) => p.y));
      const maxX = Math.max(...all.map((p) => p.x + p.width));
      const maxY = Math.max(...all.map((p) => p.y + p.height));
      raw.save();
      if (mode === 'intersect' && holes.length > 0) {
        const op = (s: StampShapeItem) => {
          const path = new Path2D();
          const { x, y, width: w, height: h } = s;
          if (s.kind === 'rect') path.rect(x, y, w, h);
          else if (s.kind === 'circle' || s.kind === 'ellipse') path.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          else if (s.kind === 'triangle') { path.moveTo(x + w / 2, y); path.lineTo(x + w, y + h); path.lineTo(x, y + h); path.closePath(); }
          return path;
        };
        raw.clip(op(outer));
        for (const h of holes) raw.clip(op(h));
      } else {
        const combined = new Path2D();
        const addPath = (s: StampShapeItem) => {
          const { x, y, width: w, height: h } = s;
          if (s.kind === 'rect') combined.rect(x, y, w, h);
          else if (s.kind === 'circle' || s.kind === 'ellipse') combined.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          else if (s.kind === 'triangle') { combined.moveTo(x + w / 2, y); combined.lineTo(x + w, y + h); combined.lineTo(x, y + h); combined.closePath(); }
        };
        addPath(outer);
        for (const h of holes) addPath(h);
        raw.clip(combined, 'evenodd');
      }
      raw.fillStyle = shape.fill || '#bfdbfe';
      raw.fillRect(minX, minY, maxX - minX, maxY - minY);
      raw.restore();
    }} />
  );
};

const ImageNode: React.FC<{ im: StampImageItem }> = ({ im }) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!im.src) { setImg(null); return; }
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => setImg(i);
    i.onerror = () => setImg(null);
    i.src = im.src;
  }, [im.src]);
  if (!img) return null;
  return <KImage x={im.x} y={im.y} width={im.width} height={im.height} image={img} listening={false} />;
};

const TextNode: React.FC<{ t: StampTextItem }> = ({ t }) => {
  if (t.mode === 'straight') {
    return <KonvaText x={t.x} y={t.y} width={t.width} text={t.text} fontSize={t.fontSize} fontFamily={t.fontFamily} fontStyle={konvaStyle(t.fontStyle || 'normal')} textDecoration={t.textDecoration} fill={t.fill} align={t.align} listening={false} />;
  }
  const rx = t.arcRx ?? t.arcRadius;
  const ry = t.arcRy ?? t.arcRadius;
  return (
    <KonvaShape listening={false} sceneFunc={(ctx) => {
      const c = (ctx as any)._context as CanvasRenderingContext2D;
      drawArcText(c, { text: t.text, cx: t.arcCx, cy: t.arcCy, radius: t.arcRadius, radiusX: rx, radiusY: ry, startDeg: t.arcStartDeg, endDeg: t.arcEndDeg, flip: t.arcFlip, font: canvasFont(t.fontFamily, t.fontStyle, t.fontSize), fill: t.fill });
    }} />
  );
};