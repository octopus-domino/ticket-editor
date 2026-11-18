import { useEffect, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';
import type { RouteStop } from '../domain/routeTimeline';
import type { RecommendedPlace } from '../domain/cityVisitPlan';
import { RouteAddressInput, type RouteAddress } from './RouteAddressInput';

/** Hotel recommendations remain a trip feature; they do not construct a private walk. */
export function RouteHotels({ stop, onAdd }: { stop: RouteStop; onAdd: (address: RouteAddress) => void }) {
  const [places, setPlaces] = useState<RecommendedPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const abort = useRef<AbortController>();
  useEffect(() => {
    setPlaces([]); setError(''); setBusy(false);
    return () => abort.current?.abort();
  }, [stop.latitude, stop.longitude]);

  async function search() {
    abort.current?.abort();
    const request = new AbortController(); abort.current = request;
    setBusy(true); setError('');
    const query = new URLSearchParams({ longitude: String(stop.longitude), latitude: String(stop.latitude), kind: 'hotels', language: getLocale() });
    try {
      const result = await journeyRequest<{ places: RecommendedPlace[] }>(`/api/journeys/routes/places?${query}`, { signal: request.signal });
      if (!request.signal.aborted) setPlaces(result.places);
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : t('Could not prepare the image.'));
    } finally { if (!request.signal.aborted) setBusy(false); }
  }

  return <details><summary>{t('Hotels')}</summary>
    <p>{t('Find a hotel, then select its address below to add it as a stop. Prices and booking remain on the hotel service.')}</p>
    <div className="route-actions">
      <a href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(stop.label)}`} target="_blank" rel="noopener noreferrer">Booking.com ↗</a>
      <a href="https://ostrovok.ru/" target="_blank" rel="noopener noreferrer">{t('Ostrovok')} ↗</a>
    </div>
    <RouteAddressInput value="" onSelect={onAdd} />
    <button type="button" disabled={busy} className="journey-secondary" onClick={() => void search()}>{t('Find nearby places')}</button>
    <ul className="route-place-results">{places.map(place => <li key={place.id}>
      <a href={place.url} target="_blank" rel="noopener noreferrer">{place.label} ↗</a>
      <button type="button" onClick={() => onAdd(place)}>{t('Add stop')}</button>
    </li>)}</ul>
    {error && <p role="alert">{error}</p>}
  </details>;
}
