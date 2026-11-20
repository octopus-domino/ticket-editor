import { useEffect, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';
import type { CityPoint, TripLodging } from '../api/tripDraft';
import { geographicDistance } from '../domain/route';
import { RouteMap } from './RouteMap';

type Hotel = Pick<TripLodging, 'name' | 'latitude' | 'longitude' | 'cost'> & {
  id: string; address?: string; stars?: number; rating?: number; photoUrl?: string; freeCancellation?: boolean; sourceUrl?: string;
};
type Result = { available: boolean; provider?: TripLodging['provider']; hotels: Hotel[]; catalogOnly?: boolean };
const ignoreMapHandle = () => undefined;

export function TripHotelSearch({ city, cityPoint, checkIn, checkOut, focus, onFocusHandled, onSelect }: {
  city: string; cityPoint?: CityPoint; checkIn: string; checkOut: string; focus?: boolean;
  onFocusHandled?: () => void; onSelect: (lodging: TripLodging) => void;
}) {
  const [guests, setGuests] = useState(2);
  const [result, setResult] = useState<Result>();
  const [active, setActive] = useState<string>();
  const [starFilter, setStarFilter] = useState(0);
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [maxRoubles, setMaxRoubles] = useState<number>();
  const [maxKm, setMaxKm] = useState<number>();
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);
  const visible = result?.hotels.filter(hotel => (!starFilter || (hotel.stars ?? 0) >= starFilter)
    && (result.catalogOnly || !freeCancellation || hotel.freeCancellation)
    && (result.catalogOnly || maxRoubles === undefined || (hotel.cost?.currency === 'RUB' && hotel.cost.amount <= maxRoubles))
    && (!cityPoint || maxKm === undefined || (hotel.latitude != null && hotel.longitude != null
      && geographicDistance(cityPoint, { latitude: hotel.latitude, longitude: hotel.longitude }) <= maxKm * 1000)));
  const pins = (visible ?? []).flatMap(hotel => Number.isFinite(hotel.latitude) && Number.isFinite(hotel.longitude)
    ? [{ id: hotel.id, label: hotel.name, longitude: hotel.longitude!, latitude: hotel.latitude!, zone: 'UTC', stayMinutes: 0 }] : []);

  const panel = useRef<HTMLDetailsElement>(null);
  const queryButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focus || !panel.current) return;
    panel.current.open = true;
    const frame = requestAnimationFrame(() => {
      queryButton.current?.focus();
      onFocusHandled?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, onFocusHandled]);

  async function search() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setResult(undefined);
    try {
      const data = await journeyRequest<Result>('/api/journeys/routes/places/hotels', {
        method: 'POST', signal: controller.signal, body: JSON.stringify({ city, checkIn, checkOut, guests }),
      });
      if (!controller.signal.aborted) setResult(data);
    } catch {
      if (!controller.signal.aborted) setResult({ available: false, hotels: [] });
    } finally {
      if (request.current === controller && !controller.signal.aborted) {
        request.current = undefined;
        setBusy(false);
      }
    }
  }
  return <details ref={panel}>
    <summary>{t('Find hotels')}</summary>
    <label>{t('Guests')} <input type="number" min={1} max={12} value={guests || ''} onChange={event => {
      request.current?.abort();
      request.current = undefined;
      setBusy(false);
      setResult(undefined);
      setGuests(event.target.valueAsNumber || 0);
    }} /></label>
    <button ref={queryButton} type="button" disabled={city.trim().length < 2 || !checkIn || checkIn >= checkOut
      || guests < 1 || guests > 12 || !Number.isInteger(guests) || busy} onClick={() => void search()}>{t('Search')}</button>
    {busy && <p role="status">{t('Loading…')}</p>}
    {result && !result.available && <p role="status">{t('Hotel search is unavailable.')}</p>}
    {result?.provider === 'RUSSIAN_TOURISM' && <p>{t('Registry results show hotel details without current prices or availability.')}</p>}
    {result?.provider === 'OSTROVOK_MCP' && result.catalogOnly && <p>{t('Prices and availability are checked on Ostrovok.')}</p>}
    {result?.available && <>
      <label>{t('Minimum hotel stars')} <input type="number" min={0} max={5} value={starFilter}
        onChange={event => setStarFilter(event.target.valueAsNumber || 0)} /></label>
      {!result.catalogOnly && <label>{t('Maximum cost in RUB')} <input type="number" min={0} value={maxRoubles ?? ''}
        onChange={event => setMaxRoubles(event.target.value === '' ? undefined : event.target.valueAsNumber)} /></label>}
      {cityPoint && <label>{t('Maximum distance from the city pin in km')} <input type="number" min={0}
        value={maxKm ?? ''} onChange={event => setMaxKm(event.target.value === '' ? undefined : event.target.valueAsNumber)} /></label>}
      {!result.catalogOnly && <label><input type="checkbox" checked={freeCancellation}
        onChange={event => setFreeCancellation(event.target.checked)} />{t('Free cancellation')}</label>}
      {pins.length > 0 && <RouteMap cityMap stops={pins} legs={[]} onReady={ignoreMapHandle}
        focusStopId={active} onStopSelect={setActive} />}
      {!visible?.length && <p role="status">{t('No matching hotels.')}</p>}
      <ul>{visible?.map(hotel => <li key={hotel.id}>
        <button type="button" aria-pressed={active === hotel.id} onClick={() => setActive(hotel.id)}>{hotel.name}</button>
        {hotel.photoUrl && /^https:\/\//i.test(hotel.photoUrl) && <img src={hotel.photoUrl} alt="" loading="lazy" width={120} />}
        {hotel.address && <p>{hotel.address}</p>}
        {(hotel.stars != null || hotel.rating != null) && <p>{hotel.stars != null && `${hotel.stars} ★ `}{hotel.rating}</p>}
        {hotel.cost && <p>{new Intl.NumberFormat(getLocale(), {
          style: 'currency', currency: hotel.cost.currency,
        }).format(hotel.cost.amount)}</p>}
        {hotel.sourceUrl && /^https:\/\/ostrovok\.ru\/hotel\//i.test(hotel.sourceUrl) &&
          <a href={hotel.sourceUrl} target="_blank" rel="noreferrer">{t('Open on Ostrovok')}</a>}{' '}
        <button type="button" onClick={() => onSelect({ name: hotel.name, address: hotel.address ?? '',
          latitude: hotel.latitude ?? undefined, longitude: hotel.longitude ?? undefined, checkIn, checkOut,
          cost: hotel.cost ?? undefined, provider: result.provider ?? undefined })}>{t('Add hotel to trip')}</button>
      </li>)}</ul>
    </>}
  </details>;
}
