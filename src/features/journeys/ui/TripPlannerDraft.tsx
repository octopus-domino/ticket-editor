import timezone from 'tz-lookup';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { requestRoad, requestRoadVia } from '../api/routePlanner';
import { Link } from 'react-router-dom';
import { getLocale, t } from '@/shared/i18n';
import { downloadFile } from '@/shared/files/download';
import { TripTemplateAction } from './TripTemplateAction';
import { geographicDistance } from '../domain/route';
import { sharedTripJson, shareTripUrl } from '../domain/sharedTrip';
import { saveTripToAccount, TripAccountSaveError, tripLocations, tripPayload, type PointTransport, type CityPoint, type LocalTripDraft, type TripDayDraft, type TripVisit, type TripTrain } from '../api/tripDraft';
import { RouteMap } from './RouteMap';
import { TripWalkImport, type WalkCandidate } from './TripWalkImport';
import { TripTrainSearch } from './TripTrainSearch';
import { TripLodgingEditor } from './TripLodgingEditor';
import { TripHotelSearch, type TripHotelMapState } from './TripHotelSearch';
import { tripDayDate } from '../domain/planner/travelTimes';
import { DayPlanningPanel, type DayMapPlan } from './DayPlanningPanel';
import { TripSummaryBar } from './TripSummaryBar';
import { useTripConnections } from './useTripConnections';
import { TripDetailsEditor } from './TripDetailsEditor';
import { TripTransferEditor } from './TripTransferEditor';
import { TripCityMap } from './TripCityMap';
import { RouteAddressInput } from './RouteAddressInput';
import { readDraft, tripDraftStorageKey } from '../domain/planner/draftMigration';
import { plannerReducer } from '../domain/planner/plannerReducer';
import './route.css';

const noLegs: [] = [];
const ignoreMapHandle = () => undefined;

type TripDay = TripDayDraft;
type Draft = LocalTripDraft;

const emptyDay: TripDay = { stops: [] };
const dayMilliseconds = 86_400_000;

export default function TripPlannerDraft() {
  const [{ draft, past, future }, dispatch] = useReducer(plannerReducer, undefined, () => ({
    draft: readDraft(), past: [], future: [],
  }));
  const [pendingDates, setPendingDates] = useState<Pick<Draft, 'startDate' | 'endDate'>>();
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [share, setShare] = useState<{ draft: Draft; url: string }>();
  const [fileShare, setFileShare] = useState<Draft>();
  const [mobileTab, setMobileTab] = useState<'plan' | 'map' | 'summary'>('plan');
  const [dayMap, setDayMap] = useState<DayMapPlan>();
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedDayId, setSelectedDayId] = useState<string>();
  const [selectedVisit, setSelectedVisit] = useState<string>();
  const [choosingCity, setChoosingCity] = useState(false);
  const [placingCities, setPlacingCities] = useState(false);
  const [pendingMapPoint, setPendingMapPoint] = useState<CityPoint>();
  const cityInput = useRef<HTMLInputElement>(null);
  const startDateInput = useRef<HTMLInputElement>(null);
  const [focusedDay, setFocusedDay] = useState<number>();
  const [showingCities, setShowingCities] = useState(true);
  const [editingTransfer, setEditingTransfer] = useState(false);
  const mapCenter = useRef<CityPoint>();
  const [hotelMap, setHotelMap] = useState<TripHotelMapState>();
  const [hotelSearchDay, setHotelSearchDay] = useState<number>();
  const duration = Math.max(0, (Date.parse(draft.endDate) - Date.parse(draft.startDate)) / dayMilliseconds + 1) || 0;
  const lastPlannedDay = Math.max(1, ...Object.keys(draft.days).map(Number));
  const lastDay = Math.max(duration, lastPlannedDay);
  const currentDay = selectedDayId && Object.entries(draft.days).find(([, value]) => value.dayId === selectedDayId);
  const dayNumber = currentDay ? Number(currentDay[0]) : Math.min(selectedDay, lastDay);
  const dayDraft = draft.days[dayNumber] ?? emptyDay;
  const extra = dayDraft.visits?.find(visit => visit.id === selectedVisit);
  const day = extra ?? dayDraft;
  const activeLocation = extra?.id ?? String(dayNumber);
  const locations = useMemo(() => tripLocations(draft.days), [draft.days]);
  const title = draft.title?.trim() || t('Travel planner');
  const hasCityPins = locations.some(({ visit }) => visit.cityPoint || visit.transfer?.road?.geometry.length
    || (visit.lodging?.latitude != null && visit.lodging.longitude != null));
  const cityPins = useMemo(() => locations.flatMap(({ id, number, visit }) => visit.cityPoint ? [{
    ...visit.cityPoint, id, number, mode: visit.incomingMode, name: visit.city?.trim() || `${t('City')} ${number}`,
  }] : []), [locations]);
  const { connections, lines } = useTripConnections(cityPins, draft);
  const cityMap = useMemo(() => showingCities && hasCityPins && duration >= 2 && lastPlannedDay <= duration
    ? tripPayload(draft, title) : undefined, [draft, duration, hasCityPins, lastPlannedDay, showingCities, title]);
  const connectionsByDay = new Map(connections.map(connection => [connection.to.id, connection]));
  const hasDayPlan = Boolean(day.city || day.cityPoint || day.stops.length || day.train || day.transfer || day.lodging);
  const dayDate = new Date(Date.parse(draft.startDate) + (dayNumber - 1) * dayMilliseconds);
  const [preview, setPreview] = useState<WalkCandidate | null>(null);
  const pinRequest = useRef<AbortController>();
  useEffect(() => () => pinRequest.current?.abort(), []);
  const lastSaved = useRef(draft);
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  const [localSave, setLocalSave] = useState<'idle' | 'pending' | 'saved' | 'failed'>('idle');
  const persist = useCallback((next: Draft) => {
    try {
      localStorage.setItem(tripDraftStorageKey, JSON.stringify(next));
      lastSaved.current = next;
      setLocalSave('saved');
    } catch {
      setLocalSave('failed');
    }
  }, []);
  useEffect(() => {
    if (draft === lastSaved.current) return;
    setLocalSave('pending');
    const timer = window.setTimeout(() => { if (latestDraft.current === draft) persist(draft); }, 450);
    return () => clearTimeout(timer);
  }, [draft, persist]);
  useEffect(() => {
    const flush = () => {
      if (lastSaved.current !== latestDraft.current) persist(latestDraft.current);
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [persist]);

  function edit(changes: Partial<Draft>) {
    pinRequest.current?.abort();
    setStatus('');
    setAccountSaved(false);
    dispatch({ type: 'edit', changes });
  }

  async function moveCity(cityPoint: CityPoint) {
    if (extra) { editDay({ cityPoint }, true); return; }
    const name = day.city?.trim().toLowerCase();
    const days = { ...draft.days, [dayNumber]: { ...dayDraft, cityPoint } };
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

  function editDay(changes: Partial<TripVisit>, saveImmediately = false) {
    const next = { ...day, ...changes };
    const days = { ...draft.days };
    if (extra) days[dayNumber] = { ...dayDraft, visits: dayDraft.visits?.map(visit =>
      visit.id === extra.id ? { ...visit, ...changes } : visit) };
    else if (next.stops.length || next.ideas?.length || next.city?.trim() || next.cityPoint ||
      next.lodging || next.train || next.transfer || next.planningStops?.length || dayDraft.visits?.length) days[dayNumber] = { ...dayDraft, dayId: dayDraft.dayId ?? crypto.randomUUID(), ...changes };
    else delete days[dayNumber];
    edit({ days });
    if (saveImmediately) persist({ ...draft, days });
  }

  function addVisit(city?: string, cityPoint?: CityPoint) {
    if (!dayDraft.city && !dayDraft.cityPoint) {
      editDay({ city, cityPoint }, true);
      return;
    }
    if (city && day.city?.trim().toLowerCase() === city.trim().toLowerCase()) {
      if (cityPoint) void moveCity(cityPoint);
      return;
    }
    const id = `visit-${crypto.randomUUID()}`;
    const visits = [...(dayDraft.visits ?? []), { id, city, cityPoint, stops: [] }];
    const days = { ...draft.days, [dayNumber]: { ...dayDraft, visits } };
    edit({ days });
    persist({ ...draft, days });
    selectDay(dayNumber, id);
  }

  function chooseTransport(id: string, incomingMode: PointTransport) {
    const target = locations.find(location => location.id === id);
    if (!target) return;
    const current = draft.days[target.number];
    const next = id === String(target.number) ? { ...current, incomingMode }
      : { ...current, visits: current.visits?.map(visit => visit.id === id ? { ...visit, incomingMode } : visit) };
    const days = { ...draft.days, [target.number]: next };
    edit({ days });
    persist({ ...draft, days });
  }

  function chooseTrain(id: string, train: TripTrain) {
    const location = locations.find(item => item.id === id);
    if (!location) return;
    const parent = draft.days[location.number];
    const next = id === String(location.number) ? { ...parent, train }
      : { ...parent, visits: parent.visits?.map(visit => visit.id === id ? { ...visit, train } : visit) };
    edit({ days: { ...draft.days, [location.number]: next } });
  }

  function nextDay() {
    const target = dayNumber + 1;
    if (target > lastDay) {
      const days = { ...draft.days, [target]: { ...emptyDay, dayId: crypto.randomUUID() } };
      const endDate = duration > 0 ? Temporal.PlainDate.from(draft.startDate).add({ days: target - 1 }).toString()
        : draft.endDate;
      edit({ days, endDate });
      persist({ ...draft, days, endDate });
    }
    selectDay(target);
  }

  function undo() {
    if (!past.length) return;
    pinRequest.current?.abort();
    const next = past[past.length - 1];
    setPreview(null);
    setAccountSaved(false);
    setDayMap(undefined);
    dispatch({ type: 'undo' });
    persist(next);
  }

  function redo() {
    if (!future.length) return;
    pinRequest.current?.abort();
    const next = future[0];
    setPreview(null);
    setAccountSaved(false);
    setDayMap(undefined);
    dispatch({ type: 'redo' });
    persist(next);
  }

  function selectDay(next: number, visitId?: string) {
    mapCenter.current = undefined;
    setPendingMapPoint(undefined);
    setDayMap(undefined);
    setSelectedVisit(visitId);
    setChoosingCity(false);
    setEditingTransfer(false);
    setHotelSearchDay(undefined);
    setStatus('');
    setPreview(null);
    setSelectedDay(next);
    setSelectedDayId(draft.days[next]?.dayId);
  }

  function findHotelsFromMap() {
    const center = mapCenter.current;
    const closest = center && showingCities && locations
      .filter(item => item.visit.city && item.visit.cityPoint)
      .map(item => ({ ...item, distance: geographicDistance(center, item.visit.cityPoint!) }))
      .filter(item => item.distance <= 25000)
      .sort((a, b) => a.distance - b.distance || Number(b.id === activeLocation) - Number(a.id === activeLocation))[0];
    if (closest) findHotels(closest.number, closest.id === String(closest.number) ? undefined : closest.id);
    else findHotels(dayNumber, extra?.id);
  }

  function findHotels(number: number, visitId?: string) {
    if (number !== dayNumber || visitId !== selectedVisit) selectDay(number, visitId);
    setShowingCities(true);
    setMobileTab('map');
    setHotelMap(undefined);
    setHotelSearchDay(number);
    const visit = visitId ? draft.days[number]?.visits?.find(item => item.id === visitId) : draft.days[number];
    if (!visit?.cityPoint) setChoosingCity(true);
    if (!draft.startDate) startDateInput.current?.focus();
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
    const shiftedTransfer = locations.some(({ number, visit: details }) => {
      const departure = (details.train ?? details.transfer)?.departure;
      return departure && departure.slice(0, 10) !== tripDayDate(draft.startDate, number);
    });
    if (shiftedTransfer) {
      setStatus(t('Update transfers after changing the trip dates.'));
      return false;
    }
    return true;
  }

  async function saveAccount() {
    if (!validDates() || saving) return;
    const snapshot = draft;
    persist(snapshot);
    setSaving(true);
    setStatus('');
    try {
      await saveTripToAccount(snapshot, title, connections);
      if (latestDraft.current === snapshot) {
        setAccountSaved(true);
        setStatus(t('Trip saved to account.'));
      }
    } catch (error) {
      const code = error instanceof TripAccountSaveError ? error.status : undefined;
      setStatus(!navigator.onLine ? t('You are offline. The trip is saved on this device.')
        : code === 401 || code === 403 ? t('Sign in to save the trip to your account.')
          : code === 409 ? t('The account trip changed. Your edits are saved on this device.')
            : code === 429 ? t('Too many requests. Try saving again shortly.')
              : t('Could not save the trip to your account.'));
    } finally { setSaving(false); }
  }

  async function createShare() {
    if (!validDates() || sharing) return;
    setSharing(true);
    try {
      const url = await shareTripUrl(tripPayload(draft, title, connections), window.location.origin);
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
  const hotelSearch = hotelSearchDay === dayNumber && day.city?.trim() && day.cityPoint && Number.isFinite(dayDate.getTime())
    ? { city: day.city, point: day.cityPoint, checkIn: day.lodging?.checkIn ?? dayDate.toISOString().slice(0, 10),
      checkOut: day.lodging?.checkOut ?? new Date(dayDate.getTime() + dayMilliseconds).toISOString().slice(0, 10) }
    : undefined;

  function applyDates(dates: Pick<Draft, 'startDate' | 'endDate'>) {
    edit(dates);
    persist({ ...draft, ...dates });
    setPendingDates(undefined);
  }

  function requestDates(dates: Pick<Draft, 'startDate' | 'endDate'>) {
    const affected = draft.startDate && locations.some(({ visit }) => visit.lodging || visit.train || visit.transfer);
    if (affected && (dates.startDate !== draft.startDate || dates.endDate !== draft.endDate)) setPendingDates(dates);
    else applyDates(dates);
  }

  function setStartDate(startDate: string) {
    const count = Math.max(2, lastDay);
    requestDates({ startDate, endDate: tripDayDate(startDate, count) ?? '' });
  }

  function reorderDay(from: number, to: number) {
    const days = { ...draft.days };
    const before = days[from], after = days[to];
    days[from] = after ?? emptyDay;
    days[to] = before ?? emptyDay;
    edit({ days });
    persist({ ...draft, days });
    selectDay(to);
    setSelectedDayId(before?.dayId);
  }

  return (
    <section className="trip-planner" aria-label={t('Travel planner')}>
      <header className="trip-planner-header">
        <h2>{t('Travel planner')}</h2>
        {!status && (saving || localSave !== 'idle') && <small role="status">{saving ? t('Saving…') : accountSaved ? t('Trip saved to account.')
          : localSave === 'pending' ? t('Saving…') : localSave === 'saved' ? t('Trip saved on this device.')
            : t('Could not save the trip on this device.')}</small>}
      </header>
      <div className="trip-planner-dates">
        <label>{t('Trip name')} <input maxLength={180} value={draft.title ?? ''}
          onChange={event => edit({ title: event.target.value })} /></label>
        <label>{t('Start date')} <input ref={startDateInput} type="date" value={draft.startDate} onChange={event => setStartDate(event.target.value)} /></label>
        <label>{t('End date')} <input type="date" value={draft.endDate} onChange={event => requestDates({ startDate: draft.startDate, endDate: event.target.value })} /></label>
      </div>
      {pendingDates && <section className="trip-date-review" role="alert">
        <p>{t('Review lodging and transport before changing dates.')}</p>
        <ul>{locations.filter(({ visit }) => visit.lodging || visit.train || visit.transfer).map(({ id, visit }) =>
          <li key={id}>{[visit.city, visit.lodging?.name, visit.train?.title, visit.transfer?.to].filter(Boolean).join(' · ')}</li>)}</ul>
        <button type="button" onClick={() => applyDates(pendingDates)}>{t('Apply')}</button>
        <button type="button" onClick={() => setPendingDates(undefined)}>{t('Cancel')}</button>
      </section>}
      <nav className="trip-workspace-tabs" aria-label={t('Travel planner')}>
        {([['plan', 'City list'], ['map', 'Map'], ['summary', 'Trip overview']] as const).map(([id, label]) =>
          <button key={id} type="button" aria-pressed={mobileTab === id} onClick={() => {
            setMobileTab(id);
            if (id === 'map') setShowingCities(true);
          }}>{t(label)}</button>)}
      </nav>
      <div className="trip-planner-grid" data-hotel-search={Boolean(hotelSearch)} data-mobile-tab={mobileTab}>
        <div className="trip-planner-overview">
          {!hotelSearch && <div className="trip-map-actions">
            <button type="button" aria-expanded={showingCities}
              onClick={() => { setDayMap(undefined); setFocusedDay(undefined); setShowingCities(true); }}>{t('Trip map')}</button>
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
          </div>}
          <div className="trip-map-and-hotel">
            {showingCities && !choosingCity && <TripCityMap cities={cityMap?.cities ?? cityPins}
              legs={cityMap?.legs ?? []} plannedLines={lines} accommodations={cityMap?.accommodations}
              hotelMap={hotelSearch ? hotelMap ?? { stops: [{ ...hotelSearch.point, id: '__day_point__',
                label: hotelSearch.city, zone: 'UTC', stayMinutes: 0 }] } : undefined}
              dayMap={dayMap}
              onPick={placingCities ? setPendingMapPoint : undefined}
              pickedPoint={pendingMapPoint}
              focusStopId={placingCities || focusedDay !== dayNumber ? undefined
                : cityMap?.cities.find(item => item.latitude === day.cityPoint?.latitude
                  && item.longitude === day.cityPoint?.longitude)?.id ?? activeLocation}
              onMapCenter={center => { mapCenter.current = center; }}
              onSelectCity={cityId => {
                const selected = cityMap?.cities.find(item => item.id === cityId);
                const matching = locations.filter(item => item.id === cityId || (selected && item.visit.cityPoint
                  && item.visit.cityPoint.latitude === selected.latitude && item.visit.cityPoint.longitude === selected.longitude));
                const location = matching.find(item => item.id === activeLocation)
                  ?? matching.find(item => item.number === dayNumber) ?? matching[0];
                if (!location) return;
                selectDay(location.number, location.id === String(location.number) ? undefined : location.id);
                setPlacingCities(false);
                setFocusedDay(location.number);
              }}
              onChangeLodging={id => {
                const location = locations.find(item => id === `lodging-${item.id}`);
                if (location) findHotels(location.number, location.id === String(location.number) ? undefined : location.id);
              }} />}
            {placingCities && pendingMapPoint && !hotelSearch && <div className="trip-map-actions">
              <button type="button" onClick={() => {
                addVisit(undefined, pendingMapPoint);
                setPendingMapPoint(undefined);
              }}>{t('Add city')}</button>
              <button type="button" onClick={() => setPendingMapPoint(undefined)}>{t('Cancel')}</button>
            </div>}
            {hotelSearch && <section className="trip-inline-hotels" aria-label={t('Find hotels')}>
              <header>
                <h3>{hotelSearch.city}</h3>
                <button type="button" onClick={() => setHotelSearchDay(undefined)}>{t('Back')}</button>
              </header>
              <TripHotelSearch key={activeLocation} city={hotelSearch.city} cityPoint={hotelSearch.point}
                checkIn={hotelSearch.checkIn} checkOut={hotelSearch.checkOut} radiusMeters={1000} initiallyOpen onMapState={setHotelMap}
                onSelect={lodging => { editDay({ lodging }, true); setHotelSearchDay(undefined); }} />
            </section>}
          </div>
        </div>
        <aside className="trip-planner-summary">
          <TripSummaryBar days={Array.from({ length: Math.min(lastDay, 366) }, (_, index) => {
            const number = index + 1;
            const timestamp = Date.parse(draft.startDate) + index * dayMilliseconds;
            const date = Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : undefined;
            return { number, date, selected: number === dayNumber,
              onSelect: () => selectDay(number),
              onMoveEarlier: number > 1 ? () => reorderDay(number, number - 1) : undefined,
              onMoveLater: number < lastDay ? () => reorderDay(number, number + 1) : undefined,
              rows: locations.filter(item => item.number === number && (item.visit.city || item.visit.cityPoint)).map(({ id, visit }) => {
                const visitId = id === String(number) ? undefined : id;
                return {
                  id, place: visit.city?.trim() || t('City'), lodging: visit.lodging,
                  connection: connectionsByDay.get(id), onChooseTransport: mode => chooseTransport(id, mode),
                  onChooseTrain: train => chooseTrain(id, train),
                  onSelect: () => {
                    selectDay(number, visitId);
                    if (visit.cityPoint) { setPlacingCities(false); setFocusedDay(number); }
                  },
                  onFindHotel: visit.city?.trim() && id !== activeLocation ? () => findHotels(number, visitId) : undefined,
                };
              }),
            };
          })} />
        </aside>
        {!hotelSearch && <div className="trip-planner-day">
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
            <button type="button" onClick={nextDay}>{t('Next day')}</button>
            <RouteAddressInput key={activeLocation} inputRef={cityInput} label={t('City')} confirmLabel={t('Add city')} value={day.city ?? ''}
              onConfirmText={city => addVisit(city)}
              onSelect={({ label, latitude, longitude }) => {
                setPlacingCities(false);
                addVisit(label, { latitude, longitude });
              }} />
            <button type="button" aria-pressed={choosingCity} onClick={() => setChoosingCity(!choosingCity)}>
              {choosingCity ? t('Cancel') : t('Choose on map')}
            </button>
            {choosingCity && <RouteMap rasterBasemap
              stops={day.cityPoint ? [{ ...day.cityPoint, id: `city-${dayNumber}`,
                label: day.city?.trim() || t('City'), zone: 'UTC', stayMinutes: 0 }] : []}
              legs={noLegs} onReady={ignoreMapHandle} cityMap
              onPick={choosingCity ? cityPoint => { void moveCity(cityPoint); setChoosingCity(false); } : undefined}
              onStopMove={day.cityPoint ? (_id, cityPoint) => void moveCity(cityPoint) : undefined}
            />}
            {day.cityPoint && <button type="button" onClick={() => editDay({ cityPoint: undefined }, true)}>
              {t('Remove map pin')}
            </button>}
          </fieldset>
          {day.city?.trim() && <button className="journey-primary" type="button" onClick={findHotelsFromMap}>
            {t('Find hotels')}
          </button>}
          <DayPlanningPanel key={`program-${activeLocation}`} stops={day.planningStops} preferences={day.dayPreferences}
            date={Number.isFinite(dayDate.getTime()) ? dayDate.toISOString().slice(0, 10) : undefined}
            zone={day.cityPoint ? timezone(day.cityPoint.latitude, day.cityPoint.longitude) : Intl.DateTimeFormat().resolvedOptions().timeZone}
            onMap={plan => {
              setDayMap(plan);
              if (plan) { setShowingCities(true); setChoosingCity(false); }
            }}
            onChange={(planningStops, dayPreferences) => editDay({ planningStops, dayPreferences })} />
          {Boolean(day.ideas?.length) && <ul aria-label={t('Trip ideas')}>{day.ideas?.map(idea => <li key={idea.id}>
            {idea.label}{' '}<button type="button" onClick={() =>
              editDay({ ideas: day.ideas?.filter(item => item.id !== idea.id) }, true)}>{t('Remove')}</button>
          </li>)}</ul>}
          <TripWalkImport key={activeLocation} point={day.cityPoint} address={day.city} onPreview={setPreview} />
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
                city={draft.days[dayNumber - 1]?.city || day.city} destination={draft.days[dayNumber - 1]?.city ? day.city : undefined} pins={locations.flatMap(({ visit: details }) => details.city && details.cityPoint
                  ? [{ name: details.city, point: details.cityPoint }] : [])}
                onSave={transfer => { editDay({ transfer, train: undefined }, true); setEditingTransfer(false); }} />}
              <TripLodgingEditor key={`${dayDate.getTime()}-${JSON.stringify(day.lodging)}`}
                date={dayDate.toISOString().split('T')[0]} lodging={day.lodging}
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
          {(preview || day.stops.length > 0) && <RouteMap rasterBasemap
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
        </div>}
      </div>
      <div className="trip-planner-details">
        <TripDetailsEditor budget={draft.budget}
          costs={locations.flatMap(({ visit: details }) =>
            [details.transfer?.cost, details.lodging?.cost].filter(cost => cost !== undefined))}
          onChange={edit} />
      </div>
      <footer className="trip-planner-actions">
        <button type="button" onClick={() => { if (validDates()) persist(draft); }}>{t('Save')}</button>
        <button type="button" onClick={() => {
          if (!validDates()) return;
          const json = JSON.stringify(tripPayload(draft, title, connections), null, 2);
          downloadFile(new Blob([json], { type: 'application/json' }), `trip-${draft.startDate}.json`);
        }}>{t('Export JSON')}</button>
        <TripTemplateAction getTrip={() => {
          if (!validDates()) return undefined;
          persist(draft);
          return tripPayload(draft, title, connections);
        }} />
        <button type="button" disabled={sharing} onClick={() => void createShare()}>{t('Share')}</button>
        {share?.draft === draft && <input aria-label={t('Trip link')} readOnly value={share.url}
          onFocus={event => event.currentTarget.select()} />}
        {fileShare === draft && <button type="button" onClick={() => {
          try {
            const json = sharedTripJson(tripPayload(draft, title, connections));
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
