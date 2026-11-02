import { useStore } from '@/shared/store/store';
import { modelStore } from './ModelStore';

/**
 * Возвращает значения активной модели.
 * Компонент перерендерится при изменении модели — даёт live-preview.
 * Если модель не выбрана — пустой объект (плейсхолдеры остаются как есть).
 */
export function useActiveModelValues(): Record<string, unknown> {
  const models = useStore(modelStore, (s) => s.models);
  const selectedId = useStore(modelStore, (s) => s.selectedId);
  const active = models.find((m) => m.id === selectedId);
  return active?.values ?? EMPTY;
}

const EMPTY: Record<string, unknown> = Object.freeze({});