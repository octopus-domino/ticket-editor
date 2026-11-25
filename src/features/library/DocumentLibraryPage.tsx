import { useState, useEffect, useMemo, useRef } from 'react';
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
import { authStore } from '@/auth/store';
import { publicationsApi, restoreLocalPublications, type PublicationPage, type PublishedDocument } from '@/features/journeys/api/publications';

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
  const owner = useStore(authStore, state => state.accessToken ? state.user?.id : undefined);
  const [albumPage, setAlbumPage] = useState(0);
  const albumSearch = search.trim().slice(0, 80);
  const restored = useRef<{ owner: string; ready: Promise<void> }>();
  const [albumResult, setAlbumResult] = useState<{
    owner: string; page: number; search: string; data?: PublicationPage<PublishedDocument>; error?: string;
  }>();
  const albums = albumResult?.owner === owner && albumResult?.page === albumPage
    && albumResult?.search === albumSearch ? albumResult : undefined;
  useEffect(() => {
    if (!mine || !owner) return;
    if (restored.current?.owner !== owner) {
      restored.current = { owner, ready: restoreLocalPublications('ALBUM').catch(() => undefined) };
    }
    const request = new AbortController();
    const ready = restored.current.ready;
    const identity = { owner, page: albumPage, search: albumSearch };
    const timer = window.setTimeout(async () => {
      await ready;
      if (request.signal.aborted) return;
      try {
        const data = await publicationsApi.documents(albumPage, '', albumSearch, { kind: 'ALBUM', signal: request.signal });
        if (!request.signal.aborted) setAlbumResult({ ...identity, data });
      } catch (reason) {
        if (!request.signal.aborted) setAlbumResult({ ...identity, error: (reason as Error).message });
      }
    }, 250);
    return () => { window.clearTimeout(timer); request.abort(); };
  }, [mine, owner, albumPage, albumSearch]);
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
          onChange={(event) => { setSearch(event.target.value); setAlbumPage(0); }}
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
          {albums?.error && <p role="alert">{albums.error}</p>}
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
            {albums?.data?.items.map(({ document }) => (
              <article className="library-card" key={`album-${document.id}`}>
                <div>
                  <h2>{document.title}</h2>
                  <p>{t('Shared photo albums')} · {new Date(document.updatedAt).toLocaleDateString(getLocale())}</p>
                  <Link to={`/manage/${encodeURIComponent(document.id)}`}>{t('Manage')} →</Link>
                </div>
              </article>
            ))}
          </div>
          {albums?.data && albums.data.pages > 1 && (
            <nav className="library-tabs" aria-label={t('Shared photo albums')}>
              <button type="button" disabled={albumPage === 0} onClick={() => setAlbumPage(page => page - 1)}>{t('Previous')}</button>
              <span>{albumPage + 1} / {albums.data.pages}</span>
              <button type="button" disabled={albumPage + 1 >= albums.data.pages} onClick={() => setAlbumPage(page => page + 1)}>{t('Next')}</button>
            </nav>
          )}
          {owner && !albums && !loading && <p role="status">{t('Loading…')}</p>}
          {!documents.length && !albums?.data?.items.length && !loading && (!owner || albums?.data) && <p>{t('No results')}</p>}
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
