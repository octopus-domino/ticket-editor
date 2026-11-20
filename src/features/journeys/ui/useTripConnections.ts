import { useEffect, useMemo, useRef, useState } from 'react';
import { searchRailPlaces, searchRailSchedule } from '../api/tripRail';
import { requestRoad } from '../api/routePlanner';
import type { CityPoint, LocalTripDraft, PointTransport, TripTrain } from '../api/tripDraft';
import { flightCoordinates, geographicDistance } from '../domain/route';
import type { RouteMapLeg } from './RouteMap';

type Point = CityPoint & { id: string; name: string };
type Segment = { from: Point; to: Point; mode: PointTransport; date?: string };
type Estimate = { seconds: number; coordinates?: [number, number][]; trains?: (TripTrain & { seconds: number })[] };
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
  if (mode === 'PLANE') {
    return { seconds: 1800 + distance * 3.6 / 800, coordinates: flightCoordinates(from, to) };
  }
  if (mode === 'TRAIN') {
    if (!date) return null;
    const [origin, destination] = await Promise.all([railCity(from.name, signal), railCity(to.name, signal)]);
    if (!origin || !destination || origin === destination) return null;
    const schedule = await searchRailSchedule(origin, destination, date, signal);
    const trains = schedule.trains.map(train => ({ ...train,
      seconds: (Date.parse(train.arrival) - Date.parse(train.departure)) / 1000 }))
      .filter(train => Number.isFinite(train.seconds) && train.seconds > 0)
      .sort((a, b) => Date.parse(a.departure) - Date.parse(b.departure));
    return trains.length ? { seconds: Math.min(...trains.map(train => train.seconds)), trains } : null;
  }
  if (distance === 0) return { seconds: 0 };
  const road = await requestRoad({ latitude: from.latitude, longitude: from.longitude },
    { latitude: to.latitude, longitude: to.longitude }, mode === 'WALK' ? 'foot' : 'car', signal);
  return { seconds: road.durationSeconds, coordinates: road.coordinates };
}

function segmentKey(segment: Segment) {
  const { mode, from, to, date } = segment;
  return JSON.stringify(mode === 'TRAIN' ? [mode, from.name, to.name, date] :
    [mode, from.latitude, from.longitude, to.latitude, to.longitude]);
}

export function useTripConnections(points: Point[], draft: LocalTripDraft) {
  const firstDate = Date.parse(draft.startDate);
  const segments: Segment[] = points.slice(1).map((to, index) => {
    const mode = draft.days[Number(to.id)]?.incomingMode ?? 'CAR';
    const date = new Date(firstDate + (Number(to.id) - 1) * 86_400_000);
    return { from: points[index], to, mode,
      date: mode === 'TRAIN' && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : undefined };
  });
  const signature = JSON.stringify(segments);
  const cache = useRef(new Map<string, Estimate | null>());
  const [results, setResults] = useState<Record<string, Estimate | null>>({});
  useEffect(() => {
    const controller = new AbortController();
    const pending = JSON.parse(signature) as Segment[];
    void (async () => {
      for (const segment of pending) {
        const key = segmentKey(segment);
        if (cache.current.has(key)) continue;
        let result: Estimate | null;
        try {
          result = await estimate(segment, controller.signal);
        } catch {
          result = null;
        }
        if (controller.signal.aborted) return;
        if (result) cache.current.set(key, result);
        setResults(previous => ({ ...previous, [key]: result }));
      }
    })();
    return () => controller.abort();
  }, [signature]);
  const connections = useMemo(() => (JSON.parse(signature) as Segment[])
    .map(segment => ({ ...segment, result: results[segmentKey(segment)] })), [results, signature]);
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
