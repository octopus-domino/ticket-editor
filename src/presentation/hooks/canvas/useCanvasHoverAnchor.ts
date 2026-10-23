/* ============================================================
   presentation/hooks/canvas/useCanvasHoverAnchor.ts

   REG-B3: пишет в hoverStore, не в React state.
   Canvas больше не перерендеривается на hover.
   ============================================================ */

import { useCallback, useRef } from 'react';
import type { Slide } from '@/shared/types';
import { findElementWithPadding } from '@/lib/connectors';
import { hoverStore } from '../../stores/HoverStore';

export function useCanvasHoverAnchor(params: { slide: Slide }) {
  const { slide } = params;
  const slideRef = useRef(slide);
  slideRef.current = slide;

  const update = useCallback((_e: any, wx: number, wy: number) => {
    const el = findElementWithPadding(slideRef.current.elements, wx, wy, 20);
    hoverStore.set(el ? el.id : null);
  }, []);

  return { update };
}