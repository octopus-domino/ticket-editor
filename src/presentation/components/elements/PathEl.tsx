import React from 'react';
import { Group, Path } from 'react-konva';
import type { PathElement } from '@/shared/types';
import type { CommonProps } from './types';

interface Props extends CommonProps<PathElement> {
  el: PathElement;
  onUpdate: (p: Partial<PathElement>) => void;
}

export const PathEl: React.FC<Props> = ({
  el, onSelect, onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => {
  const x = Number(el.x) || 0;
  const y = Number(el.y) || 0;

  return (
    <Group
      id={el.id}
      name="element"
      x={x}
      y={y}
      rotation={el.rotation || 0}
      draggable
      dragDistance={3}
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
    >
      <Path
        data={el.d}
        fill={el.fill === 'transparent' ? 'rgba(0,0,0,0.001)' : el.fill}
        stroke={el.stroke === 'transparent' ? undefined : el.stroke}
        strokeWidth={el.strokeWidth || 0}
        hitStrokeWidth={20}
        perfectDrawEnabled={false}
      />
      {isSelected && (
        <Path
          data={el.d}
          fill="transparent"
          stroke="#6366f1"
          strokeWidth={1.5}
          dash={[6, 4]}
          listening={false}
        />
      )}
    </Group>
  );
};