import React, { useEffect, useState } from 'react';
import { Group, Rect, Image as KImage } from 'react-konva';
import type { DiagramElement } from '@/shared/types';
import type { CommonProps } from './types';

interface Props extends CommonProps<DiagramElement> {
  el: DiagramElement;
  onUpdate: (p: Partial<DiagramElement>) => void;
  onDblClick: () => void;
}

export const DiagramEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onDblClick,
  onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!el.svg) { setImg(null); return; }
    const blob = new Blob([el.svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const image = new window.Image();
    image.onload = () => { setImg(image); URL.revokeObjectURL(url); };
    image.onerror = () => { setImg(null); URL.revokeObjectURL(url); };
    image.src = url;
  }, [el.svg]);

  return (
    <Group
      id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation} draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDblClick={(e) => { e.cancelBubble = true; onDblClick(); }}
      onDblTap={(e) => { e.cancelBubble = true; onDblClick(); }}
      onDragStart={onDragStart} onDragMove={onDragMove}
      onDragEnd={(e) => { onUpdate({ x: e.target.x(), y: e.target.y() }); onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => {
        const n = e.target;
        const sx = n.scaleX(); const sy = n.scaleY();
        n.scaleX(1); n.scaleY(1);
        onUpdate({
          x: n.x(), y: n.y(), rotation: n.rotation(),
          width: Math.max(40, el.width * sx),
          height: Math.max(40, el.height * sy),
        });
      }}
    >
      <Rect width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" />
      {img
        ? <KImage x={0} y={0} width={el.width} height={el.height} image={img} listening={false} />
        : <Rect width={el.width} height={el.height} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1} dash={[6, 4]} />}
      {isSelected && (
        <Rect width={el.width} height={el.height} stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} listening={false} />
      )}
    </Group>
  );
};