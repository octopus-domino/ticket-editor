import React from 'react';
import { Group, Circle, Ellipse, Rect, Line, Text, Shape, Image as KImage } from 'react-konva';
import type { StampElement, DashType } from './types';

const DASH_MAP: Record<DashType, number[] | undefined> = {
  solid: undefined, dashed: [10, 6], dotted: [2, 5],
  dashdot: [10, 5, 2, 5], longdash: [20, 8],
};

type Zone = 'top' | 'center' | 'bottom';

interface Props {
  el: StampElement;
  onSelect: (e?: any) => void;
  onUpdate: (patch: Partial<StampElement>) => void;
  onDblClick: (zone: Zone) => void;
  onDragStart?: (e: any) => void;
  onDragMove?: (e: any) => void;
  onDragEnd?: (e: any) => void;
  onContextMenu?: (e: any) => void;
}

const konvaStyle = (s: string) => {
  const parts: string[] = [];
  if (s.includes('bold')) parts.push('bold');
  if (s.includes('italic')) parts.push('italic');
  return parts.join(' ') || 'normal';
};

const canvasFont = (family: string, style: string, size: number) => {
  const parts: string[] = [];
  if (style.includes('italic')) parts.push('italic');
  if (style.includes('bold')) parts.push('bold');
  parts.push(`${size}px`);
  parts.push(family);
  return parts.join(' ');
};

export const Stamp: React.FC<Props> = ({
  el, onSelect, onUpdate, onDblClick,
  onDragStart, onDragMove, onDragEnd, onContextMenu,
}) => {
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    if (!el.centerImage) { setImg(null); return; }
    const i = new window.Image();
    i.src = el.centerImage;
    i.onload = () => setImg(i);
  }, [el.centerImage]);

  const w = el.width, h = el.height, cx = w / 2, cy = h / 2;
  const color = el.stampColor;
  const dashOuter = DASH_MAP[el.strokeDash];
  const dashInner = DASH_MAP[el.innerStrokeDash];

  const topSize = el.topFontSize || 14;
  const centerSize = el.centerFontSize || 20;
  const bottomSize = el.bottomFontSize || 12;

  const topFont = canvasFont(el.topFontFamily || 'Arial', el.topFontStyle || '', topSize);
  const botFont = canvasFont(el.bottomFontFamily || 'Arial', el.bottomFontStyle || '', bottomSize);
  const topColor = el.topColor || color;
  const botColor = el.bottomColor || color;
  const topDeco = el.topTextDecoration || '';
  const botDeco = el.bottomTextDecoration || '';

  const centerFontStyle = konvaStyle(el.centerFontStyle || 'bold');
  const centerColor = el.centerColor || color;
  const centerDeco = el.centerTextDecoration || '';

  const arcText = (
    text: string, radius: number, start: number, end: number,
    flip: boolean, font: string, fill: string,
  ) => (
    <Shape sceneFunc={(ctx) => {
      if (!text) return;
      const chars = text.split('');
      const step = chars.length > 1 ? (end - start) / (chars.length - 1) : 0;
      ctx.setAttr('font', font);
      ctx.setAttr('fillStyle', fill);
      ctx.setAttr('textAlign', 'center');
      ctx.setAttr('textBaseline', 'middle');
      chars.forEach((ch, i) => {
        const a = start + i * step;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2));
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
    }} listening={false} />
  );

  const zoneHandler = (zone: Zone) => (e: any) => {
    e.cancelBubble = true;
    onDblClick(zone);
  };

  const minR = Math.min(w, h) / 2;

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onUpdate({ x: e.target.x(), y: e.target.y() }); onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => {
        const n = e.target;
        const sx = n.scaleX(), sy = n.scaleY();
        n.scaleX(1); n.scaleY(1);
        onUpdate({
          x: n.x(), y: n.y(), rotation: n.rotation(),
          width: Math.max(40, el.width * sx),
          height: Math.max(40, el.height * sy),
        });
      }}
    >
      {el.shape === 'circle' && (<>
        <Circle x={cx} y={cy} radius={minR - 4}
          stroke={color} strokeWidth={el.strokeWidth} dash={dashOuter} />
        {el.showInner && <Circle x={cx} y={cy} radius={minR - 20}
          stroke={color} strokeWidth={el.innerStrokeWidth} dash={dashInner} />}
      </>)}

      {el.shape === 'oval' && (<>
        <Ellipse x={cx} y={cy} radiusX={w / 2 - 4} radiusY={h / 2 - 4}
          stroke={color} strokeWidth={el.strokeWidth} dash={dashOuter} />
        {el.showInner && <Ellipse x={cx} y={cy} radiusX={w / 2 - 20} radiusY={h / 2 - 20}
          stroke={color} strokeWidth={el.innerStrokeWidth} dash={dashInner} />}
      </>)}

      {el.shape === 'rect' && (<>
        <Rect x={4} y={4} width={w - 8} height={h - 8} cornerRadius={6}
          stroke={color} strokeWidth={el.strokeWidth} dash={dashOuter} />
        {el.showInner && <Rect x={16} y={16} width={w - 32} height={h - 32} cornerRadius={4}
          stroke={color} strokeWidth={el.innerStrokeWidth} dash={dashInner} />}
      </>)}

      {el.shape === 'triangle' && (<>
        <Line points={[cx, 4, w - 4, h - 4, 4, h - 4, cx, 4]} closed
          stroke={color} strokeWidth={el.strokeWidth} lineJoin="round" dash={dashOuter} />
        {el.showInner && <Line points={[cx, 20, w - 20, h - 20, 20, h - 20, cx, 20]} closed
          stroke={color} strokeWidth={el.innerStrokeWidth} lineJoin="round" dash={dashInner} />}
      </>)}

      {(el.shape === 'circle' || el.shape === 'oval') && (<>
        {arcText(el.topText, minR - 32, -Math.PI * 0.85, -Math.PI * 0.15, false, topFont, topColor)}
        {arcText(el.bottomText, minR - 32, Math.PI * 0.85, Math.PI * 0.15, true, botFont, botColor)}
      </>)}

      {(el.shape === 'rect' || el.shape === 'triangle') && (<>
        <Text x={0} y={18} width={w} align="center" text={el.topText}
          fontSize={topSize} fontFamily={el.topFontFamily || 'Arial'}
          fontStyle={konvaStyle(el.topFontStyle || '')}
          textDecoration={topDeco} fill={topColor} listening={false} />
        <Text x={0} y={h - 32} width={w} align="center" text={el.bottomText}
          fontSize={bottomSize} fontFamily={el.bottomFontFamily || 'Arial'}
          fontStyle={konvaStyle(el.bottomFontStyle || '')}
          textDecoration={botDeco} fill={botColor} listening={false} />
      </>)}

      <Text x={0} y={cy - centerSize / 2 - 2} width={w} align="center"
        text={el.centerText} fontSize={centerSize}
        fontFamily={el.centerFontFamily || 'Arial'}
        fontStyle={centerFontStyle}
        textDecoration={centerDeco} fill={centerColor} listening={false} />

      {img && <KImage x={cx - 35} y={cy - 35} width={70} height={70} image={img} listening={false} />}

      <Rect x={0} y={0} width={w} height={h * 0.33}
        fill="transparent"
        onDblClick={zoneHandler('top')} onDblTap={zoneHandler('top')} />
      <Rect x={0} y={h * 0.33} width={w} height={h * 0.34}
        fill="transparent"
        onDblClick={zoneHandler('center')} onDblTap={zoneHandler('center')} />
      <Rect x={0} y={h * 0.67} width={w} height={h * 0.33}
        fill="transparent"
        onDblClick={zoneHandler('bottom')} onDblTap={zoneHandler('bottom')} />
    </Group>
  );
};