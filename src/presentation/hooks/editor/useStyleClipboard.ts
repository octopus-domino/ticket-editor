import { useCallback } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { SelectionStore } from '../../stores/SelectionStore';
import type { ModalsStore } from '../../stores/ModalsStore';
import type { CanvasElement } from '@/shared/types';

export function useStyleClipboard(
  docStore: DocumentStore,
  selStore: SelectionStore,
  modalsStore: ModalsStore,
) {
  const copyStyle = useCallback((el: CanvasElement) => {
    modalsStore.copyStyle(el);
  }, [modalsStore]);

  const applyStyle = useCallback(() => {
    const style = modalsStore.getStyleClipboard();
    const id = selStore.getState().selectedIds[0];
    if (!style || !id) return;
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      const el = s?.elements.find((x) => x.id === id);
      if (el) Object.assign(el, style);
    }, `style-${id}`);
    modalsStore.clearStyle();
  }, [docStore, selStore, modalsStore]);

  return { copyStyle, applyStyle };
}