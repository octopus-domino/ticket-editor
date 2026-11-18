import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { Slide } from '@/shared/types';
import { t } from '@/shared/i18n';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { ImageTemplateImport } from '@/features/image-template/ui/ImageTemplateImport';
import { useDocumentStore, useSelectionStore } from '../providers/EditorProvider';
import './image-import-actions.css';

/** Recognition prepares a draft; only an explicit apply mutates the current document. */
export function ImageImportActions() {
  const docStore = useDocumentStore();
  const selection = useSelectionStore();
  const [open, setOpen] = useState(false);
  const [slide, setSlide] = useState<Slide | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setSlide(null);
    setSlides([]);
  }, []);
  useFocusTrap(dialogRef, open, close);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function apply() {
    if (!slide || busy) return;
    docStore.commit((draft) => {
      draft.slides.push(...(slides.length ? slides : [slide]));
      draft.activeId = slide.id;
      draft.bindings = resolveBindings(draft.slides, draft.bindings);
    });
    selection.clear();
    close();
  }

  return (
    <>
      <button type="button" className="toolbar-btn" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        {t('Import image or PDF')}
      </button>
      {open && createPortal(
          <div className="image-import-backdrop" onMouseDown={event => {
            if (event.currentTarget === event.target) close();
          }}>
            <div
              className="image-import-dialog"
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="image-import-header">
                <h2 id={titleId}>{t('Import image or PDF')}</h2>
                <button type="button" onClick={close}>
                  {t('Close')}
                </button>
              </div>
              <div className="image-import-content">
                <ImageTemplateImport onDraft={setSlide} onSlides={setSlides} onBusy={setBusy} context="document" />
              </div>
              <div className="image-import-footer">
                <button type="button" disabled={!slide || busy} onClick={apply}>
                  {t('Add as a new slide')}
                  {slides.length > 1 && ` (${slides.length})`}
                </button>
                <p>{t('Existing slides are kept. You can undo the import.')}</p>
              </div>
            </div>
          </div>, document.body)}
    </>
  );
}
