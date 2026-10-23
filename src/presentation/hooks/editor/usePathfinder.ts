/* ============================================================
   presentation/hooks/editor/usePathfinder.ts

   Boolean-операции через lib/graphics/pathfinder.
   Возвращает { ok, error } для отображения в UI.
   ============================================================ */

import { useCallback, useState } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { SelectionStore } from '../../stores/SelectionStore';
import { applyPathfinder } from '@/lib/graphics/pathfinder';
import { isBooleanOperand, type PathfinderOp } from '@/domain/arrange/pathfinder';

export interface PathfinderResult {
  ok: boolean;
  error?: string;
}

export function usePathfinder(docStore: DocumentStore, selStore: SelectionStore) {
  const [busy, setBusy] = useState(false);

  const run = useCallback((op: PathfinderOp): PathfinderResult => {
    const state = docStore.getState();
    const slide = state.slides.find(s => s.id === state.activeId);
    if (!slide) return { ok: false, error: 'Нет активного слайда' };

    const ids = selStore.getState().selectedIds;
    const selected = ids
      .map(id => slide.elements.find(el => el.id === id))
      .filter((el): el is NonNullable<typeof el> => Boolean(el));

    if (selected.length < 2) {
      return { ok: false, error: 'Нужно минимум 2 элемента' };
    }

    for (const el of selected) {
      if (!isBooleanOperand(el)) {
        return { ok: false, error: 'Text и символы не участвуют в boolean-операциях' };
      }
    }

    setBusy(true);
    try {
      const result = applyPathfinder(selected, op);
      if (!result) {
        return { ok: false, error: 'Операция не дала результата (пустые контуры?)' };
      }
      docStore.commit((draft) => {
        const s = draft.slides.find(x => x.id === draft.activeId);
        if (!s) return;
        // Удалить исходные
        s.elements = s.elements.filter(el => !ids.includes(el.id));
        // Добавить результат
        s.elements.push(result);
      }, `pathfinder-${op}`);
      selStore.setIds([result.id]);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err) };
    } finally {
      setBusy(false);
    }
  }, [docStore, selStore]);

  return { run, busy };
}