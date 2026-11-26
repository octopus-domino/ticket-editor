import { z } from 'zod';

const point = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) });
const text = z.string().max(4096);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.object({ amount: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/) });
export const tripPhoto = z.object({
  stopId: text, imageId: z.string().regex(/^[a-f0-9]{64}$/),
  sourceUrl: z.string().regex(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:[^\s<>"#]{1,1500}$/),
  author: z.string().trim().min(1).max(500), license: z.string().trim().min(1).max(80),
  licenseUrl: z.string().regex(/^https:\/\/creativecommons\.org\/(?:licenses\/(?:by|by-sa)\/\d\.\d|publicdomain\/(?:zero|mark)\/1\.0)\/(?:deed\.[a-z-]+)?$/),
});
const sharedTrip = z.object({
  title: text,
  startDate: date.optional(),
  endDate: date.optional(),
  cities: z.array(z.object({ id: text, name: text, latitude: point.shape.latitude.nullish(),
    longitude: point.shape.longitude.nullish() })).max(100),
  days: z.array(z.object({
    date, cityId: text, note: text.optional(), accommodationId: text.optional(),
    segments: z.array(z.object({
      id: text, title: text, latitude: point.shape.latitude.nullish(), longitude: point.shape.longitude.nullish(),
      note: text.optional(), idea: z.boolean().optional(), walkId: text.nullish(), sourceUrl: text.nullish(),
      walkNote: z.string().max(500).nullish(),
      photoRefs: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(7).nullish().catch(undefined),
      photoCredits: z.array(tripPhoto).max(7).nullish().catch(undefined),
    })).max(500),
    walkingSections: z.array(z.object({
      distanceMeters: z.number().nonnegative(), durationSeconds: z.number().nonnegative(),
      geometry: z.array(point).max(30_000),
      fromSegmentId: text.optional(), toSegmentId: text.optional(),
    })).max(500),
  })).max(366),
  accommodations: z.array(z.object({ id: text, name: text, address: text, checkIn: date, checkOut: date,
    latitude: point.shape.latitude.nullish(), longitude: point.shape.longitude.nullish(), cost: money.nullish() })).max(366),
  legs: z.array(z.object({
    geometry: z.array(point).max(100_000).nullish(),
    distanceMeters: z.number().nonnegative().nullish(),
    durationSeconds: z.number().nonnegative().nullish(),
    cost: money.nullish(),
    transport: z.enum(['PLANE', 'TRAIN', 'BUS', 'CAR', 'FERRY', 'WALK']).optional(),
    id: text, fromCityId: text, toCityId: text, departureAt: text.nullish(), arrivalAt: text.nullish(), note: text,
  })).max(366),
});

export type SharedTrip = z.infer<typeof sharedTrip>;

const urlLimit = 2000;
const expandedLimit = 512_000;

export function sharedTripJson(trip: unknown): string {
  return JSON.stringify(sharedTrip.parse(trip));
}

export async function shareTripUrl(trip: unknown, origin: string): Promise<string | undefined> {
  const json = sharedTripJson(trip);
  const source = new Blob([json]);
  if (source.size > expandedLimit) return;
  const zipped = new Uint8Array(await new Response(source.stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  if (zipped.length > urlLimit) return;
  const data = btoa(String.fromCharCode(...zipped)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  const url = new URL('/trip/view', origin);
  url.searchParams.set('data', data);
  if (url.href.length <= urlLimit) return url.href;
}

export async function readTripShareFile(file: File): Promise<SharedTrip> {
  if (file.size > 16 * 1024 * 1024) throw new Error('Trip file exceeds size limit');
  return sharedTrip.parse(JSON.parse(await file.text()));
}

export async function readTripShare(data: string): Promise<SharedTrip> {
  if (data.length > urlLimit || !/^[\w-]+$/.test(data)) throw new Error('Invalid trip link');
  const zipped = Uint8Array.from(atob(data.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0));
  const reader = new Blob([zipped]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let json = '';
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > expandedLimit) throw new Error('Trip link exceeds size limit');
      json += decoder.decode(chunk.value, { stream: true });
    }
    return sharedTrip.parse(JSON.parse(json + decoder.decode()));
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
