import React from 'react';
import { useStore } from '@/shared/store/store';
import { useDocumentStore, useSelectionStore } from '../providers/EditorProvider';
import { createSlide, cloneSlide } from '@/domain/slide/operations';

export const SlidesBar: React.FC = () => {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const slides = useStore(docStore, (s) => s.slides);
  const activeId = useStore(docStore, (s) => s.activeId);

  const addSlide = () => {
    const current = slides.find((s) => s.id === activeId);
    const next = createSlide(
      slides.length + 1,
      current?.format ?? 'a4',
      current?.orientation ?? 'portrait',
      undefined,
      current?.padding,
    );
    docStore.commit((draft) => {
      draft.slides.push(next);
      draft.activeId = next.id;
    }, 'add-slide');
    selStore.clear();
  };

  const duplicateSlide = (id: string) => {
    const src = slides.find((s) => s.id === id);
    if (!src) return;
    const clone = cloneSlide(src);
    docStore.commit((draft) => {
      draft.slides.push(clone);
      draft.activeId = clone.id;
    }, 'dup-slide');
    selStore.clear();
  };

  const removeSlide = (id: string) => {
    if (slides.length <= 1) return;
    docStore.commit((draft) => {
      const i = draft.slides.findIndex((s) => s.id === id);
      if (i < 0) return;
      draft.slides.splice(i, 1);
      if (draft.activeId === id) draft.activeId = draft.slides[0].id;
    }, 'remove-slide');
    selStore.clear();
  };

  const setActive = (id: string) => {
    docStore.setState((s) => ({ ...s, activeId: id }));
    selStore.clear();
  };

  return (
    <footer className="slides-panel">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`slide-thumb ${s.id === activeId ? 'active' : ''}`}
          onClick={() => setActive(s.id)}
          onDoubleClick={() => duplicateSlide(s.id)}
        >
          {i + 1}
          {slides.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); removeSlide(s.id); }}
              style={{ position: 'absolute', top: 2, right: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >×</button>
          )}
        </div>
      ))}
      <button className="add-slide" onClick={addSlide}>+ Слайд</button>
    </footer>
  );
};