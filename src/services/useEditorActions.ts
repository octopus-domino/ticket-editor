import { useCallback } from 'react';
import type { CanvasElement, LineElement } from '../types';
import type { useHistory } from './useHistory';
import type { EditorViewApi } from './useEditorView';

interface SlidesApi {
  slides: any[];
  activeId: string;
  activeSlide: any;
  setSlides: (s: any[]) => void;
  moveLayer: (id: string, dir: 1 | -1) => void;
}

interface SelectionApi {
  selectedIds: string[];
  selectedId: string | null;
  setSelectedIds: (ids: string[]) => void;
  clear: () => void;
}

interface Args {
  slides: SlidesApi;
  selection: SelectionApi;
  history: ReturnType<typeof useHistory>;
  view: EditorViewApi;
}

/**
 * Операции с элементами активного слайда:
 * update, add, remove, moveLayer, anchors.
 */
export function useEditorActions({ slides, selection, history, view }: Args) {
  const removeSelected = useCallback(() => {
    if (!selection.selectedIds.length) return;
    const newSlides = slides.slides.map((s) =>
      s.id !== slides.activeId
        ? s
        : { ...s, elements: s.elements.filter((e: CanvasElement) => !selection.selectedIds.includes(e.id)) },
    );
    slides.setSlides(newSlides);
    history.push(newSlides, slides.activeId);
    selection.clear();
    view.setFloatingPos(null);
  }, [selection, slides, history, view]);

  const updateWithHistory = useCallback((id: string, patch: Partial<CanvasElement>) => {
    const newSlides = slides.slides.map((s) =>
      s.id !== slides.activeId
        ? s
        : {
            ...s,
            elements: s.elements.map((el: CanvasElement) =>
              el.id === id ? ({ ...el, ...patch } as CanvasElement) : el,
            ),
          },
    );
    slides.setSlides(newSlides);
    history.push(newSlides, slides.activeId);
  }, [slides, history]);

  const addElementWithHistory = useCallback((el: CanvasElement) => {
    const newSlides = slides.slides.map((s) =>
      s.id !== slides.activeId ? s : { ...s, elements: [...s.elements, el] },
    );
    slides.setSlides(newSlides);
    selection.setSelectedIds([el.id]);
    history.push(newSlides, slides.activeId);
  }, [slides, selection, history]);

  const moveLayer = useCallback((dir: 1 | -1) => {
    if (!selection.selectedId) return;
    slides.moveLayer(selection.selectedId, dir);
  }, [selection.selectedId, slides]);

  const updateSelected = useCallback((patch: Partial<CanvasElement>) => {
    if (!selection.selectedId) return;
    updateWithHistory(selection.selectedId, patch);
  }, [selection.selectedId, updateWithHistory]);

  const appendAnchor = useCallback((el: LineElement) => {
    const pts = el.points && el.points.length >= 4
      ? el.points
      : [0, el.height / 2, el.width, el.height / 2];
    const lastX = pts[pts.length - 2];
    const lastY = pts[pts.length - 1];
    const prevX = pts[pts.length - 4];
    const prevY = pts[pts.length - 3];
    const dx = lastX - prevX;
    const dy = lastY - prevY;
    updateWithHistory(el.id, { points: [...pts, lastX + dx, lastY + dy] });
  }, [updateWithHistory]);

  const removeLastAnchor = useCallback((el: LineElement) => {
    const pts = el.points && el.points.length >= 4 ? el.points : [];
    if (pts.length <= 4) return;
    updateWithHistory(el.id, { points: pts.slice(0, pts.length - 2) });
  }, [updateWithHistory]);

  return {
    removeSelected,
    updateWithHistory,
    addElementWithHistory,
    moveLayer,
    updateSelected,
    appendAnchor,
    removeLastAnchor,
  };
}

export type EditorActionsApi = ReturnType<typeof useEditorActions>;