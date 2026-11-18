/* ============================================================
   presentation/hooks/useAutoFitZoom.ts
   ============================================================ */

import { useEffect } from 'react';
import { COMPACT_EDITOR_MAX_WIDTH } from '@/shared/mobile/panels';

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
  padding = 16, topReserve = 48, minZoom = 0.2, maxZoom = 2,
}: Args) {
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !slideWidth || !slideHeight) return;

    const fit = () => {
      // Отнимаем паддинги и резерв под ZoomBar
      const availableW = Math.max(100, wrap.clientWidth - padding * 2);
      const availableH = Math.max(100, wrap.clientHeight - padding * 2 - topReserve);

      const zoomX = availableW / slideWidth;
      const zoomY = availableH / slideHeight;
      const fitted = window.innerWidth <= COMPACT_EDITOR_MAX_WIDTH ? zoomX : Math.min(zoomX, zoomY);
      const next = Math.max(minZoom, Math.min(maxZoom, fitted));

      setZoom(+next.toFixed(3));
    };

    fit();

    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };

    window.addEventListener('resize', onResize);
    const observer = new ResizeObserver(onResize);
    observer.observe(wrap);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, [wrapRef, slideWidth, slideHeight, setZoom, padding, topReserve, minZoom, maxZoom]);
}
