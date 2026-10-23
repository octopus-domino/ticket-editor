import { useCallback, useRef, useState } from 'react';
import type { SelectionStore } from '../../stores/SelectionStore';
import type { CanvasElement } from '@/shared/types';
import { getBBox } from '@/lib/geometry';

interface Box { x1: number; y1: number; x2: number; y2: number }

export function useCanvasRubberBand(params: { selStore: SelectionStore }) {
  const { selStore } = params;
  const [box, setBox] = useState<Box | null>(null);
  const active = useRef<Box | null>(null);

  const begin = useCallback((x: number, y: number) => {
    active.current = { x1: x, y1: y, x2: x, y2: y };
    setBox({ ...active.current });
  }, []);

  const update = useCallback((x: number, y: number) => {
    if (!active.current) return;
    const b = active.current;
    active.current = {
      x1: b.x1,
      y1: b.y1,
      x2: x,
      y2: y,
    };
    setBox({ ...active.current });
  }, []);

  const finish = useCallback((elements: CanvasElement[]) => {
    const b = active.current;
    active.current = null;
    setBox(null);
    if (!b) return;

    const minX = Math.min(b.x1, b.x2);
    const maxX = Math.max(b.x1, b.x2);
    const minY = Math.min(b.y1, b.y2);
    const maxY = Math.max(b.y1, b.y2);

    // Клик без движения — не трогаем selection (clear уже сделан в onStageDown)
    if (maxX - minX < 4 && maxY - minY < 4) return;

    if (!Array.isArray(elements) || !elements.length) return;

    const ids: string[] = [];
    for (const el of elements) {
      if (el.type === 'connector' || el.type === 'fill' || el.locked) continue;

      // Учитываем поворот: используем реальный bbox, а не x/y/width/height.
      const bb = getBBox(el);
      if (bb.x + bb.w < minX) continue;
      if (bb.x > maxX) continue;
      if (bb.y + bb.h < minY) continue;
      if (bb.y > maxY) continue;
      ids.push(el.id);
    }

    selStore.setIds(ids);
  }, [selStore]);

  return {
    begin, update, finish,
    isActive: () => active.current !== null,
    ref: () => box,
  };
}