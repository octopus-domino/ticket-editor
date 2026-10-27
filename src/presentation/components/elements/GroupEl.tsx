import React from 'react';
import { Group, Rect } from 'react-konva';
import type { GroupElement, CanvasElement } from '@/shared/types';
import type { CommonProps } from './types';

interface Props extends CommonProps<GroupElement> {
  el: GroupElement;
  elements?: CanvasElement[];
}

export const GroupEl: React.FC<Props> = ({
  el, onSelect, onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => (
  <Group
    id={el.id}
    name="element"
    x={el.x} y={el.y} rotation={el.rotation}
    draggable
    dragDistance={3}
    onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
    onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
    onDragStart={onDragStart}
    onDragMove={onDragMove}
    onDragEnd={(e) => { onDragEnd?.(e); }}
    onContextMenu={onContextMenu}
  >
    {/* Прозрачная рамка группы (для клика по пустому месту группы) */}
    <Rect
      width={Math.max(1, el.width)}
      height={Math.max(1, el.height)}
      fill="rgba(0,0,0,0.001)"
      listening={true}
    />
    {isSelected && (
      <Rect
        x={-4} y={-4}
        width={el.width + 8} height={el.height + 8}
        stroke="#6366f1" strokeWidth={1.5}
        dash={[4, 4]} listening={false}
      />
    )}
  </Group>
);