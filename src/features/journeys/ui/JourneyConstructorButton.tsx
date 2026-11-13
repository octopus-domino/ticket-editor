import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { journeyRequest, managementKey } from '../api/journeys';

export function JourneyConstructorButton({ id, batchId }: { id: string; batchId?: string }) {
  const user = useStore(authStore, state => state.user);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!user || user.id === 'guest') return <Link to={`/login?next=${encodeURIComponent(batchId ? `/issues/${batchId}` : `/manage/${id}`)}`}>{t('Open in constructor')}</Link>;
  const open = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const created = await journeyRequest<{ templateId: string; schemaId: string; modelId: string; siteSlug?: string }>(
        `/api/publications/${encodeURIComponent(id)}/constructor`, { method: 'POST', headers: { 'X-Management-Key': managementKey(id) } });
      await schemaStore.loadAll(); schemaStore.setActive(created.schemaId);
      await modelStore.load(created.schemaId); modelStore.select(created.modelId);
      const params = new URLSearchParams({ publication: id, modelId: created.modelId });
      if (batchId) params.set('batch', batchId);
      if (created.siteSlug) params.set('site', created.siteSlug);
      navigate(`/app/templates/${encodeURIComponent(created.templateId)}/edit?${params}`);
    } catch (reason) { setError((reason as Error).message); setBusy(false); }
  };
  return <div className="journey-constructor-action">
    <button type="button" className="journey-secondary" disabled={busy} onClick={() => void open()}>{t(busy ? 'Preparing the template…' : 'Open in constructor')}</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
