import { useEffect } from 'react';

interface Args {
  /** Ref на контейнер холста */
  wrapRef: React.RefObject<HTMLElement>;
  /** Размер активного слайда */
  slideWidth: number;
  slideHeight: number;
  /** Текущая функция установки зума */
  setZoom: (z: number | ((prev: number) => number)) => void;
  /** Отступы внутри wrap (совпадают с padding в CSS) */
  padding?: number;
  /** Резерв под sticky zoom-bar */
  topReserve?: number;
  /** Минимальный и максимальный зум */
  minZoom?: number;
  maxZoom?: number;
  /** Срабатывает ли авто-фит при resize окна */
  refitOnResize?: boolean;
}

/**
 * Подгоняет zoom так, чтобы слайд целиком влезал в видимую область холста.
 * Работает:
 *  - на маунт
 *  - при смене размера/ориентации слайда
 *  - при resize окна (если refitOnResize = true)
 */
export function useAutoFitZoom({
  wrapRef,
  slideWidth,
  slideHeight,
  setZoom,
  padding = 40,
  topReserve = 60,
  minZoom = 0.2,
  maxZoom = 2,
  refitOnResize = true,
}: Args) {
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !slideWidth || !slideHeight) return;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const availableW = Math.max(100, rect.width - padding * 2);
      const availableH = Math.max(100, rect.height - padding * 2 - topReserve);

      const zoomX = availableW / slideWidth;
      const zoomY = availableH / slideHeight;
      const next = Math.max(minZoom, Math.min(maxZoom, Math.min(zoomX, zoomY)));

      setZoom(+next.toFixed(3));
    };

    // Первый расчёт — сразу
    fit();

    if (!refitOnResize) return;

    // На resize — с небольшой задержкой, чтобы не дёргалось
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
  }, [wrapRef, slideWidth, slideHeight, setZoom, padding, topReserve, minZoom, maxZoom, refitOnResize]);
}