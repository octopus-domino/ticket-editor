import { useRef, useCallback } from 'react';
import type { CanvasElement, Slide } from '../types';

interface GroupDragState {
  id: string;
  startX: number;
  startY: number;
  orig: Record<string, { x: number; y: number }>;
}

interface Args {
  activeSlide: Slide;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  setSlides: React.Dispatch<React.SetStateAction<Slide[]>>;
  activeId: string;
  handleSnap: (e: any, el: CanvasElement) => void;
  setFloatingPos: (p: { x: number; y: number } | null) => void;
}

export function useGroupDrag({
  activeSlide, selectedIds, setSelectedIds, setSlides, activeId, handleSnap, setFloatingPos,
}: Args) {
  const ref = useRef<GroupDragState | null>(null);

  const onDragStart = useCallback((el: CanvasElement, e: any) => {
    setFloatingPos(null);
    const ids = selectedIds.includes(el.id) ? selectedIds : [el.id];
    if (!selectedIds.includes(el.id)) setSelectedIds([el.id]);
    const orig: Record<string, { x: number; y: number }> = {};
    activeSlide.elements.forEach((ee) => {
      if (ids.includes(ee.id)) orig[ee.id] = { x: ee.x, y: ee.y };
    });
    ref.current = {
      id: el.id,
      startX: e.target.x(),
      startY: e.target.y(),
      orig,
    };
  }, [activeSlide, selectedIds, setSelectedIds, setFloatingPos]);

  const onDragMove = useCallback((el: CanvasElement, e: any) => {
    const g = ref.current;
    if (!g) return;
    const dx = e.target.x() - g.startX;
    const dy = e.target.y() - g.startY;

    const newElements = activeSlide.elements.map((ee) => {
      if (!g.orig[ee.id]) return ee;
      if (ee.id === el.id) return ee;
      return { ...ee, x: g.orig[ee.id].x + dx, y: g.orig[ee.id].y + dy };
    });

    setSlides((prev) =>
      prev.map((s) => (s.id !== activeId ? s : { ...s, elements: newElements })),
    );

    if (el.id === g.id) handleSnap(e, el);
  }, [activeSlide, activeId, setSlides, handleSnap]);

  const onDragEnd = useCallback((el: CanvasElement, e: any) => {
    const g = ref.current;
    if (!g) return;
    const dx = e.target.x() - g.startX;
    const dy = e.target.y() - g.startY;

    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s;
        return {
          ...s,
          elements: s.elements.map((ee) => {
            if (!g.orig[ee.id]) return ee;
            if (ee.id === el.id) return { ...ee, x: e.target.x(), y: e.target.y() };
            return { ...ee, x: g.orig[ee.id].x + dx, y: g.orig[ee.id].y + dy };
          }),
        };
      }),
    );
    ref.current = null;
  }, [activeId, setSlides]);

  return { onDragStart, onDragMove, onDragEnd };
}