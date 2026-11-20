import { useEffect, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';
import type { CityPoint } from '../api/tripDraft';

type City = CityPoint & { name: string; label: string };

export function TripCitySearch({ query, onSelect }: { query: string; onSelect: (city: City) => void }) {
  const [state, setState] = useState<{ query: string; cities?: City[]; failed?: boolean }>();
  const request = useRef<AbortController>();
  useEffect(() => () => { request.current?.abort(); request.current = undefined; }, [query]);
  const result = state?.query === query ? state : undefined;

  async function search() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ query });
    try {
      const cities = await journeyRequest<City[]>(
        `/api/journeys/routes/places/cities?q=${encodeURIComponent(query.trim())}&language=${getLocale().split('-')[0]}`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setState({ query, cities });
    } catch {
      if (!controller.signal.aborted) setState({ query, failed: true });
    } finally {
      if (request.current === controller) request.current = undefined;
    }
  }

  const loading = Boolean(result && !result.cities && !result.failed);
  return <>
    <button type="button" disabled={loading || query.trim().length < 2} onClick={() => void search()}>
      {t('Find city')}
    </button>
    {loading && <span role="status">{t('Loading…')}</span>}
    {result?.failed && <span role="alert">{t('City search is unavailable.')}</span>}
    {result?.cities?.length === 0 && <span role="status">{t('No matching cities.')}</span>}
    {result?.cities && result.cities.length > 0 && <ul>{result.cities.map(city => <li key={city.label}>
      <button type="button" onClick={() => { setState(undefined); onSelect(city); }}>{city.label}</button>
    </li>)}</ul>}
    {result?.cities && <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>}
  </>;
}
