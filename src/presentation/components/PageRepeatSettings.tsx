import { t } from '@/shared/i18n';
import { useStore } from '@/shared/store/store';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { useDocumentStore } from '../providers/EditorProvider';

/** Pagination is part of the template, shared by albums, cards and other array-based documents. */
export function PageRepeatSettings() {
  const document = useDocumentStore();
  const slide = useStore(document, state => state.slides.find(item => item.id === state.activeId));
  const schema = useStore(schemaStore, state => state.schemas.find(item => item.id === state.activeId));
  if (!slide) return null;
  const arrays = schema?.fields.filter(field => field.type === 'array') ?? [];
  if (!arrays.length && !slide.repeat) return null;
  const change = (path: string, pageSize: number) => document.commit(draft => {
    const page = draft.slides.find(item => item.id === slide.id);
    if (page) page.repeat = path ? { path, pageSize } : undefined;
  }, 'page-repetition');
  return <details className="page-repeat-settings">
    <summary>{t('Repeat this page for a list')}</summary>
    <label>{t('List in the data model')}
      <select className="field" value={slide.repeat?.path ?? ''} onChange={event => change(event.target.value, slide.repeat?.pageSize ?? 1)}>
        <option value="">{t('Do not repeat')}</option>
        {slide.repeat && !arrays.some(field => field.path === slide.repeat!.path) && <option value={slide.repeat.path}>{slide.repeat.path}</option>}
        {arrays.map(field => <option key={field.path} value={field.path}>{field.label || field.path}</option>)}
      </select>
    </label>
    {slide.repeat && <>
      <label>{t('Items per page')}<input type="number" min={1} max={100} className="field" value={slide.repeat.pageSize}
        onChange={event => { const count = Number(event.target.value); if (Number.isInteger(count) && count >= 1 && count <= 100) change(slide.repeat!.path, count); }} /></label>
      <p>{t('Bind objects to list items starting at index 0. New pages are added automatically for the remaining items.')}</p>
    </>}
  </details>;
}
