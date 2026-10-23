import { useEffect, useRef, useState } from 'react';
import type { StampImageItem } from '@/shared/types';

export function useStampImageCache(images: StampImageItem[]): Record<string, HTMLImageElement> {
  const [cache, setCache] = useState<Record<string, HTMLImageElement>>({});
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const key = images.map((i) => i.src).join('|');

  useEffect(() => {
    let changed = false;
    const next = { ...cacheRef.current };
    
    for (const im of images) {
      if (im.hidden || next[im.src]) continue;
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = im.src;
      img.onload = () => {
        setCache((prev) => ({ ...prev, [im.src]: img }));
      };
      changed = true;
    }
    
    if (changed) setCache(next);
  }, [key, images]);

  return cache;
}