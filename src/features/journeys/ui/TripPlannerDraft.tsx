import timezone from 'tz-lookup';
import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { requestRoad, requestRoadVia } from '../api/routePlanner';
import { Link } from 'react-router-dom';
import { getLocale, t } from '@/shared/i18n';
import { downloadFile } from '@/shared/files/download';
import { TripTemplateAction } from './TripTemplateAction';
import { geographicDistance } from '../domain/route';
import { sharedTripJson, shareTripUrl } from '../domain/sharedTrip';
import { importedStops, saveTripToAccount, TripAccountSaveError, tripLocations, tripPayload, type PointTransport, type CityPoint, type LocalTripDraft, type TripDayDraft, type TripVisit, type TripTrain } from '../api/tripDraft';
import { RouteMap } from './RouteMap';
import { TripWalkImport, type WalkCandidate } from './TripWalkImport';
import { TripTrainSearch } from './TripTrainSearch';
import { TripLodgingEditor } from './TripLodgingEditor';
import { TripHotelSearch, type TripHotelMapState } from './TripHotelSearch';
import { tripDayDate } from '../domain/planner/travelTimes';
import type { DayMapPlan } from './DayPlanningPanel';
import { TripSummaryBar } from './TripSummaryBar';
import { useTripConnections } from './useTripConnections';
import { TripDetailsEditor } from './TripDetailsEditor';
import { TripTransferEditor } from './TripTransferEditor';
import { TripCityMap } from './TripCityMap';
import { RouteAddressInput } from './RouteAddressInput';
import { emptyDraft, readDraft, tripDraftStorageKey } from '../domain/planner/draftMigration';
import { plannerReducer } from '../domain/planner/plannerReducer';
import { TripDayNavigator, TripExperienceShell, tripDateLabel } from './trip-experience/TripExperienceShell';
import './route.css';

const DayPlanningPanel = lazy(() => import('./DayPlanningPanel').then(module => ({ default: module.DayPlanningPanel })));
const noLegs: [] = [];
const ignoreMapHandle = () => undefined;

type TripDay = TripDayDraft;
type Draft = LocalTripDraft;

const emptyDay: TripDay = { stops: [] };
const dayMilliseconds = 86_400_000;
const recentDraftsKey = `${tripDraftStorageKey}/recent`;
type RecentDraft = { id: string; title?: string };

function readRecentDrafts(): RecentDraft[] {
  try {
    const entries: unknown = JSON.parse(localStorage.getItem(recentDraftsKey) ?? '[]');
    return Array.isArray(entries) ? entries.filter(entry => entry && typeof entry.id === 'string') : [];
  } catch { return []; }
}

export default function TripPlannerDraft({ v2 = true, experience = false }: { v2?: boolean; experience?: boolean }) {
  const [{ draft, past, future }, dispatch] = useReducer(plannerReducer, undefined, () => ({
    draft: readDraft(), past: [], future: [],
  }));
  const [pendingDates, setPendingDates] = useState<Pick<Draft, 'startDate' | 'endDate'>>();
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentDrafts, setRecentDrafts] = useState(readRecentDrafts);
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
  const [cityListOpen, setCityListOpen] = useState(false);
  const [placingCities, setPlacingCities] = useState(false);
  const [pendingMapPoint, setPendingMapPoint] = useState<CityPoint>();
  const cityInput = useRef<HTMLInputElement>(null);
  const dateMenu = useRef<HTMLDetailsElement>(null);
  const [focusedDay, setFocusedDay] = useState<number | undefined>(() => {
    const first = draft.days[1];
    return experience && (first?.importedWalk || first?.visits?.some(visit => visit.importedWalk)) ? 1 : undefined;
  });
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
  const hasDayPlan = Boolean(day.city || day.cityPoint || importedStops(day).length || day.train || day.transfer || day.lodging);
  const hasTripPlan = locations.some(({ visit }) => Boolean(visit.city || visit.cityPoint || importedStops(visit).length
    || visit.train || visit.transfer || visit.lodging || visit.planningStops?.length || visit.ideas?.length));
  const firstStop = experience && !hasTripPlan;
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
    else if (next.importedWalk || next.stops.length || next.ideas?.length || next.city?.trim() || next.cityPoint ||
      next.lodging || next.train || next.transfer || next.planningStops?.length || dayDraft.visits?.length) days[dayNumber] = { ...dayDraft, dayId: dayDraft.dayId ?? crypto.randomUUID(), ...changes };
    else delete days[dayNumber];
    edit({ days });
    if (saveImmediately) persist({ ...draft, days });
  }

  function addVisit(city?: string, cityPoint?: CityPoint) {
    if (extra && !extra.city && extra.cityPoint && city) {
      editDay({ city, cityPoint: cityPoint ?? extra.cityPoint }, true);
      return;
    }
    if (!dayDraft.city && (!dayDraft.cityPoint || (city && !cityPoint))) {
      editDay({ city, cityPoint: cityPoint ?? dayDraft.cityPoint }, true);
      if (experience) { setFocusedDay(dayNumber); setMobileTab('plan'); }
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

  function moveProgramStop(stopId: string, target: number) {
    const stop = day.planningStops?.find(item => item.id === stopId && !item.locked);
    const destination = draft.days[target] ?? emptyDay;
    if (!stop || target === dayNumber || !Number.isSafeInteger(target) || target < 1 || target > lastDay ||
      (destination.planningStops?.length ?? 0) >= 12) return;
    const remaining = day.planningStops?.filter(item => item.id !== stopId);
    const updatedSource = extra ? { ...dayDraft, visits: dayDraft.visits?.map(visit =>
      visit.id === extra.id ? { ...visit, planningStops: remaining } : visit) } : { ...dayDraft, planningStops: remaining };
    setDayMap(undefined);
    edit({ days: { ...draft.days, [dayNumber]: updatedSource, [target]: {
      ...destination, dayId: destination.dayId ?? crypto.randomUUID(),
      planningStops: [...(destination.planningStops ?? []), stop],
    } } });
  }

  function nextDay(target = dayNumber + 1) {
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
    setFocusedDay(experience ? next : undefined);
    setPlacingCities(false);
    setCityListOpen(false);
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

  function attachWalk(walk: NonNullable<WalkCandidate>) {
    const legacy = day.importedWalk && !day.importedWalk.stops;
    const sameWalk = walk.id && day.importedWalk?.id === walk.id;
    const previous = new Map(sameWalk ? importedStops(day).map((stop, index) =>
      [stop.meta?.poi_id ?? index, stop]) : []);
    const receivedIds = new Map<string, string>();
    const stops = walk.stops.map((stop, index) => {
      const existing = previous.get(stop.meta?.poi_id ?? index);
      const id = existing?.id ?? crypto.randomUUID();
      receivedIds.set(stop.id, id);
      const note = existing?.meta?.user_note;
      return { ...stop, id, meta: note === undefined ? stop.meta : { ...stop.meta, user_note: note } };
    });
    const photos = walk.photos?.flatMap(photo => {
      const stopId = receivedIds.get(photo.stopId);
      return stopId ? [{ ...photo, stopId }] : [];
    });
    editDay({ ...(legacy ? { stops: [], route: undefined } : {}),
      importedWalk: { id: walk.id, title: walk.title, legs: walk.legs, stops, photos } }, true);
    setPreview(null);
    setFocusedDay(dayNumber);
    setDayMap(undefined);
    setCityListOpen(false);
  }

  function openDraft(next: Draft) {
    const previous = latestDraft.current;
    const recent = recentDrafts.filter(item => item.id !== previous.id && item.id !== next.id);
    try {
      if (previous.title?.trim() || previous.startDate || Object.keys(previous.days).length || previous.budget || previous.documents?.length) {
        localStorage.setItem(`${recentDraftsKey}/${previous.id}`, JSON.stringify(previous));
        recent.unshift({ id: previous.id, title: previous.title });
      }
      localStorage.setItem(recentDraftsKey, JSON.stringify(recent));
      localStorage.setItem(tripDraftStorageKey, JSON.stringify(next));
    } catch {
      setLocalSave('failed');
      return;
    }
    setRecentDrafts(recent);
    pinRequest.current?.abort();
    selectDay(1);
    setSelectedDayId(next.days[1]?.dayId);
    setPendingDates(undefined);
    setAccountSaved(false);
    setMobileTab('plan');
    latestDraft.current = next;
    lastSaved.current = next;
    setLocalSave('idle');
    dispatch({ type: 'open', draft: next });
  }

  function closeRecentDrafts(event: React.MouseEvent<HTMLButtonElement>, item: RecentDraft) {
    const next = readDraft(`${recentDraftsKey}/${item.id}`);
    if (next.id !== item.id) return;
    event.currentTarget.closest('details')?.removeAttribute('open');
    openDraft(next);
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
    setChoosingCity(false);
    setPlacingCities(false);
  }

  function validDates() {
    if (duration < 2) {
      if (dateMenu.current) {
        dateMenu.current.open = true;
        dateMenu.current.querySelector<HTMLInputElement>('input[type="date"]')?.focus();
      }
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
  const hotelSearchDate = Number.isFinite(dayDate.getTime()) ? dayDate : new Date();
  const hotelSearch = hotelSearchDay === dayNumber && day.city?.trim()
    ? { city: day.city, point: day.cityPoint, checkIn: day.lodging?.checkIn ?? hotelSearchDate.toISOString().slice(0, 10),
      checkOut: day.lodging?.checkOut ?? new Date(hotelSearchDate.getTime() + dayMilliseconds).toISOString().slice(0, 10) }
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

  const metadata = <div className="trip-planner-dates">
        <label>{t('Trip name')} <input maxLength={180} value={draft.title ?? ''}
          onChange={event => edit({ title: event.target.value })} /></label>
        <label>{t('Start date')} <input type="date" value={draft.startDate} onChange={event => setStartDate(event.target.value)} /></label>
        <label>{t('End date')} <input type="date" value={draft.endDate} onChange={event => requestDates({ startDate: draft.startDate, endDate: event.target.value })} /></label>
      </div>;
  const controls = <>      <div className="trip-planner-details">
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
        {!experience && <button type="button" disabled={sharing} onClick={() => void createShare()}>{t('Share')}</button>}
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
        {!experience && <button type="button" disabled={saving} onClick={() => void saveAccount()}>{t('Save trip to account')}</button>}
        {!experience && accountSaved && <Link to={`/trip/${draft.id}`}>{t('Open account trip')}</Link>}
      </footer>
</>;
  const { walkStops, walkLegs } = useMemo(() => {
    const visits = extra ? [extra] : [dayDraft, ...(dayDraft.visits ?? [])];
    return {
      walkStops: preview?.stops ?? visits.flatMap(visit => [...visit.stops, ...(visit.importedWalk?.stops ?? [])]),
      walkLegs: preview?.legs ?? visits.flatMap(visit => [
        ...(!visit.importedWalk || visit.importedWalk.stops ? visit.route ?? noLegs : noLegs),
        ...(visit.importedWalk?.legs ?? noLegs),
      ]),
    };
  }, [dayDraft, extra, preview]);
  const cityFocus = focusedDay === dayNumber && day.cityPoint;
  const walkMap = useMemo(() => {
    if (!experience || placingCities || (!preview && !cityFocus &&
        (focusedDay !== dayNumber || (!walkStops.length && !walkLegs.length)))) return;
    return {
      stops: cityFocus ? [...walkStops, { ...cityFocus, id: activeLocation,
        label: day.city || t('City'), zone: 'UTC', stayMinutes: 0 }] : walkStops,
      legs: walkLegs,
      keepRouteInView: walkStops.length > 0 || walkLegs.length > 0,
    };
  }, [activeLocation, cityFocus, day.city, dayNumber, experience, focusedDay, placingCities, preview, walkLegs, walkStops]);
  const content = (
    <section className="trip-planner" data-planner-v2={v2} aria-label={t('Travel planner')}>
      <header className="trip-planner-header">
        {!experience && <h2>{t('Travel planner')}</h2>}
        {!status && (saving || localSave !== 'idle') && <small role="status">{saving ? t('Saving…') : accountSaved ? t('Trip saved to account.')
          : localSave === 'pending' ? t('Saving…') : localSave === 'saved' ? t('Trip saved on this device.')
            : t('Could not save the trip on this device.')}</small>}
      </header>
      {!experience && metadata}
      {pendingDates && <section className="trip-date-review" role="alert">
        <p>{t('Review lodging and transport before changing dates.')}</p>
        <ul>{locations.filter(({ visit }) => visit.lodging || visit.train || visit.transfer).map(({ id, visit }) =>
          <li key={id}>{[visit.city, visit.lodging?.name, visit.train?.title, visit.transfer?.to].filter(Boolean).join(' · ')}</li>)}</ul>
        <button type="button" onClick={() => applyDates(pendingDates)}>{t('Apply')}</button>
        <button type="button" onClick={() => setPendingDates(undefined)}>{t('Cancel')}</button>
      </section>}
      {v2 && <nav className="trip-workspace-tabs" aria-label={t('Travel planner')}>
        {([['plan', experience ? 'Plan' : 'City list'], ['map', 'Map'], ['summary', 'Trip overview']] as const)
          .filter(([id]) => !experience || id !== 'summary').map(([id, label]) =>
          <button key={id} type="button" aria-pressed={mobileTab === id} onClick={() => {
            setMobileTab(id);
            if (id === 'map') setShowingCities(true);
          }}>{t(label)}</button>)}
      </nav>}
      <div className="trip-planner-grid" data-hotel-search={Boolean(hotelSearch)} data-mobile-tab={mobileTab} data-trip-experience={experience}>
        <div className="trip-planner-overview">
          {!hotelSearch && !firstStop && <div className="trip-map-actions">
            <button type="button" aria-expanded={showingCities && !cityListOpen}
              onClick={() => { setCityListOpen(false); setDayMap(undefined); setFocusedDay(undefined); setShowingCities(true); }}>{t('Trip map')}</button>
            <button type="button" aria-pressed={experience ? cityListOpen : !showingCities} onClick={() => {
              if (experience) { setCityListOpen(true); setPlacingCities(false); return; }
              setShowingCities(false);
              setChoosingCity(false);
              cityInput.current?.focus();
            }}>{t('City list')}</button>
            {showingCities && <button type="button" aria-pressed={placingCities} onClick={() => {
              setCityListOpen(false);
              setShowingCities(true);
              setPlacingCities(!placingCities);
              setChoosingCity(false);
            }}>{t('Add cities on the map')}</button>}
          </div>}
          {experience && cityListOpen && !hotelSearch && <div className="trip-exp-city-table">
            <table>
              <caption>{t('City list')}</caption>
              <thead><tr><th scope="col">{t('Trip day')}</th><th scope="col">{t('City')}</th><th scope="col">{t('Trip lodging')}</th></tr></thead>
              <tbody>{locations.filter(({ visit }) => visit.city || visit.cityPoint).map(({ id, number, visit }) => {
                const date = tripDayDate(draft.startDate, number);
                return <tr key={id}>
                  <td>{date ? <time dateTime={date}>{tripDateLabel(date)}</time> : number}</td>
                  <td><button type="button" onClick={() => {
                    selectDay(number, id === String(number) ? undefined : id);
                    setCityListOpen(false);
                    setMobileTab('plan');
                    setFocusedDay(number);
                  }}>{visit.city?.trim() || t('City')}</button></td>
                  <td>{visit.lodging?.name || '—'}</td>
                </tr>;
              })}</tbody>
            </table>
            {!locations.some(({ visit }) => visit.city || visit.cityPoint) && <p>{t('No places have been added to this day.')}</p>}
          </div>}
          <div className="trip-map-and-hotel" hidden={experience && cityListOpen && !hotelSearch}>
            {(experience || (showingCities && !choosingCity)) && <TripCityMap cities={cityMap?.cities ?? cityPins}
              legs={cityMap?.legs ?? []} plannedLines={lines} accommodations={cityMap?.accommodations}
              hotelMap={hotelSearch ? hotelMap ?? { stops: hotelSearch.point ? [{ ...hotelSearch.point, id: '__day_point__',
                label: hotelSearch.city, zone: 'UTC', stayMinutes: 0 }] : [] } : undefined}
              dayMap={experience && choosingCity ? {
                stops: day.cityPoint ? [{ ...day.cityPoint, id: 'move-city', label: day.city || t('City'), zone: 'UTC', stayMinutes: 0 }] : [],
                legs: noLegs,
                onStopMove: day.cityPoint ? (_id, point) => void moveCity(point) : undefined,
              } : dayMap ?? walkMap}
              onPick={experience && choosingCity ? point => { void moveCity(point); setChoosingCity(false); }
                : placingCities ? setPendingMapPoint : undefined}
              pickedPoint={pendingMapPoint}
              focusStopId={placingCities || focusedDay !== dayNumber || preview ? undefined
                : walkMap && !dayMap ? activeLocation : cityMap?.cities.find(item => item.latitude === day.cityPoint?.latitude
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
                if (firstStop) setPlacingCities(false);
              }}>{t('Add city')}</button>
              <button type="button" onClick={() => setPendingMapPoint(undefined)}>{t('Cancel')}</button>
            </div>}
            {hotelSearch && <section className="trip-inline-hotels" aria-label={t('Find hotels')}>
              <header>
                <h3>{hotelSearch.city}</h3>
                <button type="button" onClick={() => setHotelSearchDay(undefined)}>{t('Back')}</button>
              </header>
              <TripHotelSearch key={activeLocation} city={hotelSearch.city} cityPoint={hotelSearch.point}
                checkIn={hotelSearch.checkIn} checkOut={hotelSearch.checkOut} radiusMeters={hotelSearch.point ? 1000 : undefined} initiallyOpen onMapState={setHotelMap}
                onSelect={lodging => { editDay({ lodging }, true); setHotelSearchDay(undefined); }} />
            </section>}
          </div>
        </div>
        <aside className="trip-planner-summary">
          <TripSummaryBar compact={experience} days={Array.from({ length: Math.min(lastDay, 366) }, (_, index) => {
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
                    if (visit.cityPoint) {
                      setPlacingCities(false);
                      setFocusedDay(number);
                      if (experience) {
                        setDayMap(undefined);
                        setCityListOpen(false);
                        setShowingCities(true);
                        setMobileTab('map');
                      }
                    }
                  },
                  onFindHotel: visit.city?.trim() && id !== activeLocation ? () => findHotels(number, visitId) : undefined,
                };
              }),
            };
          })} />
        </aside>
        {!hotelSearch && <div className="trip-planner-day">
          {experience && <div className="trip-exp-day-title">
            <h2>{firstStop ? t('Where does your trip start?') : day.city || t('Trip day')}</h2>
            {tripDayDate(draft.startDate, dayNumber) && <time dateTime={tripDayDate(draft.startDate, dayNumber)}>
              {tripDateLabel(tripDayDate(draft.startDate, dayNumber)!, 'full')}
            </time>}
          </div>}
          <fieldset>
            <legend>{t('Trip day')}</legend>
            <button type="button" className={experience ? 'trip-exp-legacy-day-nav' : undefined} disabled={dayNumber <= 1} onClick={() => selectDay(dayNumber - 1)}>{t('Previous day')}</button>
            {!experience && <span aria-live="polite">
              {' '}{dayNumber} / {lastDay}
              {Number.isFinite(dayDate.getTime()) && (
                <> · <time dateTime={dayDate.toISOString().split('T')[0]}>
                  {dayDate.toLocaleDateString(getLocale(), { timeZone: 'UTC', dateStyle: 'medium' })}
                </time></>
              )}{' '}
            </span>}
            <button type="button" className={experience ? 'trip-exp-legacy-day-nav' : undefined} onClick={() => nextDay()}>{t('Next day')}</button>
            <details open={!experience || !day.city} className="trip-exp-city-entry" data-first-stop={firstStop || undefined}>
              <summary hidden={firstStop}>{t('Add city')}</summary>
            <RouteAddressInput key={experience ? `${activeLocation}:${day.city ?? ''}` : activeLocation}
              inputRef={cityInput} label={t('City')} confirmLabel={t('Add city')} value={experience ? '' : day.city ?? ''}
              onConfirmText={city => addVisit(city)}
              onSelect={({ label, latitude, longitude }) => {
                setPlacingCities(false);
                addVisit(label, { latitude, longitude });
              }} />
            <button type="button" aria-pressed={choosingCity} onClick={() => {
              if (experience) {
                setPlacingCities(!placingCities);
                setPendingMapPoint(undefined);
                setMobileTab('map');
              } else setChoosingCity(!choosingCity);
            }}>
              {(experience ? placingCities : choosingCity) ? t('Cancel') : t('Choose on map')}
            </button>
            {!experience && choosingCity && <RouteMap rasterBasemap
              stops={day.cityPoint ? [{ ...day.cityPoint, id: `city-${dayNumber}`,
                label: day.city?.trim() || t('City'), zone: 'UTC', stayMinutes: 0 }] : []}
              legs={noLegs} onReady={ignoreMapHandle} cityMap
              onPick={choosingCity ? cityPoint => { void moveCity(cityPoint); setChoosingCity(false); } : undefined}
              onStopMove={day.cityPoint ? (_id, cityPoint) => void moveCity(cityPoint) : undefined}
            />}
            {day.cityPoint && <button type="button" onClick={() => editDay({ cityPoint: undefined }, true)}>
              {t('Remove map pin')}
            </button>}
            </details>
          </fieldset>
          {day.city?.trim() && <button className={experience ? 'trip-exp-hotel-action' : 'journey-primary'} type="button" onClick={findHotelsFromMap}>
            {t('Find hotels')}
          </button>}
          {v2 && !experience && <Suspense fallback={<p aria-busy="true">{t('Loading…')}</p>}><DayPlanningPanel key={`program-${activeLocation}`} stops={day.planningStops} preferences={day.dayPreferences}
            targetDays={Array.from({ length: Math.min(lastDay, 366) }, (_, index) => index + 1)
              .filter(number => number !== dayNumber && (draft.days[number]?.planningStops?.length ?? 0) < 12)}
            onMoveToDay={moveProgramStop}
            date={Number.isFinite(dayDate.getTime()) ? dayDate.toISOString().slice(0, 10) : undefined}
            zone={day.cityPoint ? timezone(day.cityPoint.latitude, day.cityPoint.longitude) : Intl.DateTimeFormat().resolvedOptions().timeZone}
            onMap={plan => {
              setDayMap(plan);
              if (plan) { setShowingCities(true); setChoosingCity(false); }
            }}
            onChange={(planningStops, dayPreferences) => editDay({ planningStops, dayPreferences })} /></Suspense>}
          {Boolean(day.ideas?.length) && <ul aria-label={t('Trip ideas')}>{day.ideas?.map(idea => <li key={idea.id}>
            {idea.label}{' '}<button type="button" onClick={() =>
              editDay({ ideas: day.ideas?.filter(item => item.id !== idea.id) }, true)}>{t('Remove')}</button>
          </li>)}</ul>}
          {(!experience || hasDayPlan || new URLSearchParams(location.search).has('walk')) && <TripWalkImport key={activeLocation} point={day.cityPoint} address={day.city} onPreview={setPreview}
            primary={experience} />}
          {hasDayPlan && Number.isFinite(dayDate.getTime()) && (
            <details className="trip-exp-day-services" open={!experience}>
              <summary>{t('Transfer details')} · {t('Trip lodging')}</summary>
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
            </details>
          )}
          {!preview && day.importedWalk && <p>{day.importedWalk.title}</p>}
          {experience && !extra && !preview && dayDraft.visits?.map(visit => visit.importedWalk && <button
            key={visit.id} type="button" onClick={() => selectDay(dayNumber, visit.id)}>
            {visit.importedWalk.title}
          </button>)}
          {preview && <div>
            <strong>{preview.title}</strong>
            <button type="button" onClick={() => attachWalk(preview)}>{t('Use this walk')}</button>
            <button type="button" onClick={() => setPreview(null)}>{t('Cancel')}</button>
          </div>}
          {!experience && <>
            <button type="button" onClick={undo} disabled={!past.length}>{t('Undo')}</button>
            <button type="button" onClick={redo} disabled={!future.length}>{t('Redo')}</button>
          </>}
          {!experience && (preview || importedStops(day).length > 0) && <RouteMap rasterBasemap
            stops={preview?.stops ?? importedStops(day)}
            legs={preview?.legs ?? day.importedWalk?.legs ?? day.route ?? noLegs}
            onReady={ignoreMapHandle}
          />}
          {!preview && importedStops(day).length > 0 && <>
            <ol className={experience ? 'trip-exp-itinerary' : undefined}>{importedStops(day).map(stop => <li key={stop.id}><span>{stop.label}</span>
              {day.importedWalk && <details>
                <summary>{t('Details')}</summary>
                <p>{stop.description}</p>
                <label>{t('Notes for this stop (optional)')}
                  <input maxLength={500} value={stop.meta?.user_note ?? ''} onChange={event => {
                    if (!day.importedWalk) return;
                    const user_note = event.target.value;
                    editDay({ importedWalk: { ...day.importedWalk, stops: importedStops(day).map(point =>
                      point.id === stop.id ? { ...point, meta: { ...point.meta, user_note } } : point) },
                      ...(!day.importedWalk.stops ? { stops: [] } : {}) }, true);
                  }} />
                </label>
              </details>}
            </li>)}</ol>
            <button type="button" onClick={() => editDay({
              ...(!day.importedWalk?.stops ? { stops: [], route: undefined } : {}), importedWalk: undefined,
            }, true)}>{t('Remove walk from day')}</button>
          </>}
        </div>}
      </div>
      {experience ? !firstStop && <details className="trip-exp-panel trip-exp-planner-tools">
        <summary>{t('Details')}</summary>
        <div className="trip-exp-control-row">
          <button type="button" onClick={undo} disabled={!past.length}>{t('Undo')}</button>
          <button type="button" onClick={redo} disabled={!future.length}>{t('Redo')}</button>
        </div>
        {controls}
      </details> : controls}
      {status && <p role="status">{status}</p>}
    </section>
  );
  if (!experience) return content;
  const choices = Array.from({ length: Math.min(lastDay, 366) }, (_, index) => ({
    id: String(index + 1), date: tripDayDate(draft.startDate, index + 1), title: draft.days[index + 1]?.city,
  }));
  return <TripExperienceShell mode="planner" title={draft.title?.trim() || t('Travel planner')}
    dateSpan={draft.startDate && [draft.startDate, draft.endDate].filter(Boolean).map(value => tripDateLabel(value)).join(' \u2013 ')}
    navigation={!firstStop && <TripDayNavigator days={choices} selected={mobileTab === 'summary' ? 'overview' : String(dayNumber)}
      onSelect={id => {
        if (id === 'overview') { setMobileTab('summary'); setDayMap(undefined); }
        else { selectDay(Number(id)); setMobileTab('plan'); }
      }} action={<button type="button" onClick={() => { nextDay(lastDay + 1); setMobileTab('plan'); }}>{t('Add day')}</button>} />}
    actions={<>
      {!firstStop && <button type="button" disabled={saving} onClick={() => void saveAccount()}>{t('Save trip to account')}</button>}
      {accountSaved && <Link to={`/trip/${draft.id}`}>{t('Open account trip')}</Link>}
      {!firstStop && <button type="button" disabled={sharing} onClick={() => void createShare()}>{t('Share')}</button>}
      {!firstStop && <button type="button" disabled={saving || sharing} onClick={() => openDraft(emptyDraft())}>{t('New trip')}</button>}
      {recentDrafts.length > 0 && <details><summary>{t('Recent trip drafts')}</summary><div className="trip-exp-action-menu">
        {recentDrafts.map(item => <button key={item.id} type="button" disabled={saving || sharing}
          onClick={event => closeRecentDrafts(event, item)}>{item.title?.trim() || t('Travel planner')}</button>)}
      </div></details>}
      {!firstStop && <details ref={dateMenu}><summary>{t('Trip dates and name')}</summary><div className="trip-exp-action-menu">{metadata}</div></details>}
    </>}>
    {content}
  </TripExperienceShell>;
}
