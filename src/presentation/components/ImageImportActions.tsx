import { useCallback, useId, useState } from 'react';
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
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const close = useCallback(() => {
    setOpen(false);
    setSlide(null);
  }, []);

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
      <button type="button" className="toolbar-btn" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        {t('Import image or PDF')}
      </button>
      {open &&
          <div className="image-import-inline">
            <div
              className="image-import-dialog"
              role="region"
              aria-labelledby={titleId}
            >
              <div className="image-import-header">
                <h2 id={titleId}>{t('Import image or PDF')}</h2>
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
          </div>}
    </>
  );
}
