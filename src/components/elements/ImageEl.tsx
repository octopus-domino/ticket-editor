import React, { useEffect, useState } from 'react';
import { Image as KImage } from 'react-konva';
import type { ImageElement } from '../../types';
import type { CommonProps } from './types';

interface Props extends CommonProps {
  el: ImageElement;
  onUpdate: (p: Partial<ImageElement>) => void;
}

export const ImageEl: React.FC<Props> = ({
  el, onSelect, onUpdate,
  onDragStart, onDragMove, onDragEnd, onContextMenu,
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
      id={el.id}
      name="element"
      x={el.x} y={el.y}
      width={el.width} height={el.height}
      image={img}
      rotation={el.rotation}
      draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onUpdate({ x: e.target.x(), y: e.target.y() }); onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => {
        const n = e.target;
        const sx = n.scaleX(); const sy = n.scaleY();
        n.scaleX(1); n.scaleY(1);
        onUpdate({
          x: n.x(), y: n.y(), rotation: n.rotation(),
          width: el.width * sx, height: el.height * sy,
        });
      }}
    />
  );
};