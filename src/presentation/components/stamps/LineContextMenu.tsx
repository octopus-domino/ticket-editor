/* ============================================================
   stamps/LineContextMenu.tsx
   F-LN-09, F-CM-03..04, F-CM-06..08.
   ============================================================ */

import React, { useEffect, useRef } from 'react';

export interface LineContextMenuState {
  clientX: number;
  clientY: number;
  shapeId: string;
  pointIndex: number;
}

interface Props {
  state: LineContextMenuState;
  canRemove: boolean;
  onClose: () => void;
  onRemovePoint: () => void;
  onAddPoint: () => void;
}

const MARGIN = 8;

export const LineContextMenu: React.FC<Props> = ({
  state, canRemove, onClose, onRemovePoint, onAddPoint,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(state.clientX, vw - 220 - MARGIN);
  const top = Math.min(state.clientY, vh - 120 - MARGIN);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left, top, zIndex: 3000, position: 'fixed' }}
    >
      <div className="context-menu-item" onClick={onAddPoint}>
        <span>Добавить точку</span>
      </div>
      <div
        className={`context-menu-item ${canRemove ? 'danger' : 'disabled'}`}
        onClick={canRemove ? onRemovePoint : undefined}
      >
        <span>Удалить точку</span>
      </div>
    </div>
  );
};