// src/presentation/components/canvas/GroupBBoxOverlay.tsx
import React, { useMemo, useSyncExternalStore } from 'react';
import { Rect } from 'react-konva';
import type { CanvasElement } from '@/shared/types';
import { dragLiveStore } from '@/ui/stores/DragLiveStore';

interface Props {
  selectedIds: string[];
  elements: CanvasElement[];
  zoom: number;
}

export const GroupBBoxOverlay: React.FC<Props> = ({ selectedIds, elements, zoom }) => {
  useSyncExternalStore(
    dragLiveStore.subscribe,
    () => {
      const parts: string[] = [];
      for (const id of selectedIds) {
        const p = dragLiveStore.get(id);
        parts.push(p ? `${p.x},${p.y}` : '');
      }
      return parts.join('|');
    },
  );

  const byId = useMemo(() => {
    const m = new Map<string, CanvasElement>();
    for (const el of elements) m.set(el.id, el);
    return m;
  }, [elements]);

  const chosen = selectedIds
    .map((id) => {
      const el = byId.get(id);
      if (!el) return null;
      const live = dragLiveStore.get(id);
      return live ? { ...el, ...live } : el;
    })
    .filter((e): e is CanvasElement => !!e);

  if (chosen.length <= 1) return null;

  const minX = Math.min(...chosen.map((e) => e.x));
  const minY = Math.min(...chosen.map((e) => e.y));
  const maxX = Math.max(...chosen.map((e) => e.x + e.width));
  const maxY = Math.max(...chosen.map((e) => e.y + e.height));

  return (
    <Rect
      x={minX} y={minY} width={maxX - minX} height={maxY - minY}
      stroke="#3b82f6" strokeWidth={2 / zoom} dash={[8 / zoom, 4 / zoom]}
      listening={false} perfectDrawEnabled={false}
    />
  );
};