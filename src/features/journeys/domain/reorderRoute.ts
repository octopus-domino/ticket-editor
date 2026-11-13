import type { PlannedLeg } from './route';
import type { RouteStop } from './routeTimeline';

/** Timetabled flights belong to a directed pair of stops, never to a numeric row. */
export function reorderRoute(stops: RouteStop[], legs: PlannedLeg[], from: number, to: number) {
  const ordered = [...stops];
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= ordered.length || to >= ordered.length)
    return { stops: ordered, legs: [...legs] };
  const oldEdges = new Map(legs.map((leg, index) => [`${stops[index].id}:${stops[index + 1].id}`, leg]));
  ordered.splice(to, 0, ...ordered.splice(from, 1));
  return { stops: ordered, legs: ordered.slice(1).map((stop, index): PlannedLeg =>
    oldEdges.get(`${ordered[index].id}:${stop.id}`) ?? { mode: 'car', durationSeconds: 0, coordinates: [], beforeMinutes: 120, afterMinutes: 45 }) };
}
