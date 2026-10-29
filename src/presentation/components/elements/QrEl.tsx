import React from 'react';
import { Group, Rect, Text as KonvaText } from 'react-konva';
import type { QrElement } from '@/shared/types';
import type { CommonProps } from './types';

interface Props extends CommonProps<QrElement> {
  el: QrElement;
  onUpdate: (p: Partial<QrElement>) => void;
}

/**
 * На канве QR-элемент — только placeholder: пунктирная рамка + подпись.
 * Настоящая картинка генерируется при экспорте (SVG — фронт идёт на /api/qr;
 * PDF — бэкенд сам рендерит через QrElementRenderer).
 */
export const QrEl: React.FC<Props> = ({
  el, onSelect, onDragStart, onDragMove, onDragEnd,
  onContextMenu, onDblClick, isSelected,
}) => (
  <Group
    id={el.id}
    name="element"
    x={el.x} y={el.y} rotation={el.rotation}
    draggable
    onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
    onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
    onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
    onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
    onDragStart={onDragStart}
    onDragMove={onDragMove}
    onDragEnd={(e) => { onDragEnd?.(e); }}
    onContextMenu={onContextMenu}
  >
    <Rect
      width={el.width}
      height={el.height}
      fill={el.bgColor || '#ffffff'}
      stroke="#6366f1"
      strokeWidth={1.5}
      dash={[6, 4]}
    />

    <KonvaText
      x={0} y={el.height / 2 - 24}
      width={el.width}
      align="center"
      text="QR"
      fontSize={Math.min(48, el.height * 0.25)}
      fontStyle="bold"
      fill="#6366f1"
      listening={false}
    />

    <KonvaText
      x={6}
      y={el.height - 22}
      width={el.width - 12}
      align="center"
      text={el.text ? truncate(el.text, 32) : '(пустой QR)'}
      fontSize={11}
      fill="#64748b"
      ellipsis
      listening={false}
    />

    {isSelected && (
      <Rect
        width={el.width}
        height={el.height}
        stroke="#6366f1"
        strokeWidth={2}
        listening={false}
      />
    )}
  </Group>
);

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}