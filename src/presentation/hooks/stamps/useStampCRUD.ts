import { useCallback } from 'react';
import type { StampShapeItem, StampTextItem, StampImageItem } from '@/shared/types';
import { uid } from '@/lib/uid';

type SelectionType = 'shape' | 'text' | 'image' | null;

interface Args {
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images: StampImageItem[];
  selectedId: string | null;
  selectedType: SelectionType;
  commit: (s: StampShapeItem[], t: StampTextItem[], i: StampImageItem[]) => void;
  select: (id: string | null, type: SelectionType) => void;
  clearSelection: () => void;
}

const PASTE_OFFSET = 12;

export function useStampCRUD({
  shapes, texts, images, selectedId, selectedType, commit, select, clearSelection,
}: Args) {
  const deleteSelected = useCallback(() => {
    if (!selectedId || !selectedType) return;
    if (selectedType === 'shape') {
      commit(shapes.filter((s) => s.id !== selectedId), texts, images);
    } else if (selectedType === 'text') {
      commit(shapes, texts.filter((t) => t.id !== selectedId), images);
    } else {
      commit(shapes, texts, images.filter((im) => im.id !== selectedId));
    }
    clearSelection();
  }, [selectedId, selectedType, shapes, texts, images, commit, clearSelection]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId || !selectedType) return;
    const off = PASTE_OFFSET;

    if (selectedType === 'shape') {
      const s = shapes.find((x) => x.id === selectedId);
      if (!s) return;
      const c: StampShapeItem = { ...JSON.parse(JSON.stringify(s)), id: uid(), x: s.x + off, y: s.y + off };
      commit([...shapes, c], texts, images);
      select(c.id, 'shape');
    } else if (selectedType === 'text') {
      const t = texts.find((x) => x.id === selectedId);
      if (!t) return;
      const c: StampTextItem = { ...JSON.parse(JSON.stringify(t)), id: uid() };
      if (c.mode === 'straight') { c.x += off; c.y += off; }
      else { c.arcCx += off; c.arcCy += off; }
      commit(shapes, [...texts, c], images);
      select(c.id, 'text');
    } else {
      const im = images.find((x) => x.id === selectedId);
      if (!im) return;
      const c: StampImageItem = { ...JSON.parse(JSON.stringify(im)), id: uid(), x: im.x + off, y: im.y + off };
      commit(shapes, texts, [...images, c]);
      select(c.id, 'image');
    }
  }, [selectedId, selectedType, shapes, texts, images, commit, select]);

  return { deleteSelected, duplicateSelected };
}