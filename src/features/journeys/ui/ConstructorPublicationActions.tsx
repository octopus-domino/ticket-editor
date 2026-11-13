import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { journeyRequest, managementKey, rememberKey } from '../api/journeys';
import type { CreatedJourney } from '../domain/definitions';

/** Explicitly publish a frozen source after editor persistence; unsaved template drafts never leak into public PDFs. */
export function ConstructorPublicationActions({ templateId, ready }: { templateId: string; ready: boolean }) {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('publication'), modelId = params.get('modelId'), site = params.get('site');
  const batch = params.get('batch');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState('');
  const working = useRef(false);
  if (!id || !modelId) return null;
  const publish = async (target: 'new' | 'document' | 'site' | 'batch') => {
    if (!ready || working.current) return;
    working.current = true; setBusy(true); setError(''); setResult('');
    try {
      const path = target === 'batch' ? `/api/publications/batches/${encodeURIComponent(batch!)}/constructor`
        : target === 'site' ? `/api/publications/sites/${encodeURIComponent(site!)}/constructor`
        : `/api/publications/${encodeURIComponent(id)}/constructor${target === 'new' ? '/publications' : ''}`;
      const created = await journeyRequest<CreatedJourney | undefined>(path, {
        method: target === 'new' ? 'POST' : 'PUT', headers: { 'X-Management-Key': managementKey(target === 'batch' ? `batch:${batch}` : id) },
        body: JSON.stringify({ templateId, modelId }),
      });
      if (target === 'new' && created) {
        rememberKey(created.document.id, created.managementKey); setResult(created.document.id);
      } else setResult(target === 'site' ? 'site' : target === 'batch' ? `batch:${batch}` : id);
    } catch (reason) { setError((reason as Error).message); }
    finally { working.current = false; setBusy(false); }
  };
  return <section className="constructor-publication-actions">
    <button type="button" disabled={!ready || busy} onClick={() => void publish('new')}>{t('Create a new document from this template')}</button>
    <details><summary>{t('Update an existing publication')}</summary>
      <button type="button" disabled={!ready || busy} onClick={() => void publish('document')}>{t('Apply PDF to this publication')}</button>
      {site && <button type="button" disabled={!ready || busy} onClick={() => void publish('site')}>{t('Use this template for site documents')}</button>}
      {batch && <button type="button" disabled={!ready || busy} onClick={() => void publish('batch')}>{t('Apply design to the whole release')}</button>}
      <p>{t('Published PDFs use the saved template and model. Save your changes before applying them.')}</p>
    </details>
    {result && <p role="status">{result === 'site' ? t('The site document template has been updated.') : <Link to={result.startsWith('batch:') ? `/issues/${result.slice(6)}` : `/manage/${result}`}>{t('Open the document')}</Link>}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
