import { useRef, useState } from 'react';
import { t } from '@/shared/i18n';
import { journeyApi } from '../api/journeys';
import type { JourneyStatus } from '../domain/definitions';

/** Explicit commands change stored state; expiry continues to be calculated from the validity date. */
export function JourneyStatusActions({ id, managementKey, status, onChange }: {
  id: string; managementKey: string; status: JourneyStatus; onChange: (status: JourneyStatus) => void;
}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const working = useRef(false);
  const change = async (action: 'REVOKE' | 'RESTORE' | 'RESET_USAGE') => {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try { onChange(await journeyApi.changeStatus(id, managementKey, action)); setConfirm(false); }
    catch (reason) { setError((reason as Error).message); }
    finally { working.current = false; setBusy(false); }
  };
  return <details className="journey-status-actions"><summary>{t('Change document status')}</summary>
    {status.state === 'REVOKED' ? <button type="button" disabled={busy} onClick={() => void change('RESTORE')}>{t('Restore publication')}</button> :
      confirm ? <div><p>{t('The public page and PDF will become unavailable. Revoke this document?')}</p>
        <button type="button" disabled={busy} onClick={() => void change('REVOKE')}>{t('Confirm revocation')}</button>
        <button type="button" disabled={busy} onClick={() => setConfirm(false)}>{t('Cancel')}</button></div> :
        <button type="button" disabled={busy} onClick={() => setConfirm(true)}>{t('Revoke document')}</button>}
    {status.consumable && status.usedAt && <button type="button" disabled={busy} onClick={() => void change('RESET_USAGE')}>{t('Cancel admission or redemption mark')}</button>}
    {status.state === 'EXPIRED' && <p>{t('Extend the validity date in the document to make it active again.')}</p>}
    {error && <p role="alert">{error}</p>}
  </details>;
}
