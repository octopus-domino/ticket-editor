import { journeyRequest } from './journeys';
import type { TripTrain } from './tripDraft';

type RailPlace = { code: string; title: string; region: string };
type Schedule = { available: boolean; stale: boolean; trains: TripTrain[] };

export function searchRailPlaces(query: string, signal: AbortSignal) {
  return journeyRequest<RailPlace[]>(`/api/journeys/routes/places/trains/places?q=${encodeURIComponent(query)}`, { signal });
}

export function searchRailSchedule(from: string, to: string, date: string, signal: AbortSignal) {
  return journeyRequest<Schedule>('/api/journeys/routes/places/trains', {
    method: 'POST', signal, body: JSON.stringify({ from, to, date }),
  });
}
