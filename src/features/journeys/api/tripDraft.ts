import type { DayPlanPreferences, PlanningStop } from '../domain/planner/plannerTypes';
import { authFetch } from '@/shared/api/client';
import { Temporal } from '@js-temporal/polyfill';
import type { PlannedLeg } from '../domain/route';
import type { RouteStop } from '../domain/routeTimeline';
import type { SharedTrip } from '../domain/sharedTrip';

export type TripWireLeg = SharedTrip['legs'][number] & { bookingUrl?: string };

export const pointTransportModes = ['CAR', 'TRAIN', 'PLANE', 'WALK'] as const;
export type PointTransport = typeof pointTransportModes[number];

export interface TripVisit {
  planningStops?: PlanningStop[];
  dayPreferences?: DayPlanPreferences;
  incomingMode?: PointTransport;
  stops: RouteStop[];
  city?: string;
  cityPoint?: CityPoint;
  importedWalk?: { title: string; legs: PlannedLeg[] };
  route?: PlannedLeg[];
  lodging?: TripLodging;
  train?: TripTrain;
  transfer?: TripTransfer;
  ideas?: TripIdea[];
}

export interface TripDayDraft extends TripVisit {
  dayId?: string;
  visits?: (TripVisit & { id: string })[];
}

export function tripLocations(days: LocalTripDraft['days']) {
  return Object.entries(days).flatMap(([key, day]) => [
    { id: key, number: Number(key), visit: day },
    ...(day.visits ?? []).map(visit => ({ id: visit.id, number: Number(key), visit })),
  ]);
}

export interface TripIdea extends CityPoint { id: string; label: string }

export interface CityPoint {
  longitude: number;
  latitude: number;
}

export interface TripTrain {
  number: string;
  title: string;
  from: string;
  to: string;
  fromCity?: string;
  toCity?: string;
  departure: string;
  arrival: string;
}
export const transferModes = ['PLANE', 'TRAIN', 'BUS', 'CAR', 'FERRY'] as const;
export interface TripTransfer {
  from: string;
  to: string;
  transport: typeof transferModes[number];
  departure: string;
  arrival: string;
  arrivalZone?: string;
  road?: { geometry: CityPoint[]; distanceMeters: number; durationSeconds: number; via?: CityPoint[] };
  cost?: TripBudget;
  bookingUrl?: string;
}

export interface TripLodging {
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  latitude?: number;
  longitude?: number;
  cost?: TripBudget;
  provider?: 'MANUAL' | 'OSTROVOK_MCP' | 'RUSSIAN_TOURISM';
}

export interface LocalTripDraft {
  id: string;
  version: 2;
  title?: string;
  startDate: string;
  endDate: string;
  days: Record<number, TripDayDraft>;
  budget?: TripBudget;
  documents?: TripDocument[];
}

export interface TripBudget { amount: number; currency: string }
export interface TripDocument { id: string; title: string; url: string }

export interface PlannedConnection {
  from: { id: string };
  to: { id: string };
  mode: PointTransport;
  result?: { seconds: number; coordinates?: [number, number][] } | null;
}

export function tripPayload(draft: LocalTripDraft, title: string, connections: PlannedConnection[] = []) {
  const firstDay = Temporal.PlainDate.from(draft.startDate);
  const cities = new Map<string, { id: string; name: string } & Partial<CityPoint>>();
  const cityIds = new Map<string, string>();
  const locations = tripLocations(draft.days);
  const accommodations: (TripLodging & { id: string; cityId: string })[] = [];
  function cityFor(rawName: string, point?: CityPoint, day?: string) {
    const name = rawName.trim();
    const key = name ? name.toLowerCase() : `\0${day ?? ''}`;
    const city = cities.get(key) ?? { id: `city-${cities.size + 1}`, name };
    if (point) Object.assign(city, point);
    cities.set(key, city);
    return city;
  }
  const days = Object.entries(draft.days).map(([number, day]) => {
    const visits = [{ id: number, visit: day }, ...(day.visits ?? []).map(visit => ({ id: visit.id, visit }))];
    const city = cityFor(day.city?.trim() || day.train?.fromCity || day.train?.from || day.transfer?.from || '', day.cityPoint, number);
    cityIds.set(number, city.id);
    const walkSections = visits.flatMap(({ visit }) => (visit.importedWalk?.legs ?? visit.route ?? []).map((leg, index) => ({
      fromSegmentId: visit.stops[index].id, toSegmentId: visit.stops[index + 1].id,
      geometry: leg.coordinates.map(([longitude, latitude]) => ({ longitude, latitude })),
      distanceMeters: leg.distanceMeters ?? 0, durationSeconds: leg.durationSeconds,
    })));
    const segments = visits.flatMap(({ id, visit }) => {
      const destination = id === number ? city : cityFor(visit.city ?? '', visit.cityPoint, id);
      cityIds.set(id, destination.id);
      if (visit.lodging) accommodations.push({ provider: 'MANUAL', ...visit.lodging, id: `lodging-${id}`, cityId: destination.id });
      return [
        ...(id !== number && visit.city ? [{
          id: `visit-${id}`, title: visit.city, latitude: visit.cityPoint?.latitude, longitude: visit.cityPoint?.longitude,
          category: 'TRANSPORT', note: visit.importedWalk?.title, photoRefs: [], idea: false,
        }] : []),
        ...visit.stops.map(stop => ({
          id: stop.id, title: stop.label, latitude: stop.latitude, longitude: stop.longitude,
          category: 'WALK', note: stop.description, photoRefs: [], idea: false,
        })),
        ...(visit.planningStops ?? []).map(stop => ({
          id: stop.id, title: stop.title, latitude: stop.latitude, longitude: stop.longitude,
          category: 'OTHER', note: stop.notes, photoRefs: [], idea: false,
        })),
        ...(visit.ideas ?? []).map(idea => ({
          id: `idea-${idea.id}`, title: idea.label, latitude: idea.latitude, longitude: idea.longitude,
          category: 'OTHER', note: undefined, photoRefs: [], idea: true,
        })),
      ];
    });
    const lastLodging = [...visits].reverse().find(({ visit }) => visit.lodging);
    return {
      date: firstDay.add({ days: Number(number) - 1 }).toString(), cityId: city.id,
      note: day.importedWalk?.title, accommodationId: lastLodging && `lodging-${lastLodging.id}`,
      segments, walkingSections: walkSections,
    };
  });
  const legs = locations.flatMap<TripWireLeg>(({ id: number, visit: day }) => {
    if (day.transfer) {
      const { from, to, transport, departure, arrival, road, cost, bookingUrl } = day.transfer;
      return [{ id: `transfer-${number}`, fromCityId: cityFor(from).id, toCityId: cityFor(to).id,
        transport, departureAt: departure, arrivalAt: arrival, note: transport,
        geometry: road?.geometry, distanceMeters: road?.distanceMeters, durationSeconds: road?.durationSeconds,
        cost, bookingUrl }];
    }
    if (!day.train) return [];
    const { from, to, fromCity, toCity, departure, arrival, title, number: trainNumber } = day.train;
    return [{ id: `train-${number}`, fromCityId: cityFor(fromCity || from).id, toCityId: cityFor(toCity || to).id,
      transport: 'TRAIN', departureAt: departure, arrivalAt: arrival, note: `${trainNumber} ${title}`.trim() }];
  });
  for (const { from, to, mode, result } of connections) {
    const origin = cityIds.get(from.id);
    const destination = cityIds.get(to.id);
    if (!origin || !destination || origin === destination ||
      legs.some(leg => leg.fromCityId === origin && leg.toCityId === destination && leg.transport === mode)) continue;
    legs.push({ id: `planned-${from.id}-${to.id}`, fromCityId: origin, toCityId: destination,
      transport: mode, note: mode, durationSeconds: result?.seconds,
      geometry: result?.coordinates?.map(([longitude, latitude]) => ({ longitude, latitude })) });
  }
  return {
    id: draft.id, version: draft.version, title, startDate: draft.startDate, endDate: draft.endDate,
    baseCurrency: 'RUB', travelers: [], cities: [...cities.values()], days, legs,
    accommodations, documents: draft.documents ?? [],
    budget: draft.budget ? { limit: draft.budget } : undefined,
    meta: {
      mode: 'TRIP', source: locations.some(({ visit }) => visit.importedWalk) ? 'PRIVATE_JOURNEY' : 'MANUAL',
      legacyFields: {},
    },
  };
}

export class TripAccountSaveError extends Error {
  constructor(readonly status: number) { super(String(status)); }
}

export async function saveTripToAccount(draft: LocalTripDraft, title: string, connections?: PlannedConnection[]) {
  const response = await authFetch(`/api/trips/${encodeURIComponent(draft.id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tripPayload(draft, title, connections)),
  });
  if (!response.ok) throw new TripAccountSaveError(response.status);
}

export type AccountTrip = ReturnType<typeof tripPayload>;

export async function openAccountTrip(id: string, signal: AbortSignal): Promise<AccountTrip> {
  const response = await authFetch(`/api/trips/${encodeURIComponent(id)}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<AccountTrip>;
}

export async function updateAccountTrip(trip: AccountTrip): Promise<AccountTrip> {
  const response = await authFetch(`/api/trips/${encodeURIComponent(trip.id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trip),
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<AccountTrip>;
}

export const tripExportFiles = {
  calendar: { path: 'calendar', filename: 'trip.ics' },
  pdf: { path: 'pdf', filename: 'trip.pdf' },
  json: { path: 'json', filename: 'trip-v2.json' },
  legacy: { path: 'json?format=v1-compat', filename: 'route-v1.json' },
} as const;
export type TripExport = keyof typeof tripExportFiles;

export async function fetchTripExport(id: string, kind: TripExport): Promise<Blob> {
  const response = await authFetch(`/api/trips/${encodeURIComponent(id)}/${tripExportFiles[kind].path}`);
  if (!response.ok) throw new Error(String(response.status));
  return response.blob();
}
