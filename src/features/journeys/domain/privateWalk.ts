import { z } from 'zod';
import type { PlannedLeg } from './route';
import { routeInstant, type RouteStop, type TimelineRow } from './routeTimeline';

const latitude = z.number().finite().min(-85).max(85);
const longitude = z.number().finite().min(-180).max(180);
const coordinate = z.tuple([latitude, longitude]);
const walkId = z.string().regex(/^[a-zA-Z0-9_-]{1,48}$/);
const hours = z.object({ from: z.string().regex(/^\d{2}:\d{2}$/), to: z.string().regex(/^\d{2}:\d{2}$/) });
const schedule = z.partialRecord(z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  z.object({ working_hours: z.array(hours).max(4).optional() }));
const walkSchema = z.object({
  version: z.literal(1), id: walkId.optional(), title: z.string().trim().min(1).max(200),
  points: z.array(z.object({ lat: latitude, lng: longitude, name: z.string().max(300).optional(),
    description: z.string().max(500).optional(), sourceUrl: z.string().max(2048).optional(),
    note: z.string().max(500).optional(), photoReference: z.string().max(240).optional(),
    poiId: z.string().max(180).optional(),
    source: z.string().max(80).optional(), theme: z.string().max(80).optional(),
    architect: z.string().max(500).optional(), visitStatus: z.string().max(40).optional(),
    inOsm: z.boolean().optional(), schedule: schedule.optional().catch(undefined),
  })).min(2).max(200),
  route: z.object({ legs: z.array(z.object({
    fromIndex: z.number().int(), toIndex: z.number().int(),
    geometry: z.array(coordinate).min(2).max(30000),
    distanceMeters: z.number().finite().nonnegative(), durationSeconds: z.number().finite().positive().max(43200),
  })).min(1).max(199) }),
});

function walkSourceUrl(value?: string): string | undefined {
  if (!value || value.length > 2048) return;
  const citywalls = /^https?:\/\/(?:www\.)?citywalls\.ru\/house(\d+)\.html(?:[?#].*)?$/i.exec(value);
  if (citywalls) return `https://www.citywalls.ru/house${citywalls[1]}.html`;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch {
    // An unusable reference does not invalidate the recorded geometry.
  }
}

/** Decodes the base64url payload used by walk share links before schema validation. */
export function decodePrivateWalkLink(encoded: string): unknown {
  if (encoded.length > 2_500_000) throw new Error('Private walk is too large');
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Validates and copies points and geometry from the standalone walk application. */
export function readPrivateWalk(value: unknown, zone: string) {
  const input = value as { points?: unknown[]; route?: { legs?: { geometry?: unknown[] }[] } } | null;
  const legsInput = input?.route?.legs;
  if (Array.isArray(input?.points) && input.points.length > 200 ||
      Array.isArray(legsInput) && (legsInput.length > 199 ||
        legsInput.reduce((count, leg) => count + (Array.isArray(leg?.geometry) ? leg.geometry.length : 0), 0) > 30000))
    throw new Error('Private walk geometry is too large');
  const walk = walkSchema.parse(value);
  if (walk.route.legs.length !== walk.points.length - 1 || walk.route.legs.some((leg, index) => leg.fromIndex !== index || leg.toIndex !== index + 1))
    throw new Error('Incomplete private walk');
  if (walk.route.legs.reduce((sum, leg) => sum + leg.geometry.length, 0) > 30000)
    throw new Error('Private walk geometry is too large');

  const stops: RouteStop[] = walk.points.map((point, index) => {
    const source = walkSourceUrl(point.sourceUrl);
    const meta: Record<string, string> = {};
    if (index === 0) meta.walk_title = walk.title;
    if (source && source.length <= 500) meta.source_url = source;
    if (point.note) meta.user_note = point.note;
    if (point.poiId) meta.poi_id = point.poiId;
    if (point.source) meta.source = point.source;
    if (point.theme) meta.theme = point.theme;
    if (point.architect) meta.architect = point.architect;
    if (point.visitStatus) meta.visit_status = point.visitStatus;
    if (point.inOsm !== undefined) meta.in_osm = String(point.inOsm);
    return {
      id: walk.id ? `walk-${walk.id}-${index + 1}` : crypto.randomUUID(),
      label: point.name?.trim() || `${index + 1}`, latitude: point.lat, longitude: point.lng,
      zone, stayMinutes: 0,
      description: [point.description, source].filter(Boolean).join('\n').slice(0, 500),
      meta,
    };
  });
  const legs: PlannedLeg[] = walk.route.legs.map(leg => ({
    mode: 'foot', durationSeconds: leg.durationSeconds, distanceMeters: leg.distanceMeters,
    coordinates: leg.geometry.map(([lat, lng]) => [lng, lat]),
  }));
  const places = walk.points.map((point, index) => ({
    stopId: stops[index].id, label: stops[index].label, latitude: point.lat, longitude: point.lng,
    url: walkSourceUrl(point.sourceUrl) ?? '', id: stops[index].id, photoReference: point.photoReference,
    schedule: point.schedule,
  }));
  const candidates = places.filter(point => point.photoReference &&
    /^(?:Q[1-9][0-9]{0,15}|File:[^|#]{1,235})$/.test(point.photoReference) &&
    [...point.photoReference].every(character => character.charCodeAt(0) >= 32)).slice(0, 7);
  return { id: walk.id, title: walk.title, stops, legs, places, candidates };
}

/** Adapter for the existing printable child snapshot. */
export function importPrivateWalk(value: unknown, origin: RouteStop, startLocal: string) {
  const { stops, legs, places, candidates } = readPrivateWalk(value, origin.zone);
  const timeline = walkingTimeline(stops, legs, startLocal);
  return { stops, legs, startLocal, timeline, places, candidates };
}

export function isWalkMessage(event: MessageEvent, origin: string, source: Window | null | undefined, channel: string) {
  return Boolean(source && event.source === source && event.origin === origin && channel &&
    event.data?.type === 'private-walk:complete' && event.data.channel === channel);
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
