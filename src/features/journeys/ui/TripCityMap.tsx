import { useMemo, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import type { CityPoint, TripWireLeg } from '../api/tripDraft';
import type { SharedTrip } from '../domain/sharedTrip';
import type { DayMapPlan } from './DayPlanningPanel';
import type { TripHotelMapState } from './TripHotelSearch';
import { RouteMap, type RouteMapLeg } from './RouteMap';

const ignoreMapHandle = () => undefined;
const emptyAccommodations: SharedTrip['accommodations'] = [];
const emptyLines: RouteMapLeg[] = [];

const transportLabels = { PLANE: 'Flight', TRAIN: 'Train', BUS: 'Bus', CAR: 'Car', FERRY: 'Ferry' } as const;

export function TripCityMap({ cities, legs, plannedLines = emptyLines, focusStopId, accommodations = emptyAccommodations, onChangeLodging, onPick, hotelMap, onSelectCity, onMapCenter, pickedPoint, dayMap }: Pick<SharedTrip, 'cities'> & {
  legs: TripWireLeg[]; plannedLines?: RouteMapLeg[]; focusStopId?: string; accommodations?: SharedTrip['accommodations'];
  onChangeLodging?: (id: string) => void;
  onPick?: (point: CityPoint) => void;
  hotelMap?: TripHotelMapState;
  onSelectCity?: (id: string) => void;
  onMapCenter?: (center: CityPoint) => void;
  pickedPoint?: CityPoint;
  dayMap?: DayMapPlan;
}) {
  const [selectedId, setSelectedId] = useState<string>();
  const [lodgingId, setLodgingId] = useState<string>();
  const lodging = accommodations.find(item => item.id === lodgingId);
  const selected = legs.find(leg => leg.id === selectedId);
  const cityName = (id: string) => cities.find(city => city.id === id)?.name || t('City');
  const destinations = useMemo(() => cities.flatMap(city => city.latitude == null || city.longitude == null ? [] : [{
    id: city.id, label: city.name || t('City'), latitude: city.latitude, longitude: city.longitude, zone: 'UTC', stayMinutes: 0,
  }]), [cities]);
  const hotels = useMemo(() => accommodations.flatMap(item => item.latitude == null || item.longitude == null ? [] : [{
    id: `hotel:${item.id}`, label: item.name, latitude: item.latitude, longitude: item.longitude, zone: 'UTC', stayMinutes: 0,
  }]), [accommodations]);
  const transfers = useMemo(() => {
    const pins = new Map(destinations.map(point => [point.id, point]));
    return legs.flatMap((leg): RouteMapLeg[] => {
      if (leg.geometry && leg.geometry.length >= 2) return [{ id: leg.id,
        mode: leg.transport === 'PLANE' ? 'flight' : leg.transport === 'WALK' ? 'foot' : 'car',
        durationSeconds: leg.durationSeconds ?? 0,
        coordinates: leg.geometry.map(({ longitude, latitude }) => [longitude, latitude]) }];
      const from = pins.get(leg.fromCityId);
      const to = pins.get(leg.toCityId);
      return from && to ? [{ id: leg.id, mode: 'transfer', coordinates: [
        [from.longitude, from.latitude], [to.longitude, to.latitude],
      ] }] : [];
    });
  }, [destinations, legs]);
  const mapLegs = useMemo(() => [...plannedLines, ...transfers], [plannedLines, transfers]);
  if (!destinations.length && !transfers.length && !hotels.length && !onPick && !hotelMap && !dayMap && !onSelectCity) return null;
  return <figure>
    <RouteMap rasterBasemap cityMap onReady={ignoreMapHandle} {...(hotelMap ? {
      ...hotelMap, legs: emptyLines,
    } : dayMap ?? {
      stops: [...destinations, ...hotels], legs: mapLegs, focusStopId, fit: onPick ? 'initial' : true,
      onPick, pickedPoint, onUserMove: onMapCenter, onLegSelect: id => { setLodgingId(undefined); setSelectedId(id); },
      onStopSelect: hotels.length || onSelectCity ? id => {
        if (id.startsWith('hotel:')) { setSelectedId(undefined); setLodgingId(id.slice(6)); }
        else onSelectCity?.(id);
      } : undefined,
    })} />
    {!hotelMap && !dayMap && mapLegs.some(transfer => transfer.mode === 'transfer') &&
      <figcaption>{t('Dashed lines show connections between cities.')}</figcaption>}
    {!hotelMap && !dayMap && transfers.length > 0 && <ul>{transfers.map(line => {
      const leg = legs.find(item => item.id === line.id)!;
      return <li key={leg.id}><button type="button" aria-pressed={leg.id === selectedId}
        onClick={() => setSelectedId(leg.id)}>{cityName(leg.fromCityId)} → {cityName(leg.toCityId)}</button></li>;
    })}</ul>}
    {!hotelMap && !dayMap && selected && <section aria-label={t('Transfer details')}>
      <h3>{cityName(selected.fromCityId)} → {cityName(selected.toCityId)}</h3>
      <p>{selected.transport && selected.transport !== 'WALK' ? t(transportLabels[selected.transport]) : selected.note}</p>
      {selected.departureAt && <p>{t('Departure')} · <time dateTime={selected.departureAt}>{selected.departureAt.replace('T', ' ')}</time></p>}
      {selected.arrivalAt && <p>{t('Arrival')} · <time dateTime={selected.arrivalAt}>{selected.arrivalAt.replace('T', ' ')}</time></p>}
      {selected.cost && <p>{t('Transfer cost')} · {new Intl.NumberFormat(getLocale(), {
        style: 'currency', currency: selected.cost.currency,
      }).format(selected.cost.amount)}</p>}
      {selected.bookingUrl && /^https?:\/\//i.test(selected.bookingUrl) &&
        <a href={selected.bookingUrl} target="_blank" rel="noreferrer">{t('Booking link')}</a>}{' '}
      <a href="https://rasp.yandex.ru/" target="_blank" rel="noreferrer">{t('Find tickets')}</a>{' '}
      <button type="button" onClick={() => setSelectedId(undefined)}>{t('Close')}</button>
    </section>}
    {!hotelMap && !dayMap && lodging && <section aria-label={t('Trip lodging')}>
      <h3>{lodging.name}</h3>
      {lodging.address && <p>{lodging.address}</p>}
      <p><time dateTime={lodging.checkIn}>{lodging.checkIn}</time> → <time dateTime={lodging.checkOut}>{lodging.checkOut}</time></p>
      {lodging.cost && <p>{t('Lodging cost')} · {new Intl.NumberFormat(getLocale(), {
        style: 'currency', currency: lodging.cost.currency,
      }).format(lodging.cost.amount)}</p>}
      {onChangeLodging && <button type="button" onClick={() => onChangeLodging(lodging.id)}>{t('Edit lodging')}</button>}
      <button type="button" onClick={() => setLodgingId(undefined)}>{t('Close')}</button>
    </section>}
  </figure>;
}
