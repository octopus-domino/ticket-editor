import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { FooterElement } from '../../types';
import type { CommonProps } from './types';

interface Props extends CommonProps {
  el: FooterElement;
  onUpdate: (p: Partial<FooterElement>) => void;
  onDblClick: () => void;
}

export const FooterEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onDblClick,
  onDragStart, onDragMove, onDragEnd, onContextMenu,
}) => (
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
      const sx = n.scaleX();
      n.scaleX(1); n.scaleY(1);
      onUpdate({
        x: n.x(), y: n.y(), rotation: n.rotation(),
        width: Math.max(100, el.width * sx),
      });
    }}
  >
    <Rect width={el.width} height={el.height} fill={el.bgColor} />
    <Text
      x={0}
      y={el.height / 2 - el.fontSize / 2}
      width={el.width}
      align="center"
      text={el.text}
      fontSize={el.fontSize}
      fill={el.fill}
    />
  </Group>
);