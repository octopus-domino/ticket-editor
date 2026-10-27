import React, { useEffect, useRef } from 'react';

export interface ContextAction {
  label: string;
  shortcut?: string;
  action: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  actions: ContextAction[];
  onClose: () => void;
}

export const ContextMenu: React.FC<Props> = ({ x, y, actions, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    setTimeout(() => {
      document.addEventListener('mousedown', onClick);
      document.addEventListener('keydown', onEsc);
    }, 0);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const menuW = 240;
  const menuH = actions.length * 32 + 8;
  const left = Math.min(x, window.innerWidth - menuW - 8);
  const top = Math.min(y, window.innerHeight - menuH - 8);

  return (
    <div ref={ref} className="context-menu" style={{ left, top }}>
      {actions.map((a, i) => (
        <div
          key={i}
          className={`context-menu-item ${a.danger ? 'danger' : ''}`}
          onClick={() => { a.action(); onClose(); }}
        >
          <span>{a.label}</span>
          {a.shortcut && <span className="shortcut">{a.shortcut}</span>}
        </div>
      ))}
    </div>
  );
};