import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { authFetch, API_BASE } from '@/shared/api/client';
import { publicFetch } from '../journeys/api/publicFetch';
import { authStore } from '@/auth/store';
import { useStore } from '@/shared/store/store';
import { getLocale, t, useLocale } from '@/shared/i18n';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import '../journeys/journeys.css';
import './workflows.css';

interface VisitStatus { id: string; title: string; issuedAt: string; checkedAt: string | null; visitedAt: string | null; canCheck: boolean; checkedBy: string | null; note: string | null }
export default function VisitCheckPage() {
  useLocale();
  const { id = '' } = useParams();
  const user = useStore(authStore, state => state.user);
  const userId = user?.id;
  const [status, setStatus] = useState<VisitStatus | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [note, setNote] = useState(''), [retry, setRetry] = useState(0);
  const working = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setStatus(null); setError(''); setNote('');
    const path = `/api/public/workflows/visits/${encodeURIComponent(id)}`;
    void (userId && userId !== 'guest' ? authFetch(path, { signal: controller.signal }) : publicFetch(`${API_BASE}${path}`, { signal: controller.signal }))
      .then(async response => { if (!response.ok) throw new Error(t('The verification record could not be loaded.')); return response.json() as Promise<VisitStatus>; })
      .then(result => { if (!controller.signal.aborted) { setStatus(result); setNote(result.note ?? ''); } })
      .catch(reason => { if (!controller.signal.aborted) setError((reason as Error).message); });
    return () => controller.abort();
  }, [id, userId, retry]);
  const check = async (visited: boolean) => {
    if (working.current || !status?.canCheck) return;
    working.current = true; setBusy(true); setError('');
    try {
      const response = await authFetch(`/api/workflows/visits/${encodeURIComponent(id)}/check`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visited, note }) });
      if (!response.ok) throw new Error(t('The attendance mark could not be saved. Try again.'));
      setStatus(await response.json());
    } catch (reason) { setError((reason as Error).message); }
    finally { working.current = false; setBusy(false); }
  };
  const time = (value: string) => new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  return <main className="workflow-page visit-check-page">
    <LanguageSwitcher /><Link to="/" className="workflow-brand">CoDoc</Link>
    <h1>{t('Attendance verification')}</h1>
    {status ? <section className="workflow-panel">
      <h2>{status.title}</h2>
      <p role="status">{t(status.visitedAt ? 'Attendance recorded' : status.checkedAt ? 'Document checked' : 'Awaiting a check')}</p>
      <dl><dt>{t('Issued')}</dt><dd>{time(status.issuedAt)}</dd>
        {status.checkedAt && <><dt>{t('Checked')}</dt><dd>{time(status.checkedAt)}</dd></>}
        {status.visitedAt && <><dt>{t('Visited')}</dt><dd>{time(status.visitedAt)}</dd></>}
        {status.checkedBy && <><dt>{t('Checked by')}</dt><dd>{status.checkedBy}</dd></>}
      </dl>
      {status.canCheck && <fieldset disabled={busy || Boolean(status.visitedAt)}>
        <label>{t('Check note (optional)')}<textarea maxLength={500} rows={2} value={note} onChange={event => setNote(event.target.value)} /></label>
        <div className="workflow-actions">
          <button type="button" disabled={Boolean(status.checkedAt)} onClick={() => void check(false)}>{t('Mark as checked')}</button>
          <button type="button" onClick={() => void check(true)}>{t('Mark attendance')}</button>
        </div>
      </fieldset>}
      {!status.canCheck && !user && <Link to={`/login?next=${encodeURIComponent(`/visits/${id}`)}`}>{t('Organiser sign-in')}</Link>}
      <button type="button" disabled={busy} onClick={() => setRetry(value => value + 1)}>{t('Refresh status')}</button>
    </section> : !error && <p role="status">{t('Loading…')}</p>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
