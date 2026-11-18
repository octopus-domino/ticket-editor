import { z } from 'zod';
import type { PlannedLeg } from './route';
import { routeInstant, type RouteStop, type TimelineRow } from './routeTimeline';

const latitude = z.number().finite().min(-85).max(85);
const longitude = z.number().finite().min(-180).max(180);
const coordinate = z.tuple([latitude, longitude]);
const walkSchema = z.object({
  version: z.literal(1), title: z.string().trim().min(1).max(200),
  points: z.array(z.object({ lat: latitude, lng: longitude, name: z.string().max(300).optional(),
    description: z.string().max(500).optional(), sourceUrl: z.url().startsWith('https://').optional(),
  })).min(2).max(200),
  route: z.object({ legs: z.array(z.object({
    fromIndex: z.number().int(), toIndex: z.number().int(),
    geometry: z.array(coordinate).min(2).max(30000),
    distanceMeters: z.number().finite().nonnegative(), durationSeconds: z.number().finite().positive().max(43200),
  })).min(1).max(199) }),
});

/** Adapter: validates the walk application's transfer before creating a printable child snapshot. */
export function importPrivateWalk(value: unknown, origin: RouteStop, startLocal: string) {
  const walk = walkSchema.parse(value);
  if (walk.route.legs.length !== walk.points.length - 1 || walk.route.legs.some((leg, index) => leg.fromIndex !== index || leg.toIndex !== index + 1))
    throw new Error('Incomplete private walk');
  if (walk.route.legs.reduce((sum, leg) => sum + leg.geometry.length, 0) > 30000)
    throw new Error('Private walk geometry is too large');

  const stops: RouteStop[] = walk.points.map((point, index) => ({
    id: crypto.randomUUID(), label: point.name?.trim() || `${index + 1}`,
    latitude: point.lat, longitude: point.lng, zone: origin.zone, stayMinutes: 0,
    description: [point.description, point.sourceUrl].filter(Boolean).join('\n').slice(0, 500),
    ...(index === 0 ? { meta: { walk_title: walk.title } } : {}),
  }));
  const legs: PlannedLeg[] = walk.route.legs.map(leg => ({
    mode: 'foot', durationSeconds: leg.durationSeconds, distanceMeters: leg.distanceMeters,
    coordinates: leg.geometry.map(([lat, lng]) => [lng, lat]),
  }));
  const timeline = walkingTimeline(stops, legs, startLocal);
  return { stops, legs, startLocal, timeline };
}

function walkingTimeline(stops: RouteStop[], legs: PlannedLeg[], startLocal: string): TimelineRow[] {
  let clock = routeInstant(startLocal, stops[0].zone);
  const rows: TimelineRow[] = [];
  stops.forEach((stop, index) => {
    const start = new Date(clock).toISOString();
    rows.push({ kind: 'stop', label: stop.label, start, end: start, zone: stop.zone, description: stop.description });
    const leg = legs[index];
    if (!leg) return;
    clock += leg.durationSeconds * 1000;
    rows.push({ kind: 'foot', label: `${stop.label} → ${stops[index + 1].label}`, start, end: new Date(clock).toISOString(), zone: stop.zone });
  });
  return rows;
}
