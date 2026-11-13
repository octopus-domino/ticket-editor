import { Temporal } from '@js-temporal/polyfill';
import type { RouteStop } from './routeTimeline';

export interface RecommendedPlace {
  id: string; label: string; longitude: number; latitude: number; url: string;
  openingHours?: string;
  photoReference?: string;
  description?: string;
  visitStatus?: 'OPEN'|'CLOSED'|'UNKNOWN';
  source?: string;
  inOsm?: boolean;
  wikimapiaId?: string;
  wikidataSitelinks?: number;
  score?: number;
  meta?: Record<string,string>;
  schedule?: Record<string, { working_hours?: { from: string; to: string }[] }>;
}
export interface CityVisit { place: RecommendedPlace; start: string; end: string }
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const minute = (value: string): number => {
  if (!/^\d{2}:\d{2}$/.test(value)) return NaN;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 24 && m >= 0 && m < 60 && (h < 24 || m === 0) ? h * 60 + m : NaN;
};
/** Conservative daytime plan. Unknown hours stay unscheduled; each visit fits one opening interval. */
export function cityVisitPlan(places: RecommendedPlace[], date: string, transfers: number[], start = 9 * 60, end = 21 * 60) {
  const day = Temporal.PlainDate.from(date);
  const weekday = weekdays[day.dayOfWeek - 1];
  let clock = Math.max(8 * 60, start);
  const visits: CityVisit[] = [], skipped: RecommendedPlace[] = [];
  const local = (minutes: number) => `${day}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  for (const [index, place] of places.entries()) {
    const travel = transfers[index];
    if (!Number.isFinite(travel) || travel < 0) { skipped.push(place); continue; }
    const arrival = clock + Math.ceil(travel / 60);
    const slots = (place.schedule?.[weekday]?.working_hours ?? []).map(slot => ({ from: minute(slot.from), to: minute(slot.to) }))
      .filter(slot => Number.isFinite(slot.from) && Number.isFinite(slot.to) && slot.to > slot.from).sort((a, b) => a.from - b.from);
    const slot = slots.find(slot => Math.max(arrival, slot.from) + 60 <= Math.min(slot.to, end, 22 * 60));
    if (!slot) { skipped.push(place); continue; }
    const begins = Math.max(arrival, slot.from);
    clock = begins + 60;
    visits.push({ place, start: local(begins), end: local(clock) });
  }
  return { visits, skipped };
}

export function nearestPlaces(origin: Pick<RouteStop, 'latitude' | 'longitude'>, places: RecommendedPlace[]) {
  const remaining = [...places], result: RecommendedPlace[] = [];
  let current = origin;
  while (remaining.length) {
    const distance = (place: RecommendedPlace) => Math.hypot((place.longitude - current.longitude) * Math.cos(current.latitude * Math.PI / 180), place.latitude - current.latitude);
    remaining.sort((a, b) => distance(a) - distance(b));
    const next = remaining.shift()!; result.push(next); current = next;
  }
  return result;
}
