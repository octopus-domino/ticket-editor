/* ============================================================
   presentation/hooks/editor/useArrange.ts

   Обёртка над domain/arrange/align: берёт выделенные элементы,
   вызывает чистую функцию, коммитит патчи ОДНИМ commit().
   ============================================================ */

import { useCallback } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { SelectionStore } from '../../stores/SelectionStore';
import {
  computeAlign, computeDistribute,
  type AlignMode, type DistributeAxis,
} from '@/domain/arrange/align';

export function useArrange(docStore: DocumentStore, selStore: SelectionStore) {
  const getSelected = useCallback(() => {
    const ids = selStore.getState().selectedIds;
    const state = docStore.getState();
    const slide = state.slides.find(s => s.id === state.activeId);
    if (!slide) return [];
    return ids
      .map(id => slide.elements.find(el => el.id === id))
      .filter((el): el is NonNullable<typeof el> => Boolean(el));
  }, [docStore, selStore]);

  const align = useCallback((mode: AlignMode) => {
    const selected = getSelected();
    const patches = computeAlign(selected, mode);
    if (!patches) return;
    docStore.commit((draft) => {
      const slide = draft.slides.find(s => s.id === draft.activeId);
      if (!slide) return;
      for (const el of slide.elements) {
        const patch = patches[el.id];
        if (!patch) continue;
        if (patch.x !== undefined) el.x = patch.x;
        if (patch.y !== undefined) el.y = patch.y;
      }
    }, `align-${mode}`);
  }, [docStore, getSelected]);

  const distribute = useCallback((axis: DistributeAxis) => {
    const selected = getSelected();
    const patches = computeDistribute(selected, axis);
    if (!patches) return;
    docStore.commit((draft) => {
      const slide = draft.slides.find(s => s.id === draft.activeId);
      if (!slide) return;
      for (const el of slide.elements) {
        const patch = patches[el.id];
        if (!patch) continue;
        if (patch.x !== undefined) el.x = patch.x;
        if (patch.y !== undefined) el.y = patch.y;
      }
    }, `distribute-${axis}`);
  }, [docStore, getSelected]);

  return { align, distribute };
}