import { legCalculationKey } from '../domain/planner/legCalculationKey';
import { t } from '@/shared/i18n';
import { journeyRequest } from './journeys';
import { routeInstant, buildRouteTimeline, departureForFlight, type RouteStop } from '../domain/routeTimeline';
import { flightCoordinates, geographicDistance, type PlannedLeg } from '../domain/route';

type RoadPoint = Pick<RouteStop, 'latitude' | 'longitude'>;
type RoadResult = Pick<PlannedLeg, 'coordinates' | 'durationSeconds'> & { distanceMeters: number };

export function requestRoad(start: RoadPoint, end: RoadPoint, mode: 'car' | 'foot', signal?: AbortSignal) {
  return journeyRequest<RoadResult>('/api/routing/v1/road', {
    method: 'POST', signal, body: JSON.stringify({
      start: { longitude: start.longitude, latitude: start.latitude },
      end: { longitude: end.longitude, latitude: end.latitude }, mode,
    }),
  });
}

export async function requestRoadVia(start: RoadPoint, end: RoadPoint, via: RoadPoint[], signal: AbortSignal) {
  if (!via.length) return requestRoad(start, end, 'car', signal);
  const points = [start, ...via, end];
  const route: RoadResult = { coordinates: [], distanceMeters: 0, durationSeconds: 0 };
  for (let index = 1; index < points.length; index++) {
    signal.throwIfAborted();
    const section = await requestRoad(points[index - 1], points[index], 'car', signal);
    const tail = route.coordinates.at(-1), head = section.coordinates[0];
    route.coordinates = route.coordinates.concat(tail && head && tail[0] === head[0] && tail[1] === head[1]
      ? section.coordinates.slice(1) : section.coordinates);
    route.distanceMeters += section.distanceMeters;
    route.durationSeconds += section.durationSeconds;
  }
  return route;
}

export async function planRoute(stops: RouteStop[], legs: PlannedLeg[], start: string, anchor: boolean, progress: (message: string) => void, signal?: AbortSignal) {
  if (stops.some(stop => !stop.label || stop.confirmed === false)) throw new Error(t('Select an address for every stop.'));
  for (let index = 0; index < legs.length; index++) if (legs[index].mode === 'flight') {
    const departure = routeInstant(legs[index].departure ?? '', stops[index].zone);
    const arrival = routeInstant(legs[index].arrival ?? '', stops[index + 1].zone);
    if (arrival <= departure) throw new Error('journey.route.invalid-time');
  }
  if (!anchor) routeInstant(start, stops[0].zone);
  const planned: PlannedLeg[] = [];
  for (let index = 0; index < legs.length; index++) {
    progress(`${t('Calculating the route…')} ${index + 1}/${legs.length}`);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const leg = legs[index];
    const from = stops[index], to = stops[index + 1];
    const key = legCalculationKey(from, to, leg.mode);
    const calculation = { fromStopId: from.id, toStopId: to.id, key, routingProfile: leg.mode, status: 'fresh' as const };
    if (leg.mode === 'flight') {
      planned.push({ ...leg, coordinates: flightCoordinates(from, to),
        calculation: { ...calculation, source: 'flight-estimate', computedAt: new Date().toISOString() } });
    } else if (leg.calculation?.key === key && leg.calculation.status === 'fresh' && leg.coordinates.length >= 2) {
      planned.push(leg);
    } else {
      const first = leg.coordinates[0], last = leg.coordinates.at(-1);
      const legacyMatches = !leg.calculation && first && last && leg.coordinates.length >= 2 &&
        geographicDistance(from, { longitude: first[0], latitude: first[1] }) < 3 &&
        geographicDistance(to, { longitude: last[0], latitude: last[1] }) < 3;
      if (legacyMatches) planned.push({ ...leg, calculation: { ...calculation, source: 'legacy' } });
      else {
        const road = await requestRoad(from, to, leg.mode, signal);
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        planned.push({ ...leg, ...road, calculation: { ...calculation, source: 'road-api', computedAt: new Date().toISOString() } });
      }
    }
  }
  const departure = anchor ? departureForFlight(stops, planned) : start;
  return { legs: planned, start: departure, rows: buildRouteTimeline(stops, planned, departure) };
}
