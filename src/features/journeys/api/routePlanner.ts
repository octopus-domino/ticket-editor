import { t } from '@/shared/i18n';
import { journeyRequest } from './journeys';
import { routeInstant, buildRouteTimeline, departureForFlight, type RouteStop } from '../domain/routeTimeline';
import { flightCoordinates, type PlannedLeg } from '../domain/route';

export async function planRoute(stops: RouteStop[], legs: PlannedLeg[], start: string, anchor: boolean, progress: (message: string) => void) {
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
    const leg = legs[index];
    if (leg.mode === 'flight') planned.push({ ...leg, coordinates: flightCoordinates(stops[index], stops[index + 1]) });
    else if (leg.coordinates.length) planned.push(leg);
    else {
      const road = await journeyRequest<Pick<PlannedLeg, 'coordinates' | 'distanceMeters' | 'durationSeconds'>>('/api/journeys/routes/road', {
        method: 'POST', body: JSON.stringify({ start: { longitude: stops[index].longitude, latitude: stops[index].latitude },
          end: { longitude: stops[index + 1].longitude, latitude: stops[index + 1].latitude }, mode: leg.mode }) });
      planned.push({ ...leg, ...road });
    }
  }
  const departure = anchor ? departureForFlight(stops, planned) : start;
  return { legs: planned, start: departure, rows: buildRouteTimeline(stops, planned, departure) };
}
