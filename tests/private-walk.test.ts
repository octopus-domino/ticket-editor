import { describe, expect, it } from 'vitest';
import { importPrivateWalk } from '../src/features/journeys/domain/privateWalk';
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
});
