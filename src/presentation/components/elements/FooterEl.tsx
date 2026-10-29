import React from 'react';
import { Group, Rect, Text as KonvaText } from 'react-konva';
import type { FooterElement } from '@/shared/types';
import type { CommonProps } from './types';

interface Props extends CommonProps<FooterElement> {
  el: FooterElement;
  onUpdate: (p: Partial<FooterElement>) => void;
  isEditing?: boolean;
}

export const FooterEl: React.FC<Props> = ({
  el, onSelect, onDragStart, onDragMove, onDragEnd,
  onContextMenu, onDblClick,
}) => (
  <Group
    id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation}
    draggable
    onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
    onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
    onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
    onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
    onDragStart={onDragStart} onDragMove={onDragMove}
    onDragEnd={(e) => { onDragEnd?.(e); }}
    onContextMenu={onContextMenu}
  >
    <Rect width={el.width} height={el.height} fill={el.bgColor} />
    {/*
      Раньше было `{!isEditing && <KonvaText .../>}` — при входе в
      rich-редактор текст футера исчезал с канвы, хотя футер тоже
      редактируется через RichTextEditor (см. useCanvasDblClick:
      `isRich = el.type === 'footer' ? true : ...`). Убрали, чтобы
      live-preview работал.
    */}
    <KonvaText
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