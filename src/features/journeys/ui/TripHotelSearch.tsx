import { useCallback, useEffect, useRef, useState } from 'react';
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

export function TripHotelSearch({ city, cityPoint, checkIn: initialCheckIn, checkOut: initialCheckOut, radiusMeters, initiallyOpen, onSelect }: {
  city: string; cityPoint?: CityPoint; checkIn: string; checkOut: string; radiusMeters?: number; initiallyOpen?: boolean;
  onSelect: (lodging: TripLodging) => void;
}) {
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [mapMoved, setMapMoved] = useState(false);
  const [guests, setGuests] = useState(2);
  const [result, setResult] = useState<Result>();
  const [active, setActive] = useState<string>();
  const [mapOpen, setMapOpen] = useState(true);
  const cards = useRef(new Map<string, HTMLLIElement>());
  const [starFilter, setStarFilter] = useState(0);
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [maxRoubles, setMaxRoubles] = useState<number>();
  const [maxKm, setMaxKm] = useState<number>();
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController>();
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastRequest = useRef(0);
  const started = useRef(false);
  useEffect(() => () => {
    clearTimeout(refreshTimer.current);
    request.current?.abort();
    request.current = undefined;
  }, []);
  const distanceLimit = radiusMeters ?? (maxKm === undefined ? undefined : maxKm * 1000);
  const visible = result?.hotels.filter(hotel => (!starFilter || (hotel.stars ?? 0) >= starFilter)
    && (result.catalogOnly || !freeCancellation || hotel.freeCancellation)
    && (result.catalogOnly || maxRoubles === undefined || (hotel.cost?.currency === 'RUB' && hotel.cost.amount <= maxRoubles))
    && (!cityPoint || distanceLimit === undefined || (hotel.latitude != null && hotel.longitude != null
      && geographicDistance(cityPoint, { latitude: hotel.latitude, longitude: hotel.longitude }) <= distanceLimit)));
  const pins = (visible ?? []).flatMap(hotel => Number.isFinite(hotel.latitude) && Number.isFinite(hotel.longitude)
    ? [{ id: hotel.id, label: hotel.name, longitude: hotel.longitude!, latitude: hotel.latitude!, zone: 'UTC', stayMinutes: 0 }] : []);

  const mapStops = cityPoint && radiusMeters !== undefined
    ? [...pins, { ...cityPoint, id: '__day_point__', label: city, zone: 'UTC', stayMinutes: 0 }]
    : pins;

  const validQuery = city.trim().length >= 2 && Boolean(checkIn && checkIn < checkOut) &&
    Number.isInteger(guests) && guests >= 1 && guests <= 12;
  const search = useCallback(async (refresh = false) => {
    if (!validQuery || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    lastRequest.current = Date.now();
    setBusy(true);
    if (!refresh) setResult(undefined);
    try {
      const data = await journeyRequest<Result>('/api/journeys/routes/places/hotels', {
        method: 'POST', signal: controller.signal, body: JSON.stringify({ city, checkIn, checkOut, guests }),
      });
      if (!controller.signal.aborted) setResult(previous => {
        if (!refresh || !previous?.available) return data;
        if (!data.available) return previous;
        return { ...data, hotels: [...new Map([...previous.hotels, ...data.hotels].map(hotel => [hotel.id, hotel])).values()] };
      });
    } catch {
      if (!controller.signal.aborted && !refresh) setResult({ available: false, hotels: [] });
    } finally {
      if (request.current === controller && !controller.signal.aborted) {
        request.current = undefined;
        setBusy(false);
      }
    }
  }, [city, checkIn, checkOut, guests, validQuery]);

  useEffect(() => {
    if (!initiallyOpen || started.current) return;
    const timer = setTimeout(() => {
      started.current = true;
      void search();
    }, 0);
    return () => clearTimeout(timer);
  }, [initiallyOpen, search]);

  function resetResults() {
    clearTimeout(refreshTimer.current);
    request.current?.abort();
    request.current = undefined;
    setBusy(false);
    setResult(undefined);
  }

  function refreshAfterMove() {
    setMapMoved(true);
    if (!result) return;
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => void search(true), Math.max(450, 8000 - (Date.now() - lastRequest.current)));
  }

  return <details open={initiallyOpen}>
    <summary>{t('Find hotels')}</summary>
    {initiallyOpen && <>
      <label>{t('Check-in date')} <input type="date" value={checkIn} onChange={event => { resetResults(); setCheckIn(event.target.value); }} /></label>
      <label>{t('Check-out date')} <input type="date" value={checkOut} onChange={event => { resetResults(); setCheckOut(event.target.value); }} /></label>
    </>}
    <label>{t('Guests')} <input type="number" min={1} max={12} value={guests || ''} onChange={event => {
      resetResults();
      setGuests(event.target.valueAsNumber || 0);
    }} /></label>
    <button type="button" disabled={!validQuery || busy} onClick={() => void search()}>{t('Search')}</button>
    {radiusMeters === 1000 && <p>{t('Hotels within 1 km of this point')}</p>}
    {busy && <p role="status">{t('Loading…')}</p>}
    {result && !result.available && <p role="status">{t('Hotel search is unavailable.')}</p>}
    {result?.provider === 'RUSSIAN_TOURISM' && <p>{t('Registry results show hotel details without current prices or availability.')}</p>}
    {result?.provider === 'OSTROVOK_MCP' && result.catalogOnly && <p>{t('Prices and availability are checked on Ostrovok.')}</p>}
    {mapStops.length > 0 && <div className="trip-hotel-map">
        <button type="button" aria-pressed={mapOpen} onClick={() => setMapOpen(!mapOpen)}>
          {t('Hotels on the map')}
        </button>
        {mapOpen && <RouteMap cityMap stops={mapStops} legs={[]} onReady={ignoreMapHandle}
          fit={!mapMoved} onUserMove={refreshAfterMove} focusStopId={active} onStopSelect={id => {
            if (id === '__day_point__') return;
            setActive(id);
            cards.current.get(id)?.scrollIntoView?.({ block: 'nearest' });
          }} />}
      </div>}
    {result?.available && <>
      <label>{t('Minimum hotel stars')} <input type="number" min={0} max={5} value={starFilter}
        onChange={event => setStarFilter(event.target.valueAsNumber || 0)} /></label>
      {!result.catalogOnly && <label>{t('Maximum cost in RUB')} <input type="number" min={0} value={maxRoubles ?? ''}
        onChange={event => setMaxRoubles(event.target.value === '' ? undefined : event.target.valueAsNumber)} /></label>}
      {cityPoint && radiusMeters === undefined && <label>{t('Maximum distance from the city pin in km')} <input type="number" min={0}
        value={maxKm ?? ''} onChange={event => setMaxKm(event.target.value === '' ? undefined : event.target.valueAsNumber)} /></label>}
      {!result.catalogOnly && <label><input type="checkbox" checked={freeCancellation}
        onChange={event => setFreeCancellation(event.target.checked)} />{t('Free cancellation')}</label>}
      {!visible?.length && <p role="status">{t('No matching hotels.')}</p>}
      <ul className="trip-hotel-list">{visible?.map(hotel => <li key={hotel.id} data-active={active === hotel.id}
        ref={node => { if (node) cards.current.set(hotel.id, node); else cards.current.delete(hotel.id); }}>
        <button type="button" aria-pressed={active === hotel.id} onClick={() => { setActive(hotel.id); if (hotel.latitude != null && hotel.longitude != null) setMapOpen(true); }}>{hotel.name}</button>
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
