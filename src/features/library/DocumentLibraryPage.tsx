import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DOCUMENT_PRESETS } from '../../templates/catalog';
import { t, useLocale, getLocale } from '@/shared/i18n';
import type { Slide } from '@/shared/types';
import { workspaceStore } from '@/workspace/store';
import { useStore } from '@/shared/store/store';
import type { TreeNode } from '@/workspace/types';
import './product-library.css';
import { productGoal } from '@/shared/analytics/ProductMetrics';
import { serializeSlideToSvg } from '@/lib/svg/serialize';

export function DocumentPreview({ slide }: { slide: Slide }) {
  const preview = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializeSlideToSvg(slide))}`,
    [slide],
  );
  return <img className="document-preview" src={preview} alt="" loading="lazy" />;
}
export function DocumentLibraryPage() {
  useEffect(()=>productGoal('library_opened',{kind:'documents'}),[]);
  const locale = useLocale();
  const catalog = useMemo(() => {
    void locale;
    return DOCUMENT_PRESETS.map((preset) => ({ ...preset, slide: preset.build()[0] }));
  }, [locale]);
  const [params, setParams] = useSearchParams();
  const mine = params.get('view') === 'mine';
  const tree = useStore(workspaceStore, (state) => state.tree);
  const loading = useStore(workspaceStore, (state) => state.loading);
  const error = useStore(workspaceStore, (state) => state.error);
  useEffect(() => {
    void workspaceStore.refresh();
  }, []);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const presets = catalog.filter(
    (preset) =>
      (!category || category === preset.category) &&
      t(preset.name).toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const flatten = (nodes: TreeNode[]): TreeNode[] =>
    nodes.flatMap((node) => (node.type === 'folder' ? flatten(node.children) : [node]));
  const documents = flatten(tree).filter((document) =>
    document.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  return (
    <section className="product-library">
      <header>
        <div>
          <h1>{t('Document library')}</h1>
          <p>{t('Choose a starting point. Every layout is fully editable.')}</p>
        </div>
        <Link to="/app/templates/new">{t('Blank document')} +</Link>
        <Link to="/app/templates/new?preset=__image__">{t('Create from image')}</Link>
      </header>
      <nav className="library-tabs" aria-label={t('Library')}>
        <button type="button" aria-pressed={!mine} onClick={() => setParams({})}>
          {t('Ready-made layouts')}
        </button>
        <button type="button" aria-pressed={mine} onClick={() => setParams({ view: 'mine' })}>
          {t('My documents')}
        </button>
        <Link to="/app/stamps">{t('Stamps')}</Link>
      </nav>
      <div className="library-filters">
        <input
          aria-label={t('Search layouts')}
          placeholder={t('Search layouts')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label={t('Category')}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">{t('All categories')}</option>
          {['business', 'marketing', 'events', 'personal'].map((value) => (
            <option key={value} value={value}>
              {t(value)}
            </option>
          ))}
        </select>
      </div>
      {mine ? (
        <>
          <p>{t('Documents and layouts are stored together in your folders.')}</p>
          {loading && <p>{t('Loading…')}</p>}
          {error && <p role="alert">{error}</p>}
          <div className="library-grid">
            {documents.map((document) => (
              <article className="library-card" key={document.id}>
                <div>
                  <h2>{document.name}</h2>
                  <p>
                    {document.updatedAt
                      ? new Date(document.updatedAt).toLocaleDateString(getLocale())
                      : ''}
                  </p>
                  <Link
                    to={
                      document.type === 'template'
                        ? `/app/templates/${document.id}/edit`
                        : `/app/editor/${document.id}`
                    }
                  >
                    {t('Edit')} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!documents.length && !loading && <p>{t('No results')}</p>}
        </>
      ) : (
        <>
          <div className="library-grid">
            {presets.map((preset) => (
              <article className="library-card" key={preset.id}>
                <DocumentPreview slide={preset.slide} />
                <div>
                  <h2>{t(preset.name)}</h2>
                  <p>{t(preset.size)}</p>
                  <Link to={`/app/templates/new?preset=${preset.id}`}>
                    {t('Use this layout')} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {!presets.length && <p>{t('No results')}</p>}
        </>
      )}
    </section>
  );
}
