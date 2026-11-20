import { authFetch } from '@/shared/api/client';
import { Temporal } from '@js-temporal/polyfill';
import type { PlannedLeg } from '../domain/route';
import type { RouteStop } from '../domain/routeTimeline';
import type { SharedTrip } from '../domain/sharedTrip';

export type TripWireLeg = SharedTrip['legs'][number] & { bookingUrl?: string };

export const pointTransportModes = ['CAR', 'TRAIN', 'PLANE', 'WALK'] as const;
export type PointTransport = typeof pointTransportModes[number];

export interface TripDayDraft {
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
    const city = cityFor(day.city?.trim() || day.train?.fromCity || day.train?.from || day.transfer?.from || '', day.cityPoint, number);
    const legs = day.importedWalk?.legs ?? day.route ?? [];
    const accommodationId = day.lodging ? `lodging-${number}` : undefined;
    if (day.lodging && accommodationId) {
      accommodations.push({ provider: 'MANUAL', ...day.lodging, id: accommodationId, cityId: city.id });
    }
    return {
      date: firstDay.add({ days: Number(number) - 1 }).toString(), cityId: city.id,
      note: day.importedWalk?.title, accommodationId,
      segments: [...day.stops.map(stop => ({
        id: stop.id, title: stop.label, latitude: stop.latitude, longitude: stop.longitude,
        category: 'WALK', note: stop.description, photoRefs: [], idea: false,
      })), ...(day.ideas ?? []).map(idea => ({
        id: `idea-${idea.id}`, title: idea.label, latitude: idea.latitude, longitude: idea.longitude,
        category: 'OTHER', note: undefined, photoRefs: [], idea: true,
      }))],
      walkingSections: legs.map((leg, index) => ({
        fromSegmentId: day.stops[index].id, toSegmentId: day.stops[index + 1].id,
        geometry: leg.coordinates.map(([longitude, latitude]) => ({ longitude, latitude })),
        distanceMeters: leg.distanceMeters ?? 0, durationSeconds: leg.durationSeconds,
      })),
    };
  });
  const legs = Object.entries(draft.days).flatMap<TripWireLeg>(([number, day]) => {
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
    const origin = days[Object.keys(draft.days).indexOf(from.id)]?.cityId;
    const destination = days[Object.keys(draft.days).indexOf(to.id)]?.cityId;
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
      mode: 'TRIP', source: Object.values(draft.days).some(day => day.importedWalk) ? 'PRIVATE_JOURNEY' : 'MANUAL',
      legacyFields: {},
    },
  };
}

export async function saveTripToAccount(draft: LocalTripDraft, title: string, connections?: PlannedConnection[]) {
  const response = await authFetch(`/api/trips/${encodeURIComponent(draft.id)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tripPayload(draft, title, connections)),
  });
  if (!response.ok) throw new Error(String(response.status));
}

export type AccountTrip = ReturnType<typeof tripPayload>;

export async function openAccountTrip(id: string, signal: AbortSignal): Promise<AccountTrip> {
  const response = await authFetch(`/api/trips/${encodeURIComponent(id)}`, { signal });
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
