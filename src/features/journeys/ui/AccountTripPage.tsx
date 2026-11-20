import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { downloadFile } from '@/shared/files/download';
import { fetchTripExport, openAccountTrip, tripExportFiles, type AccountTrip, type TripExport } from '../api/tripDraft';
import { RouteMap } from './RouteMap';
import { TripCityMap } from './TripCityMap';
import type { PlannedLeg } from '../domain/route';
import { TripSummaryBar } from './TripSummaryBar';
import { readTripShare, readTripShareFile, type SharedTrip } from '../domain/sharedTrip';
import './route.css';

const ignoreMapHandle = () => undefined;

function TripDay({ day, city, id }: { day: SharedTrip['days'][number]; city: string | undefined; id: string }) {
  const stops = day.segments.flatMap(segment => segment.idea || segment.latitude == null || segment.longitude == null ? [] : [{
    id: segment.id, label: segment.title, latitude: segment.latitude, longitude: segment.longitude,
    zone: 'UTC', stayMinutes: 0,
  }]);
  const legs = (day.walkingSections ?? []).map((section): PlannedLeg => ({
    mode: 'foot', distanceMeters: section.distanceMeters, durationSeconds: section.durationSeconds,
    coordinates: section.geometry.map(({ longitude, latitude }) => [longitude, latitude]),
  }));
  return <section id={id}>
    <h2>{[day.date, city].filter(Boolean).join(' · ')}</h2>
    {day.note && <p>{day.note}</p>}
    {stops.length > 0 && <RouteMap stops={stops} legs={legs} onReady={ignoreMapHandle} />}
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
    <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'calendar')}>
      {t('Export calendar')}
    </button>
    <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'pdf')}>{t('Download PDF')}</button>
    <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'json')}>{t('Export JSON')}</button>
    {'legacyRouteId' in trip.meta && Boolean(trip.meta.legacyRouteId) &&
      <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'legacy')}>{t('Export original route')}</button>}
    {exportError && <p role="alert">{exportError === 'calendar' ? t('Could not export the calendar.')
      : exportError === 'pdf' ? t('Could not export PDF.') : t('Could not export trip JSON.')}</p>}
    {trip.budget?.limit && <p>{t('Trip budget')} · {trip.budget.limit.amount} {trip.budget.limit.currency}</p>}
    {trip.documents.length > 0 && <section>
      <h2>{t('Documents')}</h2>
      <ul>{trip.documents.map(document => <li key={document.id}>
        {/^https?:\/\//i.test(document.url)
          ? <a href={document.url} rel="noreferrer" target="_blank">{document.title}</a> : document.title}
      </li>)}</ul>
    </section>}
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
  const accommodations = new Map(trip.accommodations.map(lodging => [lodging.id, lodging]));
  return <main className="journey-main journey-main--travel">
    <h1>{trip.title}</h1>
    {children}
    <TripCityMap cities={trip.cities} legs={trip.legs} accommodations={trip.accommodations} focusStopId={focusStopId} />
    <TripSummaryBar rows={trip.days.map((day, index) => ({
      id: String(index), place: cities.get(day.cityId) || day.date || `${t('Trip day')} ${index + 1}`,
      lodging: day.accommodationId ? accommodations.get(day.accommodationId) : undefined,
      onSelect: () => {
        setFocusStopId(day.cityId);
        document.getElementById(`trip-day-${index}`)?.scrollIntoView({ block: 'start' });
      },
    }))} />
    {trip.legs.length > 0 && <ol>{trip.legs.map(leg => <li key={leg.id}>
      <strong>{leg.note}</strong>{' '}
      {cities.get(leg.fromCityId)} <time dateTime={leg.departureAt}>{leg.departureAt}</time>
      {' → '}{cities.get(leg.toCityId)} <time dateTime={leg.arrivalAt}>{leg.arrivalAt}</time>
    </li>)}</ol>}
    {trip.days.map((day, index) => <TripDay key={index} id={`trip-day-${index}`} day={day} city={cities.get(day.cityId)} />)}
  </main>;
}
