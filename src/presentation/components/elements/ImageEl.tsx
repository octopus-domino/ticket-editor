import React, { useEffect, useState } from 'react';
import { Image as KImage } from 'react-konva';
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
    <KImage
      id={el.id} name="element" x={el.x} y={el.y} width={el.width} height={el.height} image={img} rotation={el.rotation} draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart} onDragMove={onDragMove}
      onDragEnd={(e) => { onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
      perfectDrawEnabled={false} // ОГРОМНЫЙ БУСТ FPS
    />
  );
};