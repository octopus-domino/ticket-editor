import React, { useEffect, useRef } from 'react';
import type { CanvasElement, DashType } from './types';

interface Props {
  x: number;
  y: number;
  element: CanvasElement;
  onUpdate: (patch: any) => void;
  onClose: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDelete: () => void;
}

const DASH_OPTIONS: { id: DashType; label: string }[] = [
  { id: 'solid', label: '—' },
  { id: 'dashed', label: '--' },
  { id: 'dotted', label: '..' },
  { id: 'dashdot', label: '-.-' },
  { id: 'longdash', label: '——' },
];

export const FloatingProps: React.FC<Props> = ({
  x, y, element, onUpdate, onClose,
  onBringForward, onSendBackward, onDelete,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', down), 0);
    return () => document.removeEventListener('mousedown', down);
  }, [onClose]);

  const w = 400;
  const left = Math.min(Math.max(8, x - w / 2), window.innerWidth - w - 8);
  const top = Math.min(Math.max(8, y - 70), window.innerHeight - 80);

  return (
    <div ref={ref} className="floating-props" style={{ left, top }}>
      <div className="fp-group">
        <button title="Вперёд на слой" onClick={onBringForward}>⬆</button>
        <button title="Назад на слой" onClick={onSendBackward}>⬇</button>
        <button title="Удалить" onClick={onDelete}>🗑</button>
      </div>

      {element.type === 'shape' && (
        <>
          <div className="fp-group">
            <label className="fp-label">Заливка</label>
            <input type="color"
              value={element.fill === 'transparent' ? '#ffffff' : element.fill}
              onChange={(e) => onUpdate({ fill: e.target.value })} />
            <button type="button" title="Прозрачная" style={{ padding: '2px 6px', fontSize: 12 }}
              onClick={() => onUpdate({ fill: 'transparent' })}>∅</button>
          </div>
          <div className="fp-group">
            <label className="fp-label">Обводка</label>
            <input type="color" value={element.stroke}
              onChange={(e) => onUpdate({ stroke: e.target.value })} />
            <input type="number" min="0" max="20" value={element.strokeWidth}
              style={{ width: 50 }}
              onChange={(e) => onUpdate({ strokeWidth: +e.target.value })} />
          </div>
        </>
      )}

      {element.type === 'stamp' && (
        <>
          <div className="fp-group">
            <label className="fp-label">Цвет</label>
            <input type="color" value={element.stampColor}
              onChange={(e) => onUpdate({ stampColor: e.target.value })} />
          </div>
          <div className="fp-group">
            <label className="fp-label">Линия</label>
            <input type="number" min="0" max="20" value={element.strokeWidth}
              style={{ width: 50 }}
              onChange={(e) => onUpdate({ strokeWidth: +e.target.value })} />
            <select value={element.strokeDash}
              onChange={(e) => onUpdate({ strokeDash: e.target.value as DashType })}>
              {DASH_OPTIONS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
        </>
      )}

      {element.type === 'text' && (
        <>
          <div className="fp-group">
            <label className="fp-label">Цвет</label>
            <input type="color" value={element.fill}
              onChange={(e) => onUpdate({ fill: e.target.value })} />
          </div>
          <div className="fp-group">
            <label className="fp-label">Размер</label>
            <input type="number" min="8" max="120" value={element.fontSize}
              style={{ width: 55 }}
              onChange={(e) => onUpdate({ fontSize: +e.target.value })} />
          </div>
          <div className="fp-group">
            <label className="fp-label">Шрифт</label>
            <select value={element.fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times</option>
              <option value="Courier New">Courier</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
            </select>
          </div>
        </>
      )}

      {element.type === 'line' && (
        <>
          <div className="fp-group">
            <label className="fp-label">Цвет</label>
            <input type="color" value={element.stroke}
              onChange={(e) => onUpdate({ stroke: e.target.value })} />
          </div>
          <div className="fp-group">
            <label className="fp-label">Толщина</label>
            <input type="number" min="1" max="20" value={element.strokeWidth}
              style={{ width: 50 }}
              onChange={(e) => onUpdate({ strokeWidth: +e.target.value })} />
          </div>
          <div className="fp-group">
            <label className="fp-label">Стрелка</label>
            <input type="checkbox" checked={element.isArrow}
              onChange={(e) => onUpdate({ isArrow: e.target.checked })} />
          </div>
        </>
      )}
    </div>
  );
};