import { useCallback } from 'react';
import type { StampShapeItem, StampTextItem, StampImageItem } from '@/shared/types';

type LayerKind = 'shape' | 'text' | 'image';

interface Args {
  shapes: StampShapeItem[]; texts: StampTextItem[]; images: StampImageItem[];
  selectedId: string | null;
  commit: (s: StampShapeItem[], t: StampTextItem[], i: StampImageItem[]) => void;
  clearSelection: () => void;
}

export function useStampLayerActions({ shapes, texts, images, selectedId, commit, clearSelection }: Args) {
  const toggleHidden = useCallback((id: string, type: LayerKind) => {
    if (type === 'shape') commit(shapes.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)), texts, images);
    else if (type === 'text') commit(shapes, texts.map((t) => (t.id === id ? { ...t, hidden: !t.hidden } : t)), images);
    else commit(shapes, texts, images.map((im) => (im.id === id ? { ...im, hidden: !im.hidden } : im)));
  }, [shapes, texts, images, commit]);

  const toggleLocked = useCallback((id: string, type: LayerKind) => {
    if (type === 'shape') commit(shapes.map((s) => (s.id === id ? { ...s, locked: !s.locked } : s)), texts, images);
    else if (type === 'text') commit(shapes, texts.map((t) => (t.id === id ? { ...t, locked: !t.locked } : t)), images);
    else commit(shapes, texts, images.map((im) => (im.id === id ? { ...im, locked: !im.locked } : im)));
  }, [shapes, texts, images, commit]);

  const removeLayer = useCallback((id: string, type: LayerKind) => {
    if (type === 'shape') commit(shapes.filter((s) => s.id !== id), texts, images);
    else if (type === 'text') commit(shapes, texts.filter((t) => t.id !== id), images);
    else commit(shapes, texts, images.filter((im) => im.id !== id));
    if (selectedId === id) clearSelection();
  }, [shapes, texts, images, selectedId, commit, clearSelection]);

  const reorder = useCallback((id: string, type: LayerKind, dir: 1 | -1) => {
    const swap = <T extends { id: string }>(arr: T[]): T[] => {
      const i = arr.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return arr;
      const copy = [...arr]; [copy[i], copy[j]] = [copy[j], copy[i]]; return copy;
    };
    if (type === 'shape') commit(swap(shapes), texts, images);
    else if (type === 'text') commit(shapes, swap(texts), images);
    else commit(shapes, texts, swap(images));
  }, [shapes, texts, images, commit]);

  return { toggleHidden, toggleLocked, removeLayer, reorder };
}