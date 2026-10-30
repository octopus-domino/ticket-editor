import React, { useEffect, useState } from 'react';
import { Group, Rect, Image as KImage } from 'react-konva';
import type { DiagramElement } from '@/shared/types';
import type { CommonProps } from './types';

// Оставляем только el и onUpdate. onDblClick берем из CommonProps.
interface Props extends CommonProps<DiagramElement> {
  el: DiagramElement;
  onUpdate: (p: Partial<DiagramElement>) => void;
}

export const DiagramEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onDblClick,
  onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);

    if (!el.svg || !el.svg.trim()) {
      setImg(null);
      return;
    }

    const blob = new Blob([el.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new window.Image();

    let cancelled = false;

    image.onload = () => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      setImg(image);
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      setImg(null);
      setLoadError(true);
      URL.revokeObjectURL(url);
    };

    image.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [el.svg]);

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      draggable
      dragDistance={3}
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      // ИСПРАВЛЕНО: передаем событие `e` дальше в Canvas.tsx
      onDblClick={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onDblClick?.(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => {
        onUpdate({ x: e.target.x(), y: e.target.y() });
        onDragEnd?.(e);
      }}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => {
        const n = e.target;
        const sx = n.scaleX();
        const sy = n.scaleY();
        n.scaleX(1);
        n.scaleY(1);
        onUpdate({
          x: n.x(),
          y: n.y(),
          rotation: n.rotation(),
          width: Math.max(40, el.width * sx),
          height: Math.max(40, el.height * sy),
        });
      }}
    >
      <Rect width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" />

      {img && !loadError && (
        <KImage
          x={0}
          y={0}
          width={el.width}
          height={el.height}
          image={img}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {(!img || loadError) && (
        <Rect
          width={el.width}
          height={el.height}
          fill="#f8fafc"
          stroke="#cbd5e1"
          strokeWidth={1}
          dash={[6, 4]}
          cornerRadius={4}
          listening={false}
        />
      )}

      {isSelected && (
        <Rect
          width={el.width}
          height={el.height}
          stroke="#6366f1"
          strokeWidth={1.5}
          dash={[6, 4]}
          listening={false}
        />
      )}
    </Group>
  );
};