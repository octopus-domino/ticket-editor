import { describe, expect, it } from 'vitest';
import { importPrivateWalk, isWalkMessage, readPrivateWalk } from '../src/features/journeys/domain/privateWalk';
const origin = { id: 'city', label: 'Petersburg', latitude: 59.9, longitude: 30.3, zone: 'Europe/Moscow', stayMinutes: 0 };
const walk = {
  version: 1, title: 'Along the river',
  points: [{ lat: 59.9, lng: 30.3, name: 'Start' }, { lat: 59.91, lng: 30.31, name: 'End' }],
  route: { legs: [{ fromIndex: 0, toIndex: 1, durationSeconds: 600, distanceMeters: 900, geometry: [[59.9, 30.3], [59.905, 30.302], [59.91, 30.31]] }] },
};
describe('Private walk transfer', () => {
  it('keeps actual road geometry, order, title and local start time for the trip PDF', () => {
    const result = importPrivateWalk(walk, origin, '2026-11-18T09:00');
    expect(result.legs[0].coordinates).toEqual([[30.3, 59.9], [30.302, 59.905], [30.31, 59.91]]);
    expect(result.stops[0].meta?.walk_title).toBe(walk.title);
    expect(result.timeline[0].start).toBe('2026-11-18T06:00:00.000Z');
    expect(result.timeline.at(-1)?.end).toBe('2026-11-18T06:10:00.000Z');
    expect(result.stops.every(stop => !stop.walkId)).toBe(true);
  });
  it('rejects incomplete routes and invalid coordinates instead of drawing straight segments', () => {
    expect(() => importPrivateWalk({ ...walk, route: { legs: [] } }, origin, '2026-11-18T09:00')).toThrow();
    expect(() => importPrivateWalk({ ...walk, points: [{ lat: 999, lng: 30 }, walk.points[1]] }, origin, '2026-11-18T09:00')).toThrow();
  });
  it('imports legacy HTTP CityWalls references without recalculating the saved geometry', () => {
    const result = importPrivateWalk({ ...walk, points: [
      { ...walk.points[0], sourceUrl: 'http://www.citywalls.ru/house126.html' },
      { ...walk.points[1], sourceUrl: 'javascript:alert(1)' },
    ] }, origin, '2026-11-21T12:00');
    expect(result.stops[0].description).toBe('https://www.citywalls.ru/house126.html');
    expect(result.stops[1].description).toBe('');
    expect(result.legs[0].coordinates).toEqual([[30.3, 59.9], [30.302, 59.905], [30.31, 59.91]]);
  });
  it('reads an additive transfer and retains identity, source, notes and explicit image references', () => {
    const schedule = { Thu: { working_hours: [{ from: '10:00', to: '18:00' }] } };
    const value = { ...walk, id: 'walk_fixture', future: { experimental: true },
      points: [{ ...walk.points[0], poiId: 'poi-first', note: 'Meet here',
        sourceUrl: 'https://example.test/house', photoReference: 'File:Museum.jpg', schedule },
      { ...walk.points[1], photoReference: 'https://example.test/display-only.jpg' }],
    };
    const result = readPrivateWalk(value, 'UTC');
    expect(result.id).toBe('walk_fixture');
    expect(result.stops.map(stop => stop.id)).toEqual(readPrivateWalk(value, 'UTC').stops.map(stop => stop.id));
    expect(result.stops[0].meta).toMatchObject({ poi_id: 'poi-first', user_note: 'Meet here', source_url: 'https://example.test/house' });
    expect(result.candidates).toMatchObject([{ stopId: result.stops[0].id, photoReference: 'File:Museum.jpg' }]);
    expect(result.places[0].schedule).toEqual(schedule);
    expect(readPrivateWalk(walk, 'UTC').candidates).toEqual([]);
  });
  it('matches the origin, source and channel before accepting an iframe message', () => {
    const source = { } as Window;
    const origin = 'https://codoc.example';
    const data = { type: 'private-walk:complete', channel: 'test-channel', walk };
    const event = { data, origin, source } as MessageEvent;
    expect(isWalkMessage(event, origin, source, 'test-channel')).toBe(true);
    expect(isWalkMessage({ ...event, origin: 'https://elsewhere.example' }, origin, source, 'test-channel')).toBe(false);
    expect(isWalkMessage(event, origin, source, 'different-channel')).toBe(false);
    expect(isWalkMessage(event, origin, null, 'test-channel')).toBe(false);
  });
});
