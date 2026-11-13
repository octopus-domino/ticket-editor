import { Temporal } from '@js-temporal/polyfill';

export interface RouteStop {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
  zone: string;
  stayMinutes: number;
  description?: string;
  confirmed?: boolean;
  walkId?: string;
  meta?: Record<string,string>;
}
export interface RouteLeg {
  mode: 'car' | 'foot' | 'flight';
  durationSeconds: number;
  departure?: string;
  arrival?: string;
  beforeMinutes?: number;
  afterMinutes?: number;
}
export interface TimelineRow {
  kind: 'stop' | 'car' | 'foot' | 'flight' | 'waiting' | 'checkin' | 'baggage';
  label: string;
  start: string;
  end: string;
  zone: string;
  startZone?: string;
  description?: string;
}
export class RoutePlanningError extends Error {
  constructor(
    public readonly code: 'invalid-time' | 'invalid-route' | 'missed-flight',
    public readonly stop = -1,
  ) {
    super(`journey.route.${code}`);
  }
}

/** Reject ambiguous or nonexistent local times rather than shifting a booked flight. */
export function routeInstant(local: string, zone: string): number {
  try {
    return Temporal.PlainDateTime.from(local).toZonedDateTime(zone, { disambiguation: 'reject' })
      .epochMilliseconds;
  } catch {
    throw new RoutePlanningError('invalid-time');
  }
}
function minutes(value: number | undefined, fallback = 0): number {
  const result = value ?? fallback;
  if (!Number.isFinite(result) || result < 0 || result > 10080)
    throw new RoutePlanningError('invalid-route');
  return result * 60000;
}
function validate(stops: RouteStop[], legs: RouteLeg[]) {
  if (stops.length < 2 || stops.length > 12 || legs.length !== stops.length - 1)
    throw new RoutePlanningError('invalid-route');
  for (const stop of stops) {
    if (
      !stop.label.trim() ||
      stop.confirmed === false ||
      !Number.isFinite(stop.latitude) ||
      !Number.isFinite(stop.longitude) ||
      Math.abs(stop.latitude) > 85 ||
      Math.abs(stop.longitude) > 180
    )
      throw new RoutePlanningError('invalid-route');
    minutes(stop.stayMinutes);
  }
  for (const leg of legs) {
    if (!['car', 'foot', 'flight'].includes(leg.mode))
      throw new RoutePlanningError('invalid-route');
    if (
      leg.mode !== 'flight' &&
      (!Number.isFinite(leg.durationSeconds) ||
        leg.durationSeconds <= 0 ||
        leg.durationSeconds > 604800)
    )
      throw new RoutePlanningError('invalid-route');
    minutes(leg.beforeMinutes, 120);
    minutes(leg.afterMinutes, 45);
  }
}

/** Work backwards from the first fixed flight; ground transfers retain their actual duration. */
export function departureForFlight(stops: RouteStop[], legs: RouteLeg[]): string {
  validate(stops, legs);
  const index = legs.findIndex((leg) => leg.mode === 'flight');
  if (index < 0) throw new RoutePlanningError('invalid-route');
  let instant =
    routeInstant(legs[index].departure ?? '', stops[index].zone) -
    minutes(legs[index].beforeMinutes, 120) -
    minutes(stops[index].stayMinutes);
  for (let i = index - 1; i >= 0; i--)
    instant -= legs[i].durationSeconds * 1000 + minutes(stops[i].stayMinutes);
  return Temporal.Instant.fromEpochMilliseconds(instant)
    .toZonedDateTimeISO(stops[0].zone)
    .toPlainDateTime()
    .toString({ smallestUnit: 'minute' });
}

export function buildRouteTimeline(
  stops: RouteStop[],
  legs: RouteLeg[],
  startLocal: string,
): TimelineRow[] {
  validate(stops, legs);
  let clock = routeInstant(startLocal, stops[0].zone);
  const rows: TimelineRow[] = [];
  const add = (
    kind: TimelineRow['kind'],
    label: string,
    end: number,
    zone: string,
    startZone?: string,
  ) => {
    if (end < clock) throw new RoutePlanningError('invalid-time');
    rows.push({
      kind,
      label,
      start: new Date(clock).toISOString(),
      end: new Date(end).toISOString(),
      zone,
      ...(startZone ? { startZone } : {}),
    });
    clock = end;
  };
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];
    add('stop', stop.label, clock + minutes(stop.stayMinutes), stop.zone);
    if (stop.description?.trim()) rows[rows.length - 1].description = stop.description.trim();
    if (i === legs.length) break;
    const leg = legs[i];
    if (leg.mode === 'flight') {
      const departure = routeInstant(leg.departure ?? '', stop.zone);
      const arrival = routeInstant(leg.arrival ?? '', stops[i + 1].zone);
      if (arrival <= departure) throw new RoutePlanningError('invalid-time', i);
      const checkin = departure - minutes(leg.beforeMinutes, 120);
      if (clock > checkin) throw new RoutePlanningError('missed-flight', i);
      if (clock < checkin) add('waiting', stop.label, checkin, stop.zone);
      add('checkin', stop.label, departure, stop.zone);
      add('flight', `${stop.label} → ${stops[i + 1].label}`, arrival, stops[i + 1].zone, stop.zone);
      const baggage = minutes(leg.afterMinutes, 45);
      if (baggage) add('baggage', stops[i + 1].label, clock + baggage, stops[i + 1].zone);
    } else
      add(
        leg.mode,
        `${stop.label} → ${stops[i + 1].label}`,
        clock + leg.durationSeconds * 1000,
        stop.zone,
      );
  }
  return rows;
}
