import { useCallback, useState } from 'react';
import type { StampShapeItem, StampTextItem, StampImageItem } from '@/shared/types';

interface Snapshot { shapes: StampShapeItem[]; texts: StampTextItem[]; images: StampImageItem[]; }

interface Args {
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images: StampImageItem[];
  commit: (s: StampShapeItem[], t: StampTextItem[], i: StampImageItem[]) => void;
  replace: (next: Snapshot) => void;
}

export function useStampTextEditor({ shapes, texts, images, commit, replace }: Args) {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const openTextEditor = useCallback((id: string) => {
    if (editingTextId === id) return;
    commit(shapes, texts, images);
    setEditingTextId(id);
  }, [editingTextId, shapes, texts, images, commit]);

  const changeEditingText = useCallback((value: string) => {
    if (!editingTextId) return;
    replace({ shapes, texts: texts.map((t) => (t.id === editingTextId ? { ...t, text: value } : t)), images });
  }, [editingTextId, shapes, texts, images, replace]);

  const closeTextEditor = useCallback(() => {
    if (!editingTextId) return;
    commit(shapes, texts, images);
    setEditingTextId(null);
  }, [editingTextId, shapes, texts, images, commit]);

  return { editingTextId, openTextEditor, changeEditingText, closeTextEditor };
}