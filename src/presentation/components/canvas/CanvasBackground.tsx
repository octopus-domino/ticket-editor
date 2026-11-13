import { useEffect, useState } from 'react';
import { Image as CanvasImage } from 'react-konva';

/** Backgrounds belong below all editable objects and never intercept pointer or touch events. */
export function CanvasBackground({ src, width, height }: { src?: string; width: number; height: number }) {
  const [loaded, setLoaded] = useState<{ src: string; image: HTMLImageElement } | null>(null);
  useEffect(() => {
    if (!src) return;
    let active = true;
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => { if (active) setLoaded({ src, image }); };
    image.src = src;
    return () => { active = false; image.onload = null; };
  }, [src]);
  if (!loaded || loaded.src !== src) return null;
  const image = loaded.image;
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const cropWidth = width / scale, cropHeight = height / scale;
  return <CanvasImage name="slide-background-image" image={image} width={width} height={height}
    crop={{ x: (image.naturalWidth - cropWidth) / 2, y: (image.naturalHeight - cropHeight) / 2, width: cropWidth, height: cropHeight }}
    listening={false} />;
}
