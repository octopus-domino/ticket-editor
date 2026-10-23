import React, { useEffect, useRef, useState } from 'react';
import type { CanvasElement } from '@/shared/types';

interface FloatingPropsProps {
  x: number;
  y: number;
  element: CanvasElement;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onClose: () => void;
  onDelete: () => void;
}

const normalizeColor = (c: string | undefined | null): string => {
  if (!c || c === 'transparent') return '#ffffff';
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  }
  return c;
};

export const FloatingProps: React.FC<FloatingPropsProps> = ({
  x, y, element, onUpdate, onClose, onDelete,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    let newX = x;
    let newY = y - 50;
    if (newX + rect.width > window.innerWidth) newX = window.innerWidth - rect.width - 10;
    if (newX < 10) newX = 10;
    if (newY < 10) newY = y + element.height + 10;
    if (newY + rect.height > window.innerHeight) newY = window.innerHeight - rect.height - 10;
    setPosition({ x: newX, y: newY });
  }, [x, y, element.height]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', down), 0);
    return () => document.removeEventListener('mousedown', down);
  }, [onClose]);

  return (
    <div ref={panelRef} className="floating-props" style={{ left: position.x, top: position.y }}>
      <div className="fp-group">
        <button onClick={onDelete} title="Удалить">🗑</button>
      </div>

      {element.type === 'shape' && (
        <>
          <div className="fp-group">
            <label>Заливка</label>
            <input
              type="color"
              value={normalizeColor(element.fill)}
              onChange={(e) => onUpdate({ fill: e.target.value })}
            />
            <button onClick={() => onUpdate({ fill: 'transparent' })}>∅</button>
          </div>
          <div className="fp-group">
            <label>Обводка</label>
            <input
              type="color"
              value={normalizeColor(element.stroke)}
              onChange={(e) => onUpdate({ stroke: e.target.value })}
            />
          </div>
        </>
      )}

      {element.type === 'text' && (
        <>
          <div className="fp-group">
            <label>Цвет</label>
            <input
              type="color"
              value={normalizeColor(element.fill)}
              onChange={(e) => onUpdate({ fill: e.target.value })}
            />
          </div>
          <div className="fp-group">
            <label>Размер</label>
            <input
              type="number"
              value={element.fontSize}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            />
          </div>
        </>
      )}
    </div>
  );
};