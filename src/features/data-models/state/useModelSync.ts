import { useEffect } from 'react';
import { modelStore } from './ModelStore';
import { useDocumentStore } from '@/presentation/providers/EditorProvider';

/**
 * Синхронизирует изменения в активной модели данных с холстом.
 * Как только значения в modelStore меняются (локально или после загрузки),
 * все PlaceholderElement на холсте получают новый sample.
 */
export function useModelSync(): void {
  const docStore = useDocumentStore();

  useEffect(() => {
    const sync = (): void => {
      const state = modelStore.getState();
      const active = state.models.find((m) => m.id === state.selectedId);
      
      // Если модель выбрана, применяем её значения к холсту
      if (active) {
        docStore.applyModelToSlides(active.values);
      }
    };

    // Первичная синхронизация при монтировании
    sync();
    
    // Слушаем изменения в modelStore (срабатывает при изменении полей)
    return modelStore.subscribe(sync);
  }, [docStore]);
}