import React, { useEffect, useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { TextElement } from '../../types';
import type { CommonProps } from './types';

interface Props extends CommonProps {
  el: TextElement;
  onUpdate: (p: Partial<TextElement>) => void;
  onDblClick: () => void;
}

export const TextEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onDblClick,
  onDragStart, onDragMove, onDragEnd, onContextMenu,
}) => {
  const pad = el.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerW = Math.max(10, el.width - pad.left - pad.right);
  const textRef = useRef<Konva.Text>(null);

  useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    const measured = Math.ceil(node.height() + pad.top + pad.bottom);
    if (Math.abs(measured - el.height) > 1) onUpdate({ height: measured });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.text, el.fontSize, el.width, el.fontFamily, el.fontStyle, el.lineHeight, el.align, el.padding]);

  const hasPlaceholder = /\{\{[^}]+\}\}/.test(el.text);

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
        const sx = n.scaleX();
        n.scaleX(1); n.scaleY(1);
        onUpdate({
          x: n.x(), y: n.y(), rotation: n.rotation(),
          width: Math.max(20, el.width * sx),
        });
      }}
    >
      {el.background && el.background !== 'transparent' && (
        <Rect width={el.width} height={el.height} fill={el.background} />
      )}
      <Rect
        width={el.width}
        height={el.height}
        fill="rgba(0,0,0,0.001)"
        stroke={hasPlaceholder ? '#3b82f6' : undefined}
        strokeWidth={hasPlaceholder ? 1 : 0}
        dash={hasPlaceholder ? [4, 3] : undefined}
      />
      <Text
        ref={textRef}
        x={pad.left}
        y={pad.top}
        width={innerW}
        text={el.text}
        fontSize={el.fontSize}
        fontFamily={el.fontFamily}
        fontStyle={el.fontStyle}
        textDecoration={el.textDecoration}
        align={el.align}
        lineHeight={el.lineHeight || 1.2}
        fill={el.fill}
        wrap="word"
        listening={false}
      />
    </Group>
  );
};