import { useEffect, useState } from 'react';

export interface CanvasWrapSize { w: number; h: number; }

export function useStampCanvasWrap(
  ref: React.RefObject<HTMLElement>,
  fallback: CanvasWrapSize = { w: 800, h: 600 },
): CanvasWrapSize {
  const [size, setSize] = useState<CanvasWrapSize>(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}