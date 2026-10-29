import React, { useEffect, useState } from 'react';
import { Group, Image as KImage } from 'react-konva';
import type { ImageElement } from '@/shared/types';
import type { CommonProps } from './types';

interface Props extends CommonProps<ImageElement> {
  el: ImageElement;
  onUpdate: (p: Partial<ImageElement>) => void;
}

export const ImageEl: React.FC<Props> = ({
  el, onSelect, onUpdate: _onUpdate, onDragStart, onDragMove, onDragEnd, onContextMenu,
}) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const i = new window.Image();
    i.src = el.src;
    i.onload = () => setImg(i);
  }, [el.src]);

  if (!img) return null;

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
    >
      <Group
        scaleX={el.flipX ? -1 : 1}
        scaleY={el.flipY ? -1 : 1}
        x={el.flipX ? el.width : 0}
        y={el.flipY ? el.height : 0}
      >
        <KImage
          x={0} y={0} width={el.width} height={el.height} image={img}
          perfectDrawEnabled={false}
        />
      </Group>
    </Group>
  );
};