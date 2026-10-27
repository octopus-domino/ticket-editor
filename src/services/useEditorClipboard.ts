import { useState, useCallback } from 'react';
import type { CanvasElement } from '../types';
import { uid } from '../lib/uid';
import type { useHistory } from './useHistory';
import type { EditorViewApi } from './useEditorView';
import type { EditorActionsApi } from './useEditorActions';

interface SlidesApi {
  slides: any[];
  activeId: string;
  activeSlide: any;
  setSlides: (s: any[]) => void;
}

interface SelectionApi {
  selectedIds: string[];
  selectedId: string | null;
  selected: CanvasElement | null;
  setSelectedIds: (ids: string[]) => void;
}

interface Args {
  slides: SlidesApi;
  selection: SelectionApi;
  history: ReturnType<typeof useHistory>;
  view: EditorViewApi;
  actions: EditorActionsApi;
}

const PASTE_OFFSET = 20;

/**
 * Буфер обмена и стиль: copy / cut / paste / duplicate / copyStyle / applyStyle.
 */
export function useEditorClipboard({ slides, selection, history, view, actions }: Args) {
  const [clipboard, setClipboard] = useState<CanvasElement[]>([]);

  const copy = useCallback(() => {
    const els = slides.activeSlide.elements.filter((el: CanvasElement) =>
      selection.selectedIds.includes(el.id),
    );
    if (els.length) setClipboard(JSON.parse(JSON.stringify(els)));
  }, [slides.activeSlide, selection.selectedIds]);

  const cut = useCallback(() => {
    const els = slides.activeSlide.elements.filter((el: CanvasElement) =>
      selection.selectedIds.includes(el.id),
    );
    if (els.length) {
      setClipboard(JSON.parse(JSON.stringify(els)));
      actions.removeSelected();
    }
  }, [slides.activeSlide, selection.selectedIds, actions]);

  const paste = useCallback(() => {
    if (!clipboard.length) return;
    const pasted = clipboard.map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: uid(),
      x: el.x + PASTE_OFFSET,
      y: el.y + PASTE_OFFSET,
    }));
    const newSlides = slides.slides.map((s) =>
      s.id !== slides.activeId ? s : { ...s, elements: [...s.elements, ...pasted] },
    );
    slides.setSlides(newSlides);
    selection.setSelectedIds(pasted.map((el) => el.id));
    history.push(newSlides, slides.activeId);
  }, [clipboard, slides, selection, history]);

  const duplicate = useCallback(() => {
    const els = slides.activeSlide.elements.filter((el: CanvasElement) =>
      selection.selectedIds.includes(el.id),
    );
    if (!els.length) return;
    const pasted = els.map((el: CanvasElement) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: uid(),
      x: el.x + PASTE_OFFSET,
      y: el.y + PASTE_OFFSET,
    }));
    const newSlides = slides.slides.map((s) =>
      s.id !== slides.activeId ? s : { ...s, elements: [...s.elements, ...pasted] },
    );
    slides.setSlides(newSlides);
    selection.setSelectedIds(pasted.map((el) => el.id));
    history.push(newSlides, slides.activeId);
  }, [slides, selection, history]);

  const copyStyle = useCallback(() => {
    const el = selection.selected;
    if (!el) return;
    const { id, x, y, rotation, type, ...style } = el as any;
    view.setCopiedStyle(style);
  }, [selection.selected, view]);

  const applyStyle = useCallback(() => {
    if (!selection.selectedId || !view.copiedStyle) return;
    actions.updateWithHistory(selection.selectedId, view.copiedStyle);
    view.setCopiedStyle(null);
  }, [selection.selectedId, view, actions]);

  return { copy, cut, paste, duplicate, copyStyle, applyStyle };
}

export type EditorClipboardApi = ReturnType<typeof useEditorClipboard>;