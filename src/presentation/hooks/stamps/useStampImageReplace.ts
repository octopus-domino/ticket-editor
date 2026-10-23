import { useCallback } from 'react';
import type { StampImageItem } from '@/shared/types';
import { loadImage, fitImageSize } from '@/lib/imageTools';

interface Args {
  updateImage: (id: string, patch: Partial<StampImageItem>) => void;
  stampW: number; stampH: number;
}

export function useStampImageReplace({ updateImage, stampW, stampH }: Args) {
  return useCallback((id: string) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const src = reader.result as string;
        try {
          const img = await loadImage(src);
          const { width: iw, height: ih } = fitImageSize(img.naturalWidth || 100, img.naturalHeight || 100, stampW, stampH, 0.5);
          updateImage(id, { src, width: iw, height: ih });
        } catch { updateImage(id, { src }); }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [updateImage, stampW, stampH]);
}