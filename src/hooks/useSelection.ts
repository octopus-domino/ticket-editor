import { useState, useCallback, useMemo } from 'react';
import type { CanvasElement, Slide } from '../types';

export function useSelection(activeSlide: Slide) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedId = selectedIds[0] ?? null;
  const selected = useMemo(
    () => activeSlide.elements.find((e) => e.id === selectedId) ?? null,
    [activeSlide, selectedId],
  );

  const select = useCallback((id: string, multi = false) => {
    setSelectedIds((prev) => {
      if (!multi) return [id];
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
    });
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);
  const selectMany = useCallback((ids: string[]) => setSelectedIds(ids), []);
  const isSelected = useCallback(
    (el: CanvasElement) => selectedIds.includes(el.id),
    [selectedIds],
  );

  return { selectedIds, selectedId, selected, select, clear, selectMany, isSelected, setSelectedIds };
}