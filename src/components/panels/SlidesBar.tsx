import React from 'react';
import type { EditorApi } from '../../hooks/useEditor';
import { SlideThumb } from '../../SlideThumb';

interface Props {
  editor: EditorApi;
}

export const SlidesBar: React.FC<Props> = ({ editor }) => (
  <footer className="slides">
    {editor.slides.map((s, i) => (
      <SlideThumb
        key={s.id}
        slide={s}
        index={i}
        active={s.id === editor.activeId}
        onClick={() => {
          editor.setActiveId(s.id);
          editor.clearSelection();
          editor.setFloatingPos(null);
          editor.setGuides({ v: [], h: [] });
        }}
        onDelete={() => editor.removeSlide(s.id)}
      />
    ))}
    <button className="add-slide" onClick={editor.addSlide}>
      + Слайд
    </button>
  </footer>
);