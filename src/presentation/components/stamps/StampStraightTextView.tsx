import React from 'react';
import { Group, Rect, Text } from 'react-konva';
import type Konva from 'konva';
import type { StampTextItem } from '@/shared/types';
import { konvaStyle } from '@/lib/stamps/render';

interface Props {
  text: StampTextItem;
  draggable: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  onDblClick: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

const StampStraightTextViewInner: React.FC<Props> = ({
  text, draggable, isSelected, onSelect, onDblClick, onDragEnd,
}) => {
  const handlers = React.useMemo(() => ({
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; onSelect(); },
    onTap: (e: Konva.KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; onSelect(); },
    onDblClick: (e: Konva.KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; onDblClick(); },
    onDblTap: (e: Konva.KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; onDblClick(); },
  }), [onSelect, onDblClick]);

  const height = text.fontSize * 1.4;

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
      {/* Прозрачный hit-rect: кликабельна вся площадь блока */}
      <Rect
        width={text.width}
        height={height}
        fill="rgba(0,0,0,0.001)"
        listening
      />

      <Text
        x={0}
        y={0}
        width={text.width}
        height={height}
        text={text.text}
        fontSize={text.fontSize}
        fontFamily={text.fontFamily}
        fontStyle={konvaStyle(text.fontStyle)}
        textDecoration={text.textDecoration}
        fill={text.fill}
        align={text.align}
        listening={false}
        perfectDrawEnabled={false}
      />

      {isSelected && (
        <Rect
          x={-4}
          y={-4}
          width={text.width + 8}
          height={height + 8}
          stroke="#6366f1"
          strokeWidth={1.5}
          dash={[4, 4]}
          listening={false}
        />
      )}
    </Group>
  );
};

export const StampStraightTextView = React.memo(StampStraightTextViewInner);