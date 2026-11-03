import { useMemo } from 'react';
import type { ListItemAdapter } from './types';

export function useListSearch<T>(
  items: readonly T[],
  adapter: ListItemAdapter<T>,
  query: string,
): readonly T[] {
  return useMemo(() => {
    const tokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) return items;

    return items.filter((item) => {
      const haystack = (
        adapter.getSearchText?.(item) ?? adapter.getLabel(item)
      ).toLowerCase();
      for (const t of tokens) {
        if (!haystack.includes(t)) return false;
      }
      return true;
    });
  }, [items, adapter, query]);
}