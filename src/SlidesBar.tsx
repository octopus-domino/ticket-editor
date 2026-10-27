import React from 'react';
import { useSlidesContext } from '../../editor/contexts/SlidesContext';
import { useSelectionContext } from '../../editor/contexts/SelectionContext';
import { useViewContext } from '../../editor/contexts/ViewContext';
import { SlideThumb } from '../../SlideThumb';

const SlidesBarInner: React.FC = () => {
  const slides = useSlidesContext();
  const selection = useSelectionContext();
  const view = useViewContext();

  return (
    <footer className="slides">
      {slides.slides.map((s, i) => (
        <SlideThumb
          key={s.id}
          slide={s}
          index={i}
          active={s.id === slides.activeId}
          onClick={() => {
            slides.setActiveId(s.id);
            selection.clearSelection();
            view.setGuides({ v: [], h: [] });
          }}
          onDelete={() => slides.removeSlide(s.id)}
        />
      ))}
      <button className="add-slide" onClick={slides.addSlide}>
        + Слайд
      </button>
    </footer>
  );
};

export const SlidesBar = React.memo(SlidesBarInner);