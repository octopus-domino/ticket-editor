// src/presentation/hooks/stamps/useStampImageUpload.ts
import { useCallback } from 'react';
import type {
  StampShapeItem, StampTextItem, StampImageItem,
} from '@/shared/types';
import { createImage } from '@/lib/stamps/factories';
import { loadImage, makeImageTransparent, fitImageSize } from '@/lib/imageTools';

interface Args {
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images: StampImageItem[];
  width: number;
  height: number;
  commit: (s: StampShapeItem[], t: StampTextItem[], i: StampImageItem[]) => void;
  select: (id: string | null, type: 'shape' | 'text' | 'image') => void;
}

export function useStampImageUpload({
  shapes, texts, images, width, height, commit, select,
}: Args) {
  return useCallback((transparent: boolean) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        let src = reader.result as string;
        if (transparent) {
          try {
            src = await makeImageTransparent(src, { keyColor: 'auto', tolerance: 30 });
          } catch (err) {
            // chroma-key опционален: при ошибке используем исходное изображение
            console.warn('[useStampImageUpload] chroma-key failed:', err);
          }
        }
        let nw = 100;
        let nh = 100;
        try {
          const img = await loadImage(src);
          nw = img.naturalWidth || 100;
          nh = img.naturalHeight || 100;
        } catch (err) {
          // метаданные картинки недоступны — берём дефолтный размер
          console.warn('[useStampImageUpload] loadImage failed:', err);
        }
        const { width: iw, height: ih } = fitImageSize(nw, nh, width, height, 0.5);
        const im = createImage(src, iw, ih, width, height);
        commit(shapes, texts, [...images, im]);
        select(im.id, 'image');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [shapes, texts, images, width, height, commit, select]);
}