import { useEffect, useRef, useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { requestRoad, requestRoadVia } from '../api/routePlanner';
import { Link } from 'react-router-dom';
import { getLocale, t } from '@/shared/i18n';
import { downloadFile } from '@/shared/files/download';
import type { PlannedLeg } from '../domain/route';
import { sharedTripJson, shareTripUrl } from '../domain/sharedTrip';
import { saveTripToAccount, transferModes, tripPayload, type CityPoint, type LocalTripDraft, type TripDayDraft } from '../api/tripDraft';
import { RouteMap } from './RouteMap';
import { TripWalkImport, type WalkCandidate } from './TripWalkImport';
import { TripTrainSearch } from './TripTrainSearch';
import { TripLodgingEditor } from './TripLodgingEditor';
import { TripSummaryBar } from './TripSummaryBar';
import { TripDetailsEditor } from './TripDetailsEditor';
import { TripTransferEditor } from './TripTransferEditor';
import { TripDistanceTool } from './TripDistanceTool';
import { TripCityMap } from './TripCityMap';
import { RouteAddressInput } from './RouteAddressInput';
import './route.css';

const storageKey = 'codoc/trip-planner/draft/v2';
const noLegs: [] = [];
const ignoreMapHandle = () => undefined;

type TripDay = TripDayDraft;
type Draft = LocalTripDraft;

interface DraftHistory {
  draft: Draft;
  past: Draft[];
  future: Draft[];
}

const emptyDay: TripDay = { stops: [] };
const dayMilliseconds = 86_400_000;

function validLegs(legs: PlannedLeg[] | undefined, stopCount: number) {
  return Array.isArray(legs) && legs.length > 0 && legs.length === stopCount - 1 && legs.every((leg) =>
    leg?.mode === 'foot' && Number.isFinite(leg.durationSeconds) &&
    Array.isArray(leg.coordinates) && leg.coordinates.length >= 2 &&
    leg.coordinates.every((point) => Array.isArray(point) && point.length === 2 &&
      Number.isFinite(point[0]) && Number.isFinite(point[1])));
}

function readDay(day: TripDay | null): TripDay | null {
  if (!day || !Array.isArray(day.stops) || !day.stops.every((stop) =>
    typeof stop?.id === 'string' && typeof stop.label === 'string' &&
    Number.isFinite(stop.longitude) && Number.isFinite(stop.latitude))) return null;
  const walk = day.importedWalk;
  const lodging = day.lodging;
  const train = day.train;
  const point = day.cityPoint;
  const ideas = Array.isArray(day.ideas) ? day.ideas.filter(idea => idea && typeof idea.id === 'string'
    && typeof idea.label === 'string' && Math.abs(idea.latitude) <= 90 && Math.abs(idea.longitude) <= 180) : undefined;
  const transfer = day.transfer;
  const road = transfer?.road;
  const validPoint = (item: CityPoint) => item && Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
    && Math.abs(item.latitude) <= 90 && Math.abs(item.longitude) <= 180;
  const validRoad = road && Number.isFinite(road.durationSeconds) && road.durationSeconds > 0
    && Number.isFinite(road.distanceMeters) && road.distanceMeters >= 0
    && Array.isArray(road.geometry) && road.geometry.length >= 2 && road.geometry.every(validPoint)
    && (road.via === undefined || (Array.isArray(road.via) && road.via.length <= 5 && road.via.every(validPoint)));
  return { stops: day.stops, ideas, city: typeof day.city === 'string' ? day.city : undefined,
    cityPoint: point && Math.abs(point.latitude) <= 85 && Math.abs(point.longitude) <= 180 ? point : undefined,
    importedWalk: walk && typeof walk.title === 'string' && validLegs(walk.legs, day.stops.length) ? walk : undefined,
    route: validLegs(day.route, day.stops.length) ? day.route : undefined,
    lodging: lodging && typeof lodging.name === 'string' && typeof lodging.address === 'string'
      && typeof lodging.checkIn === 'string' && typeof lodging.checkOut === 'string'
      && lodging.checkIn < lodging.checkOut ? lodging : undefined,
    train: train && [train.number, train.title, train.from, train.to, train.departure, train.arrival]
      .every(value => typeof value === 'string') && Date.parse(train.departure) <= Date.parse(train.arrival)
      && [train.fromCity, train.toCity].every(value => value === undefined || typeof value === 'string')
      ? train : undefined,
    transfer: transfer && transferModes.includes(transfer.transport)
      && [transfer.from, transfer.to, transfer.departure, transfer.arrival].every(value => typeof value === 'string')
      && Date.parse(transfer.departure) < Date.parse(transfer.arrival)
      ? { ...transfer, road: transfer.transport === 'CAR' && validRoad ? road : undefined } : undefined };
}

function readDraft(): Draft {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as (Partial<Draft> & Partial<TripDay>) | null;
    if (stored?.version === 2 && typeof stored.startDate === 'string' && typeof stored.endDate === 'string') {
      const legacy = readDay(stored as TripDay);
      const days: Draft['days'] = legacy ? { 1: legacy } : {};
      for (const [key, value] of Object.entries(stored.days ?? {})) {
        const day = readDay(value);
        if (day && /^[1-9]\d*$/.test(key) && Number.isSafeInteger(Number(key))) days[Number(key)] = day;
      }
      const id = typeof stored.id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(stored.id) ? stored.id : crypto.randomUUID();
      const budget = stored.budget && Number.isFinite(stored.budget.amount) && stored.budget.amount >= 0
        && /^[A-Z]{3}$/.test(stored.budget.currency) ? stored.budget : undefined;
      const documents = Array.isArray(stored.documents) ? stored.documents.filter(document =>
        typeof document?.id === 'string' && typeof document.title === 'string' && typeof document.url === 'string') : undefined;
      return { id, version: 2, startDate: stored.startDate, endDate: stored.endDate, days,
        title: typeof stored.title === 'string' ? stored.title.slice(0, 180) : undefined, budget, documents };
    }
  } catch {
    // A damaged or unavailable local store cannot prevent opening the planner.
  }
  return { id: crypto.randomUUID(), version: 2, startDate: '', endDate: '', days: {} };
}

export default function TripPlannerDraft() {
  const [{ draft, past, future }, setHistory] = useState<DraftHistory>(() => ({
    draft: readDraft(), past: [], future: [],
  }));
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [share, setShare] = useState<{ draft: Draft; url: string }>();
  const [fileShare, setFileShare] = useState<Draft>();
  const [selectedDay, setSelectedDay] = useState(1);
  const [choosingCity, setChoosingCity] = useState(false);
  const [placingCities, setPlacingCities] = useState(true);
  const cityInput = useRef<HTMLInputElement>(null);
  const [measuring, setMeasuring] = useState(false);
  const [showingCities, setShowingCities] = useState(true);
  const [editingTransfer, setEditingTransfer] = useState(false);
  const [lodgingToEdit, setLodgingToEdit] = useState<number>();
  const duration = Math.max(0, (Date.parse(draft.endDate) - Date.parse(draft.startDate)) / dayMilliseconds + 1) || 0;
  const lastPlannedDay = Math.max(1, ...Object.keys(draft.days).map(Number));
  const lastDay = Math.max(duration, lastPlannedDay);
  const dayNumber = Math.min(selectedDay, lastDay);
  const day = draft.days[dayNumber] ?? emptyDay;
  const title = draft.title?.trim() || t('Travel planner');
  const hasCityPins = Object.values(draft.days).some(details => details.cityPoint || details.transfer?.road?.geometry.length
    || (details.lodging?.latitude != null && details.lodging.longitude != null));
  const cityMap = showingCities && hasCityPins && duration >= 2 && lastPlannedDay <= duration
    ? tripPayload(draft, title) : undefined;
  const cityPins = Object.entries(draft.days).flatMap(([number, details]) => details.cityPoint ? [{
    ...details.cityPoint, id: number, name: details.city?.trim() || `${t('City')} ${number}`,
  }] : []);
  const hasDayPlan = Boolean(day.city || day.cityPoint || day.stops.length || day.train || day.transfer || day.lodging);
  const dayDate = new Date(Date.parse(draft.startDate) + (dayNumber - 1) * dayMilliseconds);
  const [preview, setPreview] = useState<WalkCandidate | null>(null);
  const pinRequest = useRef<AbortController>();
  useEffect(() => () => pinRequest.current?.abort(), []);
  function persist(next: Draft) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStatus(t('Trip saved on this device.'));
    } catch {
      setStatus(t('Could not save the trip on this device.'));
    }
  }

  function edit(changes: Partial<Draft>) {
    pinRequest.current?.abort();
    setStatus('');
    setHistory((previous) => ({
      draft: { ...previous.draft, ...changes },
      past: [...previous.past.slice(-49), previous.draft],
      future: [],
    }));
  }

  async function moveCity(cityPoint: CityPoint) {
    const name = day.city?.trim().toLowerCase();
    const days = { ...draft.days, [dayNumber]: { ...day, cityPoint } };
    const affected = Object.entries(days).flatMap(([number, details]) => {
      const transfer = details.transfer;
      const from = transfer?.from.trim().toLowerCase(), to = transfer?.to.trim().toLowerCase();
      return name && transfer?.transport === 'CAR' && transfer.road && (from === name || to === name)
        ? [{ number: Number(number), details, transfer, from, to }] : [];
    });
    if (!affected.length) { editDay({ cityPoint }, true); return; }
    pinRequest.current?.abort();
    const controller = new AbortController();
    pinRequest.current = controller;
    setStatus(t('Loading…'));
    const pointFor = (city: string | undefined) => city === name ? cityPoint
      : Object.values(days).find(details => details.city?.trim().toLowerCase() === city && details.cityPoint)?.cityPoint;
    try {
      for (const { number, details, transfer, from, to } of affected) {
        const origin = pointFor(from), destination = pointFor(to);
        if (!origin || !destination) throw new Error('Missing transfer endpoint');
        const via = transfer.road?.via;
        const result = via?.length ? await requestRoadVia(origin, destination, via, controller.signal)
          : await requestRoad(origin, destination, 'car', controller.signal);
        if (controller.signal.aborted) return;
        const zone = transfer.arrivalZone || transfer.arrival.match(/(?:Z|[+-]\d\d:\d\d)$/)?.[0] || 'UTC';
        const arrival = Temporal.Instant.from(transfer.departure).add({ seconds: Math.ceil(result.durationSeconds) })
          .toZonedDateTimeISO(zone === 'Z' ? 'UTC' : zone).toString({ timeZoneName: 'never' });
        days[number] = { ...details, transfer: { ...transfer, arrival, road: {
          geometry: result.coordinates.map(([longitude, latitude]) => ({ longitude, latitude })),
          distanceMeters: result.distanceMeters, durationSeconds: result.durationSeconds, via,
        } } };
      }
      if (!controller.signal.aborted) {
        pinRequest.current = undefined;
        edit({ days });
        persist({ ...draft, days });
      }
    } catch {
      if (!controller.signal.aborted) setStatus(t('The road route could not be calculated. Try closer stops or retry later.'));
    } finally {
      if (pinRequest.current === controller) pinRequest.current = undefined;
    }
  }

  function editDay(changes: Partial<TripDay>, saveImmediately = false) {
    const next = { ...day, ...changes };
    const days = { ...draft.days };
    if (next.stops.length || next.ideas?.length || next.city?.trim() || next.cityPoint || next.lodging || next.train || next.transfer) days[dayNumber] = next;
    else delete days[dayNumber];
    edit({ days });
    if (saveImmediately) persist({ ...draft, days });
  }

  function addCity(point?: CityPoint) {
    const target = point && !day.cityPoint ? dayNumber : lastPlannedDay + 1;
    const next = { ...draft, days: { ...draft.days,
      [target]: point ? { ...(draft.days[target] ?? emptyDay), cityPoint: point } : { ...emptyDay } } };
    edit({ days: next.days });
    selectDay(target);
    if (point) persist(next);
    else requestAnimationFrame(() => cityInput.current?.focus());
  }

  function undo() {
    if (!past.length) return;
    pinRequest.current?.abort();
    const next = past[past.length - 1];
    setPreview(null);
    setHistory({ draft: next, past: past.slice(0, -1), future: [draft, ...future] });
    persist(next);
  }

  function redo() {
    if (!future.length) return;
    pinRequest.current?.abort();
    const next = future[0];
    setPreview(null);
    setHistory({ draft: next, past: [...past, draft], future: future.slice(1) });
    persist(next);
  }

  function selectDay(next: number) {
    setChoosingCity(false);
    setEditingTransfer(false);
    setStatus('');
    setPreview(null);
    setSelectedDay(next);
  }

  function validDates() {
    if (duration < 2) {
      setStatus(t('Choose at least two days for the trip.'));
      return false;
    }
    if (lastPlannedDay > duration) {
      setStatus(t('Some planned days are outside the trip dates.'));
      return false;
    }
    const start = Date.parse(draft.startDate);
    const shiftedTransfer = Object.entries(draft.days).some(([number, details]) => {
      const departure = (details.train ?? details.transfer)?.departure;
      return departure && departure.slice(0, 10) !== new Date(start + (Number(number) - 1) * dayMilliseconds)
        .toISOString().slice(0, 10);
    });
    if (shiftedTransfer) {
      setStatus(t('Update transfers after changing the trip dates.'));
      return false;
    }
    return true;
  }

  async function saveAccount() {
    if (!validDates() || saving) return;
    persist(draft);
    setSaving(true);
    try {
      await saveTripToAccount(draft, title);
      setAccountSaved(true);
      setStatus(t('Trip saved to account.'));
    } catch {
      setStatus(t('Could not save the trip to your account.'));
    } finally {
      setSaving(false);
    }
  }

  async function createShare() {
    if (!validDates() || sharing) return;
    setSharing(true);
    try {
      const url = await shareTripUrl(tripPayload(draft, title), window.location.origin);
      if (url) {
        setShare({ draft, url });
        setStatus('');
      } else {
        setFileShare(draft);
        setStatus(t('The trip link is too long. Download the share file.'));
      }
    } catch {
      setFileShare(draft);
      setStatus(t('Could not create the trip link.'));
    } finally {
      setSharing(false);
    }
  }
  return (
    <section className="trip-planner" aria-label={t('Travel planner')}>
      <header className="trip-planner-header">
        <h2>{t('Travel planner')}</h2>
      </header>
      <div className="trip-planner-grid">
        <div className="trip-planner-overview">
          <div className="trip-map-actions">
            <button type="button" aria-expanded={showingCities}
              onClick={() => setShowingCities(true)}>{t('Trip map')}</button>
            <button type="button" aria-pressed={!showingCities} onClick={() => {
              setShowingCities(false);
              setChoosingCity(false);
              cityInput.current?.focus();
            }}>{t('City list')}</button>
            {showingCities && <button type="button" aria-pressed={placingCities} onClick={() => {
              setShowingCities(true);
              setPlacingCities(!placingCities);
              setChoosingCity(false);
            }}>{t('Add cities on the map')}</button>}
          </div>
          {showingCities && !choosingCity && <TripCityMap cities={cityMap?.cities ?? cityPins}
            legs={cityMap?.legs ?? []} accommodations={cityMap?.accommodations}
            onPick={placingCities ? point => addCity(point) : undefined}
            focusStopId={placingCities ? undefined : cityMap?.days.find(item => dayDate.toISOString().startsWith(item.date))?.cityId ?? String(dayNumber)}
            onChangeLodging={id => {
              const number = Number(id.replace('lodging-', ''));
              selectDay(number);
              setLodgingToEdit(number);
            }} />}
          <TripSummaryBar rows={Object.entries(draft.days).map(([number, details]) => ({
            id: number, place: details.city?.trim() || `${t('Trip day')} ${number}`, lodging: details.lodging,
            onSelect: () => {
              selectDay(Number(number));
              if (details.cityPoint) {
                setShowingCities(true);
                setPlacingCities(false);
              }
            },
            onFindHotel: details.city?.trim() ? () => {
              selectDay(Number(number));
              setLodgingToEdit(Number(number));
            } : undefined,
          }))} />
        </div>
        <div className="trip-planner-day">
          <fieldset>
            <legend>{t('Trip day')}</legend>
            <button type="button" disabled={dayNumber <= 1} onClick={() => selectDay(dayNumber - 1)}>{t('Previous day')}</button>
            <span aria-live="polite">
              {' '}{dayNumber} / {lastDay}
              {Number.isFinite(dayDate.getTime()) && (
                <> · <time dateTime={dayDate.toISOString().split('T')[0]}>
                  {dayDate.toLocaleDateString(getLocale(), { timeZone: 'UTC', dateStyle: 'medium' })}
                </time></>
              )}{' '}
            </span>
            <button type="button" disabled={dayNumber >= lastDay} onClick={() => selectDay(dayNumber + 1)}>{t('Next day')}</button>
            <RouteAddressInput key={dayNumber} inputRef={cityInput} label={t('City')} value={day.city ?? ''}
              onConfirmText={city => editDay({ city }, true)}
              onSelect={({ label, latitude, longitude }) => {
                setPlacingCities(false);
                if (label.trim().toLowerCase() === day.city?.trim().toLowerCase()) void moveCity({ latitude, longitude });
                else editDay({ city: label, cityPoint: { latitude, longitude } }, true);
              }} />
            <button type="button" aria-pressed={choosingCity} onClick={() => setChoosingCity(!choosingCity)}>
              {choosingCity ? t('Cancel') : t('Choose on map')}
            </button>
            {choosingCity && <RouteMap
              stops={day.cityPoint ? [{ ...day.cityPoint, id: `city-${dayNumber}`,
                label: day.city?.trim() || t('City'), zone: 'UTC', stayMinutes: 0 }] : []}
              legs={noLegs} onReady={ignoreMapHandle} cityMap
              onPick={choosingCity ? cityPoint => { void moveCity(cityPoint); setChoosingCity(false); } : undefined}
              onStopMove={day.cityPoint ? (_id, cityPoint) => void moveCity(cityPoint) : undefined}
            />}
            {day.cityPoint && <button type="button" onClick={() => editDay({ cityPoint: undefined }, true)}>
              {t('Remove map pin')}
            </button>}
            <button type="button" onClick={() => addCity()}>{t('Add city')}</button>
          </fieldset>
          <button type="button" aria-expanded={measuring} onClick={() => setMeasuring(!measuring)}>
            {t('Measure distance')}
          </button>
          {measuring && <TripDistanceTool />}
          {Boolean(day.ideas?.length) && <ul aria-label={t('Trip ideas')}>{day.ideas?.map(idea => <li key={idea.id}>
            {idea.label}{' '}<button type="button" onClick={() =>
              editDay({ ideas: day.ideas?.filter(item => item.id !== idea.id) }, true)}>{t('Remove')}</button>
          </li>)}</ul>}
          <TripWalkImport key={dayNumber} onPreview={setPreview} />
          {hasDayPlan && Number.isFinite(dayDate.getTime()) && (
            <>
              <TripTrainSearch key={dayDate.getTime()} date={dayDate.toISOString().split('T')[0]}
                selected={day.train} onSelect={train => editDay({ train, transfer: train ? undefined : day.transfer }, true)} />
              {day.transfer && <p>{day.transfer.from} {' → '} {day.transfer.to}{' '}
                <button type="button" onClick={() => editDay({ transfer: undefined }, true)}>{t('Remove')}</button>
              </p>}
              <button type="button" aria-expanded={editingTransfer} onClick={() => setEditingTransfer(!editingTransfer)}>
                {editingTransfer ? t('Cancel') : t('Enter transfer manually')}
              </button>
              {editingTransfer && <TripTransferEditor key={`transfer-${dayDate.getTime()}`} date={dayDate.toISOString().split('T')[0]}
                city={draft.days[dayNumber - 1]?.city || day.city} destination={draft.days[dayNumber - 1]?.city ? day.city : undefined} pins={Object.values(draft.days).flatMap(details => details.city && details.cityPoint
                  ? [{ name: details.city, point: details.cityPoint }] : [])}
                onSave={transfer => { editDay({ transfer, train: undefined }, true); setEditingTransfer(false); }} />}
              <TripLodgingEditor key={`${dayDate.getTime()}-${JSON.stringify(day.lodging)}`}
                date={dayDate.toISOString().split('T')[0]} city={day.city} cityPoint={day.cityPoint} lodging={day.lodging}
                focus={lodgingToEdit === dayNumber} onFocusHandled={() => setLodgingToEdit(undefined)}
                onSave={lodging => editDay({ lodging }, true)} />
            </>
          )}
          {!preview && day.importedWalk && <p>{day.importedWalk.title}</p>}
          {preview && <div>
            <strong>{preview.title}</strong>
            <button type="button" onClick={() => {
              editDay({ stops: preview.stops, importedWalk: { title: preview.title, legs: preview.legs }, route: undefined }, true);
              setPreview(null);
            }}>{day.stops.length ? t('Replace day stops') : t('Use this walk')}</button>
            <button type="button" onClick={() => setPreview(null)}>{t('Cancel')}</button>
          </div>}
          <button type="button" onClick={undo} disabled={!past.length}>{t('Undo')}</button>
          <button type="button" onClick={redo} disabled={!future.length}>{t('Redo')}</button>
          {(preview || day.stops.length > 0) && <RouteMap
            stops={preview?.stops ?? day.stops}
            legs={preview?.legs ?? day.importedWalk?.legs ?? day.route ?? noLegs}
            onReady={ignoreMapHandle}
          />}
          {!preview && day.stops.length > 0 && <>
            <ol>{day.stops.map(stop => <li key={stop.id}>{stop.label}</li>)}</ol>
            <button type="button" onClick={() => editDay({
              stops: [], importedWalk: undefined, route: undefined,
            }, true)}>{t('Remove walk from day')}</button>
          </>}
        </div>
      </div>
      <div className="trip-planner-dates">
        <label>{t('Trip name')} <input maxLength={180} value={draft.title ?? ''}
          onChange={event => edit({ title: event.target.value })} /></label>
        <label>{t('Start date')} <input type="date" value={draft.startDate} onChange={(event) => edit({ startDate: event.target.value })} /></label>
        <label>{t('End date')} <input type="date" value={draft.endDate} onChange={(event) => edit({ endDate: event.target.value })} /></label>
      </div>
      <div className="trip-planner-details">
        <TripDetailsEditor budget={draft.budget} documents={draft.documents ?? []}
          costs={Object.values(draft.days).flatMap(details =>
            [details.transfer?.cost, details.lodging?.cost].filter(cost => cost !== undefined))}
          onChange={edit} />
      </div>
      <footer className="trip-planner-actions">
        <button type="button" onClick={() => { if (validDates()) persist(draft); }}>{t('Save')}</button>
        <button type="button" onClick={() => {
          if (!validDates()) return;
          const json = JSON.stringify(tripPayload(draft, title), null, 2);
          downloadFile(new Blob([json], { type: 'application/json' }), `trip-${draft.startDate}.json`);
        }}>{t('Export JSON')}</button>
        <button type="button" disabled={sharing} onClick={() => void createShare()}>{t('Share')}</button>
        {share?.draft === draft && <input aria-label={t('Trip link')} readOnly value={share.url}
          onFocus={event => event.currentTarget.select()} />}
        {fileShare === draft && <button type="button" onClick={() => {
          try {
            const json = sharedTripJson(tripPayload(draft, title));
            downloadFile(new Blob([json], { type: 'application/json' }), `shared-trip-${draft.startDate}.json`);
          } catch {
            setStatus(t('Could not create the trip link.'));
          }
        }}>{t('Download share file')}</button>}
        <button type="button" disabled={saving} onClick={() => void saveAccount()}>{t('Save trip to account')}</button>
        {accountSaved && <Link to={`/trip/${draft.id}`}>{t('Open account trip')}</Link>}
      </footer>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
