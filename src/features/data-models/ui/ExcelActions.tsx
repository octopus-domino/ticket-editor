import { useState } from 'react';
import type { DataSchema } from '@/features/schemas/domain/DataSchema';
import type { DataModel } from '../domain/DataModel';
import { t, useLocale } from '@/shared/i18n';

export function ExcelActions({ schema, models }: { schema: DataSchema; models: readonly DataModel[] }) {
  useLocale();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function download(template: boolean) {
    setBusy(true); setError('');
    try { const { downloadWorkbook } = await import('../api/ExcelModelIO'); downloadWorkbook(schema, template ? [] : models); }
    catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="excel-actions">
    <button type="button" disabled={busy} onClick={() => void download(true)}>{t('Excel template')} ↓</button>
    <button type="button" disabled={busy || !models.length} onClick={() => void download(false)}>{t('Export Excel')} ↓</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
