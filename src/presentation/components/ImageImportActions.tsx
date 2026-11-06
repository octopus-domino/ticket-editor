import { useCallback, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Slide } from '@/shared/types';
import { t } from '@/shared/i18n';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { ImageTemplateImport } from '@/features/image-template/ui/ImageTemplateImport';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useDocumentStore, useSelectionStore } from '../providers/EditorProvider';
import './image-import-actions.css';

/** Recognition prepares a draft; only an explicit apply mutates the current document. */
export function ImageImportActions() {
  const docStore = useDocumentStore();
  const selection = useSelectionStore();
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState<Slide | null>(null);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useCallback(() => {
    setOpen(false);
    setSlide(null);
  }, []);
  useFocusTrap(root, open, close);

  function apply() {
    if (!slide || busy) return;
    docStore.commit((draft) => {
      draft.slides.push(slide);
      draft.activeId = slide.id;
      draft.bindings = resolveBindings(draft.slides, draft.bindings);
    });
    selection.clear();
    close();
  }

  return (
    <>
      <button type="button" className="toolbar-btn" onClick={() => setOpen(true)}>
        {t('Import from image')}
      </button>
      {open &&
        createPortal(
          <div className="image-import-backdrop">
            <div
              ref={root}
              className="image-import-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="image-import-header">
                <h2 id={titleId}>{t('Import from image')}</h2>
                <button type="button" onClick={close}>
                  {t('Close')}
                </button>
              </div>
              <ImageTemplateImport onDraft={setSlide} onBusy={setBusy} context="document" />
              <div className="image-import-footer">
                <button type="button" disabled={!slide || busy} onClick={apply}>
                  {t('Add as a new slide')}
                </button>
                <p>{t('Existing slides are kept. You can undo the import.')}</p>
              </div>
            </div>
          </div>,
          window.document.body,
        )}
    </>
  );
}
