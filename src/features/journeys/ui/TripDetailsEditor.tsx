import { useEffect, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import type { LocalTripDraft, TripBudget } from '../api/tripDraft';
import { journeyRequest } from '../api/journeys';

type Rates = { date: string; rates: Record<string, number> };

export function TripDetailsEditor({ budget, documents, costs = [], onChange }: {
  budget: LocalTripDraft['budget'];
  documents: NonNullable<LocalTripDraft['documents']>;
  costs?: TripBudget[];
  onChange: (changes: Pick<LocalTripDraft, 'budget'> | Pick<LocalTripDraft, 'documents'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const amount = budget?.amount;
  const [currency, setCurrency] = useState(budget?.currency ?? 'RUB');
  useEffect(() => { if (budget?.currency) setCurrency(budget.currency); }, [budget?.currency]);
  const [rates, setRates] = useState<Rates>();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);
  const rubles = (money: TripBudget) => {
    const rate = money.currency === 'RUB' ? 1 : rates?.rates[money.currency];
    return rate === undefined ? undefined : money.amount * rate;
  };
  const limit = budget ? rubles(budget) : undefined;
  const costAmounts = costs.map(rubles);
  const expenses = costAmounts.every(value => value !== undefined)
    ? costAmounts.reduce<number>((sum, value) => sum + (value ?? 0), 0) : undefined;
  const formatRoubles = (value: number) => new Intl.NumberFormat(getLocale(), {
    style: 'currency', currency: 'RUB',
  }).format(value);
  async function fetchRates() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setFailed(false);
    setLoading(true);
    try {
      const response = await journeyRequest<Rates>('/api/journeys/routes/places/rates', { signal: controller.signal });
      if (!controller.signal.aborted) setRates(response);
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      if (request.current === controller && !controller.signal.aborted) {
        request.current = undefined;
        setLoading(false);
      }
    }
  }
  const validUrl = URL.canParse(url.trim()) && /^https?:\/\//i.test(url.trim());
  return <>
    <details>
      <summary>{t('Trip budget')}</summary>
      <label>{t('Amount')} <input type="number" step="0.01" min="0" value={amount ?? ''} onChange={event => {
        const value = event.currentTarget.valueAsNumber;
        const code = /^[A-Z]{3}$/.test(currency) ? currency : budget?.currency ?? 'RUB';
        onChange({ budget: Number.isFinite(value) && value >= 0 ? { amount: value, currency: code } : undefined });
      }} /></label>
      <label>{t('Currency')} <input maxLength={3} value={currency} onChange={event => {
        const code = event.target.value.toUpperCase().replace(/[^A-Z]/g, '');
        setCurrency(code);
        if (budget && code.length === 3) onChange({ budget: { ...budget, currency: code } });
      }} /></label>
      <button type="button" disabled={loading} onClick={() => void fetchRates()}>{t('Load exchange rates')}</button>
      {rates && <p>{t('Bank of Russia rates')} · <time dateTime={rates.date}>{rates.date}</time></p>}
      {budget?.currency !== 'RUB' && limit !== undefined && <p>{t('Trip budget')} · {formatRoubles(limit)}</p>}
      {costs.length > 0 && expenses !== undefined && <p>{t('Planned expenses')} · {formatRoubles(expenses)}</p>}
      {failed && <p role="alert">{t('Exchange rates are unavailable.')}</p>}
    </details>
    <details>
      <summary>{t('Documents')}</summary>
      <ul>{documents.map(document => <li key={document.id}>
        {document.title}{' '}
        <button type="button" onClick={() => onChange({
          documents: documents.filter(item => item.id !== document.id),
        })}>{t('Remove')}</button>
      </li>)}</ul>
      <label>{t('Name')} <input value={title} maxLength={180} onChange={event => setTitle(event.target.value)} /></label>
      <label>URL <input type="url" value={url} maxLength={2048} onChange={event => setUrl(event.target.value)} /></label>
      <button type="button" disabled={!title.trim() || !validUrl} onClick={() => {
        onChange({ documents: [...documents, { id: crypto.randomUUID(), title: title.trim(), url: url.trim() }] });
        setTitle('');
        setUrl('');
      }}>{t('Add')}</button>
    </details>
  </>;
}
