/* ============================================================
   presentation/hooks/useAutoFitZoom.ts
   ============================================================ */

import { useEffect } from 'react';

interface Args {
  wrapRef: React.RefObject<HTMLElement>;
  slideWidth: number;
  slideHeight: number;
  setZoom: (z: number) => void;
  padding?: number;
  topReserve?: number;
  minZoom?: number;
  maxZoom?: number;
}

export function useAutoFitZoom({
  wrapRef, slideWidth, slideHeight, setZoom,
  padding = 40, topReserve = 80, minZoom = 0.2, maxZoom = 2,
}: Args) {
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !slideWidth || !slideHeight) return;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      // Отнимаем паддинги и резерв под ZoomBar
      const availableW = Math.max(100, rect.width - padding * 2);
      const availableH = Math.max(100, rect.height - padding * 2 - topReserve);

      const zoomX = availableW / slideWidth;
      const zoomY = availableH / slideHeight;
      const next = Math.max(minZoom, Math.min(maxZoom, Math.min(zoomX, zoomY)));

      setZoom(+next.toFixed(3));
    };

    fit();

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [wrapRef, slideWidth, slideHeight, setZoom, padding, topReserve, minZoom, maxZoom]);
}