/* ============================================================
   presentation/hooks/useDraggableModal.ts

   Управление позицией модального окна. Возвращает:
     • position — текущий сдвиг {x, y} для transform: translate
     • onHeaderMouseDown — хендлер на header (вешает listeners)
   Модал не выезжает за пределы вьюпорта более чем наполовину.
   ============================================================ */

import { useCallback, useRef, useState } from 'react';

export interface UseDraggableModalResult {
  position: { x: number; y: number };
  onHeaderMouseDown: (e: React.MouseEvent) => void;
}

export function useDraggableModal(): UseDraggableModalResult {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number; startY: number; startPosX: number; startPosY: number;
  } | null>(null);

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const maxX = Math.max(0, window.innerWidth - 200);
      const minX = -(window.innerWidth - 200);
      const maxY = Math.max(0, window.innerHeight - 100);
      const minY = -(window.innerHeight - 100);
      setPosition({
        x: Math.max(minX, Math.min(maxX, d.startPosX + ev.clientX - d.startX)),
        y: Math.max(minY, Math.min(maxY, d.startPosY + ev.clientY - d.startY)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [position.x, position.y]);

  return { position, onHeaderMouseDown };
}