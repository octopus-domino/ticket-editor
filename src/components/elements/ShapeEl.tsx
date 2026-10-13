import React from 'react';
import { Group, Rect, Circle, Line, Text, Star } from 'react-konva';
import type { ShapeElement } from '../../types';
import type { CommonProps } from './types';

interface Props extends CommonProps {
  el: ShapeElement;
  onUpdate: (p: Partial<ShapeElement>) => void;
  onDblClick: () => void;
}

export const ShapeEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onDblClick,
  onDragStart, onDragMove, onDragEnd, onContextMenu,
}) => {
  const w = el.width, h = el.height;
  const common = {
    stroke: el.stroke,
    strokeWidth: el.strokeWidth,
    fill: el.fill === 'transparent' ? undefined : el.fill,
  };
  const hasText = !!el.text;
  const fontSize = el.fontSize || 16;

  let tx = 0, ty = 0, tw = w, th = h;
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

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x} y={el.y} rotation={el.rotation}
      draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDblClick={(e) => { e.cancelBubble = true; onDblClick(); }}
      onDblTap={(e) => { e.cancelBubble = true; onDblClick(); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onUpdate({ x: e.target.x(), y: e.target.y() }); onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => {
        const n = e.target;
        const sx = n.scaleX(); const sy = n.scaleY();
        n.scaleX(1); n.scaleY(1);
        onUpdate({
          x: n.x(), y: n.y(), rotation: n.rotation(),
          width: Math.max(10, el.width * sx),
          height: Math.max(10, el.height * sy),
        });
      }}
    >
      {el.shape === 'rect' && <Rect width={w} height={h} cornerRadius={el.radius || 0} {...common} />}
      {el.shape === 'roundRect' && <Rect width={w} height={h} cornerRadius={el.radius ?? 16} {...common} />}
      {el.shape === 'circle' && <Circle x={w / 2} y={h / 2} radius={Math.min(w, h) / 2} {...common} />}
      {el.shape === 'triangle' && <Line points={[w / 2, 0, w, h, 0, h, w / 2, 0]} closed {...common} lineJoin="round" />}
      {el.shape === 'star' && (
        <Star x={w / 2} y={h / 2} numPoints={5}
          innerRadius={Math.min(w, h) / 4}
          outerRadius={Math.min(w, h) / 2}
          {...common} />
      )}
      {el.shape === 'arrow' && (
        <Line
          points={[0, h / 2, w - 20, h / 2, w - 20, h / 2 - 15, w, h / 2, w - 20, h / 2 + 15, w - 20, h / 2]}
          {...common}
          lineJoin="round"
        />
      )}
      {hasText && (
        <Text
          x={tx} y={ty} width={tw} height={th}
          text={el.text}
          fontSize={fontSize}
          fill={el.textFill}
          align="center"
          verticalAlign="middle"
          wrap="word"
          listening={false}
        />
      )}
    </Group>
  );
};