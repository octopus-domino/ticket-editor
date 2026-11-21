import { scheduledSeconds, tripDayDate } from '../domain/planner/travelTimes';
import { useEffect, useMemo, useState } from 'react';
import { searchRailPlaces, searchRailSchedule } from '../api/tripRail';
import { requestRoad } from '../api/routePlanner';
import type { CityPoint, LocalTripDraft, PointTransport, TripTrain } from '../api/tripDraft';
import { flightCoordinates, geographicDistance } from '../domain/route';
import type { RouteMapLeg } from './RouteMap';

type Point = CityPoint & { id: string; name: string; number: number; mode?: PointTransport };
type Segment = { from: Point; to: Point; mode: PointTransport; date?: string };
type Estimate = { seconds: number; source: 'road' | 'rail' | 'flight-estimate'; checkedAt: string; stale?: boolean; coordinates?: [number, number][]; trains?: (TripTrain & { seconds: number })[] };
async function railCity(name: string, signal: AbortSignal) {
  for (const part of name.split(',').slice(0, 4)) {
    const query = part.trim().toLowerCase().replace(/^г\.\s*/, '');
    if (query.length < 2 || /\d/.test(query)) continue;
    const cities = (await searchRailPlaces(query, signal)).filter(place =>
      place.code.startsWith('c') && place.title.trim().toLowerCase() === query);
    if (cities.length === 1) return cities[0].code;
    if (cities.length > 1) return undefined;
  }
}

async function estimate({ from, to, mode, date }: Segment, signal: AbortSignal): Promise<Estimate | null> {
  const distance = geographicDistance(from, to);
  const checkedAt = new Date().toISOString();
  if (mode === 'PLANE') {
    return { seconds: 1800 + distance * 3.6 / 800, coordinates: flightCoordinates(from, to), checkedAt, source: 'flight-estimate' };
  }
  if (mode === 'TRAIN') {
    if (!date) return null;
    const [origin, destination] = await Promise.all([railCity(from.name, signal), railCity(to.name, signal)]);
    if (!origin || !destination || origin === destination) return null;
    const schedule = await searchRailSchedule(origin, destination, date, signal);
    const trains = schedule.trains.flatMap(train => {
      const seconds = scheduledSeconds(train.departure, train.arrival);
      return seconds === undefined ? [] : [{ ...train, seconds }];
    })
      .sort((a, b) => Date.parse(a.departure) - Date.parse(b.departure));
    return trains.length ? { seconds: Math.min(...trains.map(train => train.seconds)), trains, checkedAt, source: 'rail', stale: schedule.stale } : null;
  }
  if (distance === 0) return { seconds: 0, checkedAt, source: 'road' };
  const road = await requestRoad({ latitude: from.latitude, longitude: from.longitude },
    { latitude: to.latitude, longitude: to.longitude }, mode === 'WALK' ? 'foot' : 'car', signal);
  return { seconds: road.durationSeconds, coordinates: road.coordinates, checkedAt, source: 'road' };
}

function segmentKey(segment: Segment) {
  const { mode, from, to, date } = segment;
  return JSON.stringify(mode === 'TRAIN' ? [mode, from.name, to.name, date] :
    [mode, from.latitude, from.longitude, to.latitude, to.longitude]);
}

const routeCache = new Map<string, Estimate>();
const pendingRoutes = new Map<string, Promise<Estimate | null>>();

function cachedRoute(key: string) {
  const result = routeCache.get(key);
  return result?.source === 'rail' && Date.now() - Date.parse(result.checkedAt) >= 900_000 ? undefined : result;
}

function loadRoute(segment: Segment, key: string) {
  const cached = cachedRoute(key);
  if (cached) return Promise.resolve(cached);
  const pending = pendingRoutes.get(key);
  if (pending) return pending;
  const request = estimate(segment, AbortSignal.timeout(20_000)).then(result => {
    if (result) {
      if (routeCache.size >= 128) routeCache.delete(routeCache.keys().next().value!);
      routeCache.set(key, result);
    }
    return result;
  }).catch(() => null).finally(() => pendingRoutes.delete(key));
  pendingRoutes.set(key, request);
  return request;
}

export function useTripConnections(points: Point[], draft: LocalTripDraft) {
  const segments: Segment[] = points.slice(1).flatMap((to, index) => {
    const from = points[index];
    if (from.latitude === to.latitude && from.longitude === to.longitude) return [];
    const mode = to.mode ?? 'CAR';
    return [{ from, to, mode, date: mode === 'TRAIN' ? tripDayDate(draft.startDate, to.number) : undefined }];
  });
  const signature = JSON.stringify(segments);
  const [results, setResults] = useState<Record<string, Estimate | null>>({});
  useEffect(() => {
    let active = true;
    const pending = JSON.parse(signature) as Segment[];
    void (async () => {
      for (const segment of pending) {
        const key = segmentKey(segment);
        const result = await loadRoute(segment, key);
        if (!active) return;
        setResults(previous => ({ ...previous, [key]: result }));
      }
    })();
    return () => { active = false; };
  }, [signature]);
  const connections = useMemo(() => (JSON.parse(signature) as Segment[])
    .map(segment => ({ ...segment, result: cachedRoute(segmentKey(segment)) ?? results[segmentKey(segment)] })), [results, signature]);
  const lines = useMemo(() => connections.map(({ from, to, mode, result }): RouteMapLeg => {
    const id = `planned-${from.id}-${to.id}`;
    if (result?.coordinates && result.coordinates.length > 1) return {
      id, mode: mode === 'PLANE' ? 'flight' : mode === 'WALK' ? 'foot' : 'car',
      coordinates: result.coordinates, durationSeconds: result.seconds,
    };
    return { id, mode: 'transfer', coordinates: [[from.longitude, from.latitude], [to.longitude, to.latitude]] };
  }), [connections]);
  return { connections, lines };
}

export type TripConnection = ReturnType<typeof useTripConnections>['connections'][number];
