import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { t, getLocale } from '@/shared/i18n';
import { authStore } from '@/auth/store';
import { useStore } from '@/shared/store/store';
import {
  publicationsApi,
  restoreLocalPublications,
  type PublishedDocument,
  type PublishedSite,
  type PublishedRelease,
} from '../api/publications';
import { pdfUrl, publicUrl, siteUrl } from '../api/journeys';
import { JourneyButton } from './JourneyButton';
import { STATUS_LABELS } from './JourneyBatch';
import '../journeys.css';
import '../../workflows/workflows.css';
import './publications.css';

export default function PublicationsPage() {
  const user = useStore(authStore, (state) => state.user);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'documents' ? 'documents' : params.get('tab') === 'batches' ? 'batches' : 'sites';
  const site = params.get('site') ?? '';
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<PublishedDocument[]>([]);
  const [sites, setSites] = useState<PublishedSite[]>([]);
  const [releases, setReleases] = useState<PublishedRelease[]>([]);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!user) return;
    setReady(false);
    setSites([]);
    setDocuments([]);
    let active = true;
    void restoreLocalPublications()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [user]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setBusy(true);
    setError('');
    const load =
      tab === 'sites' ? publicationsApi.sites(page) : tab === 'batches' ? publicationsApi.batches(page) : publicationsApi.documents(page, site, query);
    void load
      .then((result) => {
        if (!active) return;
        if (tab === 'sites') setSites(result.items as PublishedSite[]);
        else if (tab === 'batches') setReleases(result.items as PublishedRelease[]);
        else setDocuments(result.items as PublishedDocument[]);
        setPages(result.pages);
        setTotal(result.total);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [ready, tab, page, query, site]);
  function select(next: 'sites' | 'documents' | 'batches', slug = '') {
    setPage(0);
    setParams({ tab: next, ...(slug ? { site: slug } : {}) });
  }
  if (!user)
    return (
      <main className="workflow-page">
        <h1>{t('My sites and documents')}</h1>
        <p>{t('Sign in to see your sites and issued documents on any device.')}</p>
        <Link to="/login?next=%2Fapp%2Fpublications">{t('Войти')}</Link>
      </main>
    );
  return (
    <main className="workflow-page publications-page">
      <header className="publications-heading">
        <div>
          <h1>{t('My sites and documents')}</h1>
          <p>{t('Manage your sites and the documents created through them.')}</p>
        </div>
        <Link className="journey-primary" to="/sites/new">
          {t('Create a website')} ↗
        </Link>
      </header>
      <nav className="publications-tabs" aria-label={t('My sites and documents')}>
        <JourneyButton aria-pressed={tab === 'sites'} onClick={() => select('sites')}>
          {t('My sites')}
        </JourneyButton>
        <JourneyButton aria-pressed={tab === 'documents'} onClick={() => select('documents')}>
          {t('My documents')}
        </JourneyButton>
        <JourneyButton aria-pressed={tab === 'batches'} onClick={() => select('batches')}>{t('My releases')}</JourneyButton>
      </nav>
      {tab === 'documents' && (
        <label>
          {t('Search')}
          <input
            value={search}
            maxLength={80}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      )}
      {site && (
        <p>
          {site}{' '}
          <JourneyButton onClick={() => select('documents')}>{t('All documents')}</JourneyButton>
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {(busy || !ready) && !error ? (
        <p role="status">{t('Загрузка…')}</p>
      ) : (
        <>
          <p role="status">{t('Total: {0}', total)}</p>
          {!total && (
            <section className="publications-empty">
              <h2>{t('Nothing published yet')}</h2>
              <p>
                {t(
                  'Create a site or choose a ready-to-use service. Your results will appear here.',
                )}
              </p>
              <Link to="/solutions/">{t('Ready-to-use services')} ↗</Link>
            </section>
          )}
          <div className="publications-list">
            {tab === 'sites'
              ? sites.map(({ site, updatedAt }) => (
                  <article key={site.slug}>
                    <h2>{site.title}</h2>
                    <p>{site.slug}.codoc.site</p>
                    <small>{new Date(updatedAt).toLocaleString(getLocale())}</small>
                    <div className="publications-actions">
                      <a
                        className="journey-button"
                        href={siteUrl(site.slug)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('Open')} ↗
                      </a>
                      <Link
                        className="journey-button"
                        to={`/sites/new?site=${encodeURIComponent(site.slug)}`}
                      >
                        {t('Edit')}
                      </Link>
                      <JourneyButton onClick={() => select('documents', site.slug)}>
                        {t('Site documents')}
                      </JourneyButton>
                    </div>
                  </article>
                ))
              : tab === 'batches' ? releases.map(release => <article key={release.id}>
                  <h2>{release.title}</h2>
                  <p>{t('Documents in release: {0}', release.count)}</p>
                  <small>{new Date(release.createdAt).toLocaleString(getLocale())}</small>
                  <div className="publications-actions"><Link className="journey-button" to={`/issues/${encodeURIComponent(release.id)}`}>{t('Open release management')}</Link></div>
                </article>) : documents.map(({ document, status, siteSlug }) => (
                  <article key={document.id}>
                    <h2>{document.data.recipient || document.title}</h2>
                    <p>
                      {document.title} · {STATUS_LABELS[status.state]}
                      {siteSlug ? ` · ${siteSlug}` : ''}
                    </p>
                    <small>{new Date(document.updatedAt).toLocaleString(getLocale())}</small>
                    <div className="publications-actions">
                      <a
                        className="journey-button"
                        href={publicUrl(document.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('Open')} ↗
                      </a>
                      <a className="journey-button" href={pdfUrl(document.id)}>
                        {t('Скачать PDF ↓')}
                      </a>
                      <Link
                        className="journey-button"
                        to={`/manage/${encodeURIComponent(document.id)}`}
                      >
                        {t('Manage')}
                      </Link>
                    </div>
                  </article>
                ))}
          </div>
          {pages > 1 && (
            <nav className="publications-pagination" aria-label={t('Pages')}>
              <JourneyButton disabled={!page || busy} onClick={() => setPage((value) => value - 1)}>
                {t('Previous')}
              </JourneyButton>
              <span>
                {page + 1} / {pages}
              </span>
              <JourneyButton
                disabled={page + 1 >= pages || busy}
                onClick={() => setPage((value) => value + 1)}
              >
                {t('Next')}
              </JourneyButton>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
