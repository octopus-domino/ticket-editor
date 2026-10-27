import React from 'react';
import { StampEditor } from './stamps/StampEditor';
import { DrawioModal } from './diagram/DrawioModal';
import { useModalsContext } from '../editor/contexts/ModalsContext';
import { useSlidesContext } from '../editor/contexts/SlidesContext';

export const EditorModals: React.FC = () => {
  const modals = useModalsContext();
  const slides = useSlidesContext();

  return (
    <>
      {modals.stampEditorTarget && (() => {
        const el = slides.activeSlide.elements.find(
          (e) => e.id === modals.stampEditorTarget,
        );
        if (!el || el.type !== 'stamp') return null;
        const s = el as any;
        return (
          <StampEditor
            initialWidth={s.width}
            initialHeight={s.height}
            initialShapes={s.shapes || []}
            initialTexts={s.texts || []}
            initialImages={s.images || []}
            initialName={s.name || 'Штамп'}
            onSave={modals.saveStampEditor}
            onCancel={modals.closeStampEditor}
          />
        );
      })()}

      {modals.diagramEditorTarget && (() => {
        const el = slides.activeSlide.elements.find(
          (e) => e.id === modals.diagramEditorTarget,
        );
        if (!el || el.type !== 'diagram') return null;
        const d = el as any;
        return (
          <DrawioModal
            initialXml={d.xml}
            onSave={(svg, xml) => modals.saveDiagramEditor(svg, xml)}
            onCancel={modals.closeDiagramEditor}
          />
        );
      })()}
    </>
  );
};