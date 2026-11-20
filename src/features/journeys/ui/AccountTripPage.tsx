import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getLocale, t } from '@/shared/i18n';
import { downloadFile } from '@/shared/files/download';
import { fetchTripExport, openAccountTrip, tripExportFiles, type AccountTrip, type TripExport } from '../api/tripDraft';
import { RouteMap } from './RouteMap';
import { TripCityMap } from './TripCityMap';
import { TripTemplateAction } from './TripTemplateAction';
import { travelDuration } from '../domain/tripDocumentContent';
import type { PlannedLeg } from '../domain/route';
import { readTripShare, readTripShareFile, type SharedTrip } from '../domain/sharedTrip';
import './route.css';

const ignoreMapHandle = () => undefined;

function TripDay({ day, city, id, lodging }: {
  day: SharedTrip['days'][number]; city: string | undefined; id: string; lodging?: SharedTrip['accommodations'][number];
}) {
  const [expanded, setExpanded] = useState(false);
  const stops = day.segments.flatMap(segment => segment.id.startsWith('visit-') || segment.idea || segment.latitude == null || segment.longitude == null ? [] : [{
    id: segment.id, label: segment.title, latitude: segment.latitude, longitude: segment.longitude,
    zone: 'UTC', stayMinutes: 0,
  }]);
  const legs = (day.walkingSections ?? []).map((section): PlannedLeg => ({
    mode: 'foot', distanceMeters: section.distanceMeters, durationSeconds: section.durationSeconds,
    coordinates: section.geometry.map(({ longitude, latitude }) => [longitude, latitude]),
  }));
  return <section id={id} className="trip-day-timeline-item trip-saved-day">
    <header><div>
      <time dateTime={day.date}>{new Intl.DateTimeFormat(getLocale(), {
        dateStyle: 'full', timeZone: 'UTC',
      }).format(new Date(day.date))}</time>
      <h2>{city || t('Trip day')}</h2>
    </div></header>
    {lodging && <p><strong>{lodging.name}</strong>{lodging.address && ` · ${lodging.address}`}</p>}
    {day.note && <p>{day.note}</p>}
    {legs.length > 0 && <details onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary>{t('Private itineraries')} · {travelDuration(legs.reduce((sum, leg) => sum + leg.durationSeconds, 0))}</summary>
      {expanded && <RouteMap rasterBasemap stops={stops} legs={legs} onReady={ignoreMapHandle} />}
    </details>}
    <ol>{day.segments.filter(segment => !segment.idea).map(segment => <li key={segment.id}>
      <strong>{segment.title}</strong>
      {segment.note && <p>{segment.note}</p>}
    </li>)}</ol>
    {day.segments.some(segment => segment.idea) && <section aria-label={t('Trip ideas')}>
      <h3>{t('Trip ideas')}</h3>
      <ul>{day.segments.filter(segment => segment.idea).map(segment => <li key={segment.id}>{segment.title}</li>)}</ul>
    </section>}
  </section>;
}

export default function AccountTripPage() {
  const { id } = useParams();
  const [loaded, setLoaded] = useState<{ id: string; trip: AccountTrip | null }>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<TripExport>();
  useEffect(() => {
    if (!id) return;
    const request = new AbortController();
    void openAccountTrip(id, request.signal).then(
      trip => { if (!request.signal.aborted) setLoaded({ id, trip }); },
      () => { if (!request.signal.aborted) setLoaded({ id, trip: null }); },
    );
    return () => request.abort();
  }, [id]);
  if (!loaded || loaded.id !== id) return <p role="status">{t('Loading…')}</p>;
  const { trip } = loaded;
  if (!trip) return <p role="alert">{t('Could not open the account trip.')}</p>;
  async function exportTrip(tripId: string, kind: TripExport) {
    setExporting(true);
    setExportError(undefined);
    try {
      downloadFile(await fetchTripExport(tripId, kind), tripExportFiles[kind].filename);
    } catch {
      setExportError(kind);
    } finally {
      setExporting(false);
    }
  }
  return <TripView trip={trip}>
    <div className="trip-saved-actions">
    <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'calendar')}>
      {t('Export calendar')}
    </button>
    <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'json')}>{t('Export JSON')}</button>
    <TripTemplateAction getTrip={() => trip} />
    {'legacyRouteId' in trip.meta && Boolean(trip.meta.legacyRouteId) &&
      <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'legacy')}>{t('Export original route')}</button>}
    </div>
    {exportError && <p role="alert">{exportError === 'calendar' ? t('Could not export the calendar.')
      : exportError === 'pdf' ? t('Could not export PDF.') : t('Could not export trip JSON.')}</p>}
    {trip.budget?.limit && <p>{t('Trip budget')} · {trip.budget.limit.amount} {trip.budget.limit.currency}</p>}
  </TripView>;
}

export function SharedTripPage() {
  const [params] = useSearchParams();
  const data = params.get('data') ?? '';
  const [loaded, setLoaded] = useState<{ data: string; trip: SharedTrip | null }>();
  const [openedFile, setOpenedFile] = useState<SharedTrip | null>();
  useEffect(() => {
    if (!data) return;
    let current = true;
    void readTripShare(data).then(
      trip => { if (current) setLoaded({ data, trip }); },
      () => { if (current) setLoaded({ data, trip: null }); },
    );
    return () => { current = false; };
  }, [data]);
  if (!data) return openedFile ? <TripView trip={openedFile} /> : <main className="journey-main">
    <label>{t('Open trip file')} <input type="file" accept=".json,application/json" onChange={event => {
      const file = event.currentTarget.files?.[0];
      if (file) void readTripShareFile(file).then(setOpenedFile, () => setOpenedFile(null));
    }} /></label>
    {openedFile === null && <p role="alert">{t('Could not open the trip file.')}</p>}
  </main>;
  if (!loaded || loaded.data !== data) return <p role="status">{t('Loading…')}</p>;
  if (!loaded.trip) return <p role="alert">{t('Could not open the trip link.')}</p>;
  return <TripView trip={loaded.trip} />;
}

function TripView({ trip, children }: { trip: SharedTrip; children?: React.ReactNode }) {
  const [focusStopId, setFocusStopId] = useState<string>();
  const cities = new Map(trip.cities.map(city => [city.id, city.name]));
  const lodgings = new Map(trip.accommodations.map(lodging => [lodging.id, lodging]));
  return <main className="journey-main journey-main--travel trip-saved">
    <header className="trip-saved-heading">
      <p><time dateTime={trip.days[0]?.date}>{trip.days[0]?.date}</time>
        {trip.days.length > 1 && <> – <time dateTime={trip.days.at(-1)?.date}>{trip.days.at(-1)?.date}</time></>}</p>
      <h1>{trip.title}</h1>
      {children}
    </header>
    <TripCityMap cities={trip.cities} legs={trip.legs} accommodations={trip.accommodations}
      focusStopId={focusStopId} onSelectCity={setFocusStopId} />
    {trip.legs.length > 0 && <details className="trip-saved-transfers">
      <summary>{t('Transfer details')}</summary>
      <ul>{trip.legs.map(leg => <li key={leg.id}>
        {cities.get(leg.fromCityId)} → {cities.get(leg.toCityId)}
        {leg.durationSeconds != null && ` · ${travelDuration(leg.durationSeconds)}`}
        {leg.departureAt && <time dateTime={leg.departureAt}> · {leg.departureAt.replace('T', ' ')}</time>}
      </li>)}</ul>
    </details>}
    <div className="trip-day-timeline">
      {trip.days.map((day, index) => <TripDay key={index} id={`trip-day-${index}`} day={day} city={cities.get(day.cityId)}
        lodging={day.accommodationId ? lodgings.get(day.accommodationId) : undefined} />)}
    </div>
  </main>;
}
