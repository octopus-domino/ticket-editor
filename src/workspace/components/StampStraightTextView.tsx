import React from 'react';
import { Group, Text } from 'react-konva';
import type Konva from 'konva';
import type { StampTextItem } from '../../types';
import { konvaStyle } from '../../lib/stamps/render';

interface Props {
  text: StampTextItem;
  draggable: boolean;
  onSelect: () => void;
  onDblClick: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

export const StampStraightTextView: React.FC<Props> = ({
  text, draggable, onSelect, onDblClick, onDragEnd,
}) => {
  const handlers = {
    onClick: (e: any) => { e.cancelBubble = true; onSelect(); },
    onTap: (e: any) => { e.cancelBubble = true; onSelect(); },
    onDblClick: (e: any) => { e.cancelBubble = true; onDblClick(); },
    onDblTap: (e: any) => { e.cancelBubble = true; onDblClick(); },
  };

  return (
    <Group
      id={text.id}
      name="text"
      x={text.x}
      y={text.y}
      draggable={draggable}
      onDragEnd={onDragEnd}
      {...handlers}
    >
      {/* Фон-плашка для hit-области: тонкий полупрозрачный, чтобы не мешал,
          но ловил клики и drag по всему прямоугольнику текста.
          Используем реальный fill, а не 0.001 — Konva ловит drag по любому fill. */}
      <Text
        x={0} y={0}
        width={text.width}
        height={text.fontSize * 1.4}
        text={text.text}
        fontSize={text.fontSize}
        fontFamily={text.fontFamily}
        fontStyle={konvaStyle(text.fontStyle)}
        textDecoration={text.textDecoration}
        fill={text.fill}
        align={text.align}
        listening={true}
        hitStrokeWidth={0}
      />
    </Group>
  );
};