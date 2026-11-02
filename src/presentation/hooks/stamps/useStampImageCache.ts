import { useEffect, useRef, useState } from 'react';
import type { StampImageItem } from '@/shared/types';

export function useStampImageCache(images: StampImageItem[]): Record<string, HTMLImageElement> {
  const [cache, setCache] = useState<Record<string, HTMLImageElement>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const key = images.map((i) => i.src).join('|');

  useEffect(() => {
    let cancelled = false;
    const pending = new Set<HTMLImageElement>();

    for (const im of images) {
      if (im.hidden) continue;
      if (cacheRef.current[im.src]) continue;

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      pending.add(img);

      img.onload = () => {
        pending.delete(img);
        if (cancelled) {
          // компонент размонтирован — не зовём setState
          img.onload = null;
          img.onerror = null;
          img.src = '';
          return;
        }
        setCache((prev) => {
          // если src уже есть — не перезаписываем (кто-то успел раньше)
          if (prev[im.src]) return prev;
          return { ...prev, [im.src]: img };
        });
      };

      img.onerror = () => {
        pending.delete(img);
        img.onload = null;
        img.onerror = null;
        img.src = '';
      };

      img.src = im.src;
    }

    return () => {
      cancelled = true;
      // отменяем всё, что не догрузилось: onload не выстрелит,
      // decoded-буфер освобождается
      for (const img of pending) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
      }
      pending.clear();
    };
  }, [key, images]);

  return cache;
}