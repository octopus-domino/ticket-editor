import { useCallback, useMemo } from 'react';
import type { ListItemAdapter } from './types';

export interface UseListSelectionResult<T> {
  readonly selectedIds: ReadonlySet<string>;
  readonly selectedItems: readonly T[];
  readonly count: number;
  toggle(id: string): void;
  setIds(ids: readonly string[] | ReadonlySet<string>): void;
  clear(): void;
  toggleAll(visibleIds: readonly string[]): void;
  isSelected(id: string): boolean;
  areAllSelected(visibleIds: readonly string[]): boolean;
  arePartiallySelected(visibleIds: readonly string[]): boolean;
}

export function useListSelection<T>(
  items: readonly T[],
  adapter: ListItemAdapter<T>,
  selectedIds: ReadonlySet<string>,
  onChange: (next: Set<string>) => void,
): UseListSelectionResult<T> {
  const toggle = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange(next);
    },
    [selectedIds, onChange],
  );

  const setIds = useCallback(
    (ids: readonly string[] | ReadonlySet<string>) => {
      onChange(new Set(Array.from(ids)));
    },
    [onChange],
  );

  const clear = useCallback(() => {
    if (selectedIds.size === 0) return;
    onChange(new Set());
  }, [selectedIds, onChange]);

  const toggleAll = useCallback(
    (visibleIds: readonly string[]) => {
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
      const next = new Set(selectedIds);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      onChange(next);
    },
    [selectedIds, onChange],
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const areAllSelected = useCallback(
    (visibleIds: readonly string[]) =>
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id)),
    [selectedIds],
  );

  const arePartiallySelected = useCallback(
    (visibleIds: readonly string[]) => {
      let any = false;
      for (const id of visibleIds) {
        if (selectedIds.has(id)) { any = true; break; }
      }
      if (!any) return false;
      return !visibleIds.every((id) => selectedIds.has(id));
    },
    [selectedIds],
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(adapter.getId(item))),
    [items, selectedIds, adapter],
  );

  return {
    selectedIds,
    selectedItems,
    count: selectedIds.size,
    toggle,
    setIds,
    clear,
    toggleAll,
    isSelected,
    areAllSelected,
    arePartiallySelected,
  };
}