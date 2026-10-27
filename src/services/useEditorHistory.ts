import { useCallback } from 'react';
import type { Slide } from '../types';
import type { useHistory } from './useHistory';
import type { EditorViewApi } from './useEditorView';

interface SlidesApi {
  slides: Slide[];
  activeId: string;
  setSlides: (s: Slide[]) => void;
  setActiveId: (id: string) => void;
}

interface SelectionApi {
  clear: () => void;
}

interface Args {
  slides: SlidesApi;
  selection: SelectionApi;
  history: ReturnType<typeof useHistory>;
  view: EditorViewApi;
}

/**
 * Undo / redo. Отделено, потому что это отдельная операция,
 * которая очищает выделение и сбрасывает направляющие.
 */
export function useEditorHistory({ slides, selection, history, view }: Args) {
  const undo = useCallback(() => {
    const prev = history.undo();
    if (!prev) return;
    slides.setSlides(prev.slides);
    slides.setActiveId(prev.activeId);
    selection.clear();
    view.clearGuides();
  }, [history, slides, selection, view]);

  const redo = useCallback(() => {
    const next = history.redo();
    if (!next) return;
    slides.setSlides(next.slides);
    slides.setActiveId(next.activeId);
    selection.clear();
    view.clearGuides();
  }, [history, slides, selection, view]);

  return {
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  };
}