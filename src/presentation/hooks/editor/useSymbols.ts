/* ============================================================
   presentation/hooks/editor/useSymbols.ts

   Создание символа из выделенного, инстанцирование, отсоединение.
   Инстанс — обычный элемент с полем symbolId. Рендер — из прототипа.
   ============================================================ */

import { useCallback } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { SelectionStore } from '../../stores/SelectionStore';
import type { GraphicsStore } from '../../stores/GraphicsStore';
import type { CanvasElement } from '@/shared/types';
import { generateIdWithPrefix } from '@/shared/utils/id';

export function useSymbols(
  docStore: DocumentStore,
  selStore: SelectionStore,
  graphicsStore: GraphicsStore,
) {
  const createFromSelection = useCallback((name: string): string | null => {
    const state = docStore.getState();
    const slide = state.slides.find(s => s.id === state.activeId);
    if (!slide) return null;
    const firstId = selStore.getState().selectedIds[0];
    if (!firstId) return null;
    const el = slide.elements.find(e => e.id === firstId);
    if (!el) return null;
    return graphicsStore.addSymbol(name, { ...el, id: '' });
  }, [docStore, selStore, graphicsStore]);

  const instantiate = useCallback((symbolId: string): string | null => {
    const symbol = graphicsStore.getSymbol(symbolId);
    if (!symbol) return null;
    const instance: CanvasElement = {
      ...JSON.parse(JSON.stringify(symbol.prototype)),
      id: generateIdWithPrefix('inst'),
      x: 200 + Math.round(Math.random() * 150),
      y: 200 + Math.round(Math.random() * 150),
      rotation: 0,
      symbolId,
      styleId: null,
    };
    docStore.commit((draft) => {
      const s = draft.slides.find(x => x.id === draft.activeId);
      if (s) s.elements.push(instance);
    }, 'insert-symbol');
    selStore.setIds([instance.id]);
    return instance.id;
  }, [docStore, selStore, graphicsStore]);

  const detach = useCallback((instanceId: string) => {
    const state = docStore.getState();
    const slide = state.slides.find(s => s.id === state.activeId);
    const el = slide?.elements.find(e => e.id === instanceId);
    if (!el || !el.symbolId) return;
    const symbol = graphicsStore.getSymbol(el.symbolId);
    if (!symbol) return;

    docStore.commit((draft) => {
      const s = draft.slides.find(x => x.id === draft.activeId);
      const target = s?.elements.find(e => e.id === instanceId);
      if (!target) return;
      Object.assign(target, symbol.prototype, {
        id: target.id,
        x: target.x,
        y: target.y,
        rotation: target.rotation,
        symbolId: null,
        styleId: null,
      });
    }, 'detach-symbol');
  }, [docStore, graphicsStore]);


   const updateSymbolFromElement = useCallback((symbolId: string, element: CanvasElement) => {
    // Очищаем элемент от его текущей позиции и id, чтобы сделать его чистым прототипом
    const prototype = {
      ...JSON.parse(JSON.stringify(element)),
      id: '',
      x: 0,
      y: 0,
      rotation: 0,
      symbolId: null,
      styleId: null,
    };
    graphicsStore.updateSymbol(symbolId, prototype);
  }, [graphicsStore]);

  return { createFromSelection, instantiate, detach, updateSymbolFromElement };
}