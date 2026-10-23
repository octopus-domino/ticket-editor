import React from 'react';
import { Group, Circle, Line } from 'react-konva';
import type { FillElement } from '@/shared/types';
import type { CommonProps } from './types';

interface Props extends CommonProps<FillElement> {
  el: FillElement;
  onUpdate: (p: Partial<FillElement>) => void;
}

export const FillEl: React.FC<Props> = ({
  el, onSelect, onUpdate,
  onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => {
  const points = el.points || [];
  if (points.length < 6) return null;

  const updatePoint = (idx: number, x: number, y: number) => {
    const np = [...points];
    np[idx * 2] = x;
    np[idx * 2 + 1] = y;
    onUpdate({ points: np });
  };

  return (
    <Group
      id={el.id} name="element is-fill-element" x={el.x} y={el.y} rotation={el.rotation} draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart} onDragMove={onDragMove}
      onDragEnd={(e) => { onUpdate({ x: e.target.x(), y: e.target.y() }); onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
    >
      <Line
        points={points}
        closed
        fill={el.fill}
        opacity={1}
        stroke={el.stroke || undefined}
        strokeWidth={el.strokeWidth || 0}
        listening
      />
      {isSelected && points.map((_, i) => {
        if (i % 2 !== 0) return null;
        return (
          <Circle
            key={i}
            x={points[i]} y={points[i + 1]}
            radius={5} fill="#fbbf24" stroke="#f59e0b" strokeWidth={1.5} draggable
            onMouseDown={(e) => { e.cancelBubble = true; }}
            onDragMove={(e) => { e.cancelBubble = true; updatePoint(i / 2, e.target.x(), e.target.y()); }}
            onDragEnd={(e) => { e.cancelBubble = true; }}
          />
        );
      })}
    </Group>
  );
};