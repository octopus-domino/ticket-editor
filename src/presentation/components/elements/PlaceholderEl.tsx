import React, { useEffect, useRef, useState } from 'react';
import { Group, Rect, Text, Image as KImage } from 'react-konva';
import type Konva from 'konva';
import type { PlaceholderElement } from '@/shared/types';
import type { CommonProps } from './types';

interface Props extends CommonProps<PlaceholderElement> {
  el: PlaceholderElement;
  onUpdate: (p: Partial<PlaceholderElement>) => void;
}

export const PlaceholderEl: React.FC<Props> = ({
  el, onSelect, onUpdate,
  onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const textRef = useRef<Konva.Text>(null);

  useEffect(() => {
    if (el.fieldType !== 'image' || !el.sample) { setImg(null); return; }
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.src = el.sample;
    i.onload = () => setImg(i);
    i.onerror = () => setImg(null);
  }, [el.sample, el.fieldType]);

  const pad = el.padding || { top: 0, right: 0, bottom: 0, left: 0 };
  const innerW = Math.max(10, el.width - pad.left - pad.right);
  const pathLabel = `{{${el.fieldPath}}}`;
  const sampleText = el.sample || '—';

  const konvaStyle = [
    (el.fontStyle || '').includes('bold') ? 'bold' : '',
    (el.fontStyle || '').includes('italic') ? 'italic' : '',
  ].filter(Boolean).join(' ') || 'normal';

  useEffect(() => {
    if (el.fieldType === 'image') return;
    if (el.inline) return;
    const node = textRef.current;
    if (!node) return;
    const measured = Math.ceil(node.height() + pad.top + pad.bottom + 24);
    if (Math.abs(measured - el.height) > 2) onUpdate({ height: measured });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el.sample, el.fontSize, el.width, el.fontFamily, el.fontStyle, el.lineHeight, el.align, el.padding, el.fieldType, el.inline]);

  if (el.inline) {
    if (el.fieldType === 'image') {
      return (
        <Group
          id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation} draggable
          onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
          onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
          onDragStart={onDragStart} onDragMove={onDragMove}
          onDragEnd={(e) => { onUpdate({ x: e.target.x(), y: e.target.y() }); onDragEnd?.(e); }}
          onContextMenu={onContextMenu}
          onTransformEnd={(e) => {
            const n = e.target;
            const sx = n.scaleX(); const sy = n.scaleY();
            n.scaleX(1); n.scaleY(1);
            onUpdate({
              x: n.x(), y: n.y(), rotation: n.rotation(),
              width: Math.max(20, el.width * sx),
              height: Math.max(20, el.height * sy),
            });
          }}
        >
          <Rect width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" />
          {img ? <KImage x={0} y={0} width={el.width} height={el.height} image={img} listening={false} />
               : <Rect width={el.width} height={el.height} fill="#f0f0f0" listening={false} />}
          {isSelected && (
            <Rect width={el.width} height={el.height}
              stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} listening={false} />
          )}
        </Group>
      );
    }
    return (
      <Group
        id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation} draggable
        onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
        onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
        onDragStart={onDragStart} onDragMove={onDragMove}
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
        <Rect width={el.width} height={el.height} fill="rgba(0,0,0,0.001)" />
        {isSelected && (
          <Rect width={el.width} height={el.height}
            stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} listening={false} />
        )}
        <Text
          ref={textRef}
          x={pad.left} y={pad.top}
          width={innerW}
          text={sampleText}
          fontSize={el.fontSize}
          fontFamily={el.fontFamily || 'Arial'}
          fontStyle={konvaStyle}
          textDecoration={el.textDecoration || ''}
          align={el.align}
          lineHeight={el.lineHeight || 1.2}
          fill={el.fill}
          wrap="word"
          listening={false}
        />
      </Group>
    );
  }

  if (el.fieldType === 'image') {
    return (
      <Group
        id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation} draggable
        onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
        onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
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
        <Rect
          width={el.width} height={el.height}
          fill="#f8fafc" stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} cornerRadius={6}
        />
        <Rect width={el.width} height={22} fill="#6366f1" cornerRadius={[6, 6, 0, 0]} />
        <Text
          x={8} y={6} width={el.width - 16}
          text={`🖼 ${pathLabel}`}
          fontSize={11} fontFamily="monospace" fill="#ffffff" listening={false}
        />
        {img ? (
          <KImage
            x={pad.left} y={22 + pad.top}
            width={innerW}
            height={Math.max(10, el.height - 22 - pad.top - pad.bottom)}
            image={img}
            listening={false}
          />
        ) : (
          <Text
            x={pad.left} y={(el.height + 22) / 2} width={innerW}
            align="center"
            text="(картинка не загружена)"
            fontSize={12} fill="#94a3b8" listening={false}
          />
        )}
      </Group>
    );
  }

  return (
    <Group
      id={el.id} name="element" x={el.x} y={el.y} rotation={el.rotation} draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart} onDragMove={onDragMove}
      onDragEnd={(e) => { onUpdate({ x: e.target.x(), y: e.target.y() }); onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
      onTransformEnd={(e) => {
        const n = e.target;
        const sx = n.scaleX();
        n.scaleX(1); n.scaleY(1);
        onUpdate({
          x: n.x(), y: n.y(), rotation: n.rotation(),
          width: Math.max(60, el.width * sx),
        });
      }}
    >
      <Rect
        width={el.width} height={el.height}
        fill={el.background && el.background !== 'transparent' ? el.background : '#f8fafc'}
        stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} cornerRadius={6}
      />
      <Rect width={el.width} height={20} fill="#6366f1" cornerRadius={[6, 6, 0, 0]} />
      <Text
        x={8} y={4} width={el.width - 16}
        text={pathLabel}
        fontSize={11} fontFamily="monospace" fill="#ffffff" listening={false}
      />
      <Text
        ref={textRef}
        x={pad.left} y={20 + pad.top}
        width={innerW}
        text={sampleText}
        fontSize={el.fontSize}
        fontFamily={el.fontFamily || 'Arial'}
        fontStyle={konvaStyle}
        textDecoration={el.textDecoration || ''}
        align={el.align}
        verticalAlign={el.verticalAlign || 'top'}
        lineHeight={el.lineHeight || 1.2}
        fill={el.fill}
        wrap="word"
        listening={false}
      />
    </Group>
  );
};