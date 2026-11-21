import type { RouteStop, RouteLeg } from '../routeTimeline';

type Endpoint = Pick<RouteStop, 'id' | 'longitude' | 'latitude'>;

/** Coordinates are deliberately exact, so small pin moves also invalidate a snapped road. */
export function legCalculationKey(from: Endpoint, to: Endpoint, mode: RouteLeg['mode'], routingProfile = mode) {
  return JSON.stringify([routingProfile, mode, from.id, from.longitude, from.latitude, to.id, to.longitude, to.latitude]);
}
