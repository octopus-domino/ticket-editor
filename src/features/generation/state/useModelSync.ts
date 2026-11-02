import { useEffect } from 'react';
import { modelStore } from './ModelStore';
import { useDocumentStore } from '@/presentation/providers/EditorProvider';

/**
 * Синхронизирует изменения в активной модели данных с холстом.
 * Как только значения в modelStore меняются (локально или после загрузки),
 * все PlaceholderElement получают новый sample.
 */
export function useModelSync(): void {
  const docStore = useDocumentStore();

  useEffect(() => {
    const sync = (): void => {
      const state = modelStore.getState();
      const active = state.models.find((m) => m.id === state.selectedId);
      if (active) {
        docStore.applyModelToSlides(active.values);
      }
    };

    // Первичная синхронизация
    sync();
    
    // Слушаем изменения
    return modelStore.subscribe(sync);
  }, [docStore]);
}