/* ============================================================
   presentation/hooks/useFillRasterizer.ts
   F-RFILL-04, F-RFILL-12..13.

   Добавлен debounce 80ms (F-RFILL-12), чтобы при быстром drag
   в штампе не отправлять в worker кадр за кадром.
   ============================================================ */

import { useEffect, useState } from 'react';
import type { StampShapeItem } from '@/shared/types';
import type { FillSpec } from '@/lib/stamps/rasterFill';
import {
  getFillRasterizer,
  type FillCacheEntry,
} from '@/lib/stamps/fillRasterizer';

const DEBOUNCE_MS = 80;

export interface UseFillRasterizerArgs {
  key: string;
  width: number;
  height: number;
  shapes: StampShapeItem[];
  fills: FillSpec[];
  enabled: boolean;
}

export function useFillRasterizer(args: UseFillRasterizerArgs): FillCacheEntry | null {
  const { key, width, height, shapes, fills, enabled } = args;

  const [entry, setEntry] = useState<{ key: string; value: FillCacheEntry } | null>(
    () => { const value = getFillRasterizer().get(key); return value ? { key, value } : null; },
  );

  // Подписка на обновления кэша по key.
  useEffect(() => {
    const rasterizer = getFillRasterizer();
    const cached = rasterizer.get(key);
    setEntry(cached ? { key, value: cached } : null);
    return rasterizer.subscribe((changedKey, changedEntry) => {
      if (changedKey === key) setEntry({ key, value: changedEntry });
    });
  }, [key]);

  // Запрос растеризации с debounce 80ms (F-RFILL-12).
  useEffect(() => {
    if (!enabled) return;
    const rasterizer = getFillRasterizer();
    if (rasterizer.get(key)) return;
    if (rasterizer.isInflight(key)) return;

    const timeoutId = window.setTimeout(() => {
      rasterizer.request({ key, width, height, shapes, fills });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [key, width, height, shapes, fills, enabled]);

  return enabled && entry?.key === key ? entry.value : null;
}
