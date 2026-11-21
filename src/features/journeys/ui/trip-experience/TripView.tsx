import { useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { t } from '@/shared/i18n';
import type { SharedTrip } from '../../domain/sharedTrip';
import { travelDuration } from '../../domain/tripDocumentContent';
import { TripCityMap } from '../TripCityMap';
import { TripDayNavigator, TripExperienceShell, tripDateLabel } from './TripExperienceShell';

export function TripView({ trip, mode, actions, source, details }: {
  trip: SharedTrip; mode: 'owner' | 'shared'; actions?: ReactNode; source?: string; details?: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const [focused, setFocused] = useState<{ dayKey: string; id: string }>();
  const [mapMode, setMapMode] = useState(false);
  const placeButtons = useRef(new Map<string, HTMLButtonElement>());
  const cities = new Map(trip.cities.map(city => [city.id, city]));
  const days = trip.days.map((day, index) => ({
    id: String(index + 1), date: day.date, title: cities.get(day.cityId)?.name,
  }));
  const dayKey = params.get('day') ?? days[0]?.id ?? 'overview';
  const index = days.findIndex(day => day.id === dayKey);
  const day = trip.days[index];
  const city = day ? cities.get(day.cityId) : undefined;
  const lodging = day?.accommodationId ? trip.accommodations.find(item => item.id === day.accommodationId) : undefined;
  const places = day?.segments.filter(segment => !segment.idea && !segment.id.startsWith('visit-')) ?? [];
  const ideas = day?.segments.filter(segment => segment.idea) ?? [];
  const uniqueCities = [...new Set(trip.cities.map(city => city.name))];
  const first = trip.startDate || trip.days[0]?.date;
  const last = trip.endDate || trip.days.at(-1)?.date;

  function selectDay(id: string) {
    setFocused(undefined);
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('day', id);
      return next;
    }, { replace: true, preventScrollReset: true });
  }

  const mapStops = places.flatMap(place => place.latitude == null || place.longitude == null ? [] : [{
    id: place.id, label: place.title, latitude: place.latitude, longitude: place.longitude, zone: 'UTC', stayMinutes: 0,
  }]);
  if (!mapStops.length && city?.latitude != null && city.longitude != null) {
    mapStops.push({ id: city.id, label: city.name, latitude: city.latitude, longitude: city.longitude, zone: 'UTC', stayMinutes: 0 });
  }
  const walking = day?.walkingSections ?? [];
  const dayMap: Parameters<typeof TripCityMap>[0]['dayMap'] = day && !mapMode ? {
    stops: mapStops,
    legs: walking.map(section => ({ mode: 'foot', durationSeconds: section.durationSeconds,
      coordinates: section.geometry.map(({ longitude, latitude }) => [longitude, latitude]) })),
    onStopSelect: id => {
      setFocused({ dayKey, id });
      placeButtons.current.get(id)?.scrollIntoView({ block: 'nearest' });
    },
  } : undefined;
  const focusId = focused?.dayKey === dayKey ? focused.id : undefined;

  return <TripExperienceShell mode={mode} title={trip.title}
    subtitle={uniqueCities.length > 1 ? uniqueCities.join(' → ') : source}
    dateSpan={first && <><time dateTime={first}>{tripDateLabel(first)}</time>
      {last && last !== first && <> – <time dateTime={last}>{tripDateLabel(last)}</time></>}</>}
    actions={actions} navigation={<TripDayNavigator days={days} selected={index >= 0 ? dayKey : 'overview'} onSelect={selectDay} />}>
    <div className="trip-exp-workspace">
      <section className="trip-exp-panel" aria-live="polite">
        <h2>{day ? city?.name || t('Trip day') : t('Trip overview')}</h2>
        {day ? <>
          <time dateTime={day.date}>{tripDateLabel(day.date, 'full')}</time>
          {day.note && <p>{day.note}</p>}
          {places.length ? <ol className="trip-exp-itinerary">
            {places.map(place => <li key={place.id}>
              <button type="button" ref={node => {
                if (node) placeButtons.current.set(place.id, node);
                else placeButtons.current.delete(place.id);
              }} aria-pressed={focusId === place.id} onClick={() => { setMapMode(false); setFocused({ dayKey, id: place.id }); }}>
                {place.title}
              </button>
              {focusId === place.id && place.note && <p>{place.note}</p>}
            </li>)}
          </ol> : <p>{t('No places have been added to this day.')}</p>}
          {walking.length > 0 && <p><strong>{t('Private itineraries')}</strong>
            {' · '}{travelDuration(walking.reduce((sum, section) => sum + section.durationSeconds, 0))}</p>}
          {lodging && <p className="trip-exp-stay"><strong>{lodging.name}</strong>
            {lodging.address && <><br />{lodging.address}</>}</p>}
          {ideas.length > 0 && <details><summary>{t('Trip ideas')}</summary>
            <ul>{ideas.map(idea => <li key={idea.id}>{idea.title}</li>)}</ul>
          </details>}
        </> : days.length ? <ol className="trip-exp-itinerary">
          {days.map(choice => <li key={choice.id}><button type="button" onClick={() => selectDay(choice.id)}>
            {tripDateLabel(choice.date)} · {choice.title || t('Trip day')}
          </button></li>)}
        </ol> : <p>{t('No places have been added to this day.')}</p>}
      </section>
      <section className="trip-exp-panel trip-exp-map" aria-label={t('Map')}>
        <div className="trip-exp-control-row">
          <button type="button" aria-pressed={!day || mapMode} onClick={() => setMapMode(true)}>{t('Trip map')}</button>
          {day && <button type="button" aria-pressed={!mapMode} onClick={() => setMapMode(false)}>{t('Trip day')}</button>}
        </div>
        <TripCityMap cities={trip.cities} legs={trip.legs} accommodations={trip.accommodations} dayMap={dayMap}
          focusStopId={focusId} showTransferList={false}
          onSelectCity={id => { const match = trip.days.findIndex(item => item.cityId === id); if (match >= 0) selectDay(String(match + 1)); }} />
      </section>
    </div>
    <div className="trip-exp-related">
      {trip.legs.length > 0 && <details className="trip-exp-panel">
        <summary>{t('Transfer details')}</summary>
        <ul>{trip.legs.map(leg => <li key={leg.id}>
          {leg.note && <><strong>{leg.note}</strong>{' · '}</>}
          {cities.get(leg.fromCityId)?.name || t('City')} → {cities.get(leg.toCityId)?.name || t('City')}
          {leg.durationSeconds != null && <> · {travelDuration(leg.durationSeconds)}</>}
          {leg.departureAt && <time dateTime={leg.departureAt}> · {leg.departureAt.slice(11, 16)}</time>}
        </li>)}</ul>
      </details>}
      {details}
    </div>
  </TripExperienceShell>;
}
