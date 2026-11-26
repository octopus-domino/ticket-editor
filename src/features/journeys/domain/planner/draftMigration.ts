import { importedStops, pointTransportModes, transferModes, type CityPoint, type LocalTripDraft, type TripDayDraft, type TripVisit } from '../../api/tripDraft';
import type { PlannedLeg } from '../route';

type Draft = LocalTripDraft;
type TripDay = TripDayDraft;
export const tripDraftStorageKey = 'codoc/trip-planner/draft/v2';

function validLegs(legs: PlannedLeg[] | undefined, stopCount: number) {
  return Array.isArray(legs) && legs.length > 0 && legs.length === stopCount - 1 && legs.every((leg) =>
    leg?.mode === 'foot' && Number.isFinite(leg.durationSeconds) &&
    Array.isArray(leg.coordinates) && leg.coordinates.length >= 2 &&
    leg.coordinates.every((point) => Array.isArray(point) && point.length === 2 &&
      Number.isFinite(point[0]) && Number.isFinite(point[1])));
}

function readVisit(day: TripVisit | null): TripVisit | null {
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
  return { ...day, stops: day.stops, ideas, city: typeof day.city === 'string' ? day.city : undefined,
    incomingMode: day.incomingMode && pointTransportModes.includes(day.incomingMode) ? day.incomingMode : undefined,
    cityPoint: point && Math.abs(point.latitude) <= 85 && Math.abs(point.longitude) <= 180 ? point : undefined,
    importedWalk: walk && typeof walk.title === 'string' && Array.isArray(importedStops(day))
      && importedStops(day).every(stop => stop && typeof stop.id === 'string' && typeof stop.label === 'string'
        && Number.isFinite(stop.longitude) && Number.isFinite(stop.latitude))
      && validLegs(walk.legs, importedStops(day).length) ? walk : undefined,
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

function readDay(day: TripDay | null): TripDay | null {
  const start = readVisit(day);
  if (!start) return null;
  const visits = Array.isArray(day?.visits) ? day.visits.flatMap(item => {
    const value = readVisit(item);
    return value && typeof item.id === 'string' && /^[a-z][a-z0-9-]{1,42}$/.test(item.id) ? [{ ...value, id: item.id }] : [];
  }) : undefined;
  return { ...start, dayId: typeof day?.dayId === 'string' ? day.dayId : crypto.randomUUID(),
    visits: visits?.length ? visits : undefined };
}

export function emptyDraft(): Draft {
  return { id: crypto.randomUUID(), version: 2, startDate: '', endDate: '', days: {} };
}

export function readDraft(key = tripDraftStorageKey): Draft {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? 'null') as (Partial<Draft> & Partial<TripDay>) | null;
    if (stored?.version === 2 && typeof stored.startDate === 'string' && typeof stored.endDate === 'string') {
      const legacy = stored.days ? null : readDay(stored as TripDay);
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
  return emptyDraft();
}
