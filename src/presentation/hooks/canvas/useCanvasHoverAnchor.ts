import { useCallback, useRef } from 'react';
import type { Slide } from '@/shared/types';
import { useEffect } from 'react';
import { findElementWithPadding } from '@/lib/connectors';
import { hoverStore } from '../../stores/HoverStore';

export function useCanvasHoverAnchor(params: { slide: Slide }) {
  const { slide } = params;
  const slideRef = useRef(slide);
  slideRef.current = slide;

  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); }, []);

  const update = useCallback((_e: any, wx: number, wy: number) => {
    pendingRef.current = { x: wx, y: wy };
    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const p = pendingRef.current;
      if (!p) return;
      pendingRef.current = null;

      const el = findElementWithPadding(slideRef.current.elements, p.x, p.y, 20);
      hoverStore.set(el ? el.id : null);
    });
  }, []);

  return { update };
}
