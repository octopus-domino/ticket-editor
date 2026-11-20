import { expect, test, vi } from 'vitest';
import { planRoute } from '@/features/journeys/api/routePlanner';
import { journeyRequest } from '@/features/journeys/api/journeys';
import type { RouteStop } from '@/features/journeys/domain/routeTimeline';

vi.mock('@/features/journeys/api/journeys', () => ({ journeyRequest: vi.fn() }));

const stops: RouteStop[] = [
  { id: 'start', label: 'Station', latitude: 55.75, longitude: 37.62, zone: 'Europe/Moscow', stayMinutes: 0 },
  { id: 'end', label: 'Hotel', latitude: 55.76, longitude: 37.64, zone: 'Europe/Moscow', stayMinutes: 0 },
];
const geometry: [number, number][] = [[37.62, 55.75], [37.64, 55.76]];

test('road requests send named coordinates and preserve returned longitude/latitude order', async () => {
  vi.mocked(journeyRequest).mockResolvedValueOnce({ coordinates: geometry, durationSeconds: 600, distanceMeters: 800 });
  const plan = await planRoute(stops, [{ mode: 'foot', coordinates: [], durationSeconds: 0 }],
    '2026-12-01T10:00', false, () => {});
  const [, request] = vi.mocked(journeyRequest).mock.calls[0];
  expect(JSON.parse(String(request?.body))).toEqual({
    start: { longitude: 37.62, latitude: 55.75 }, end: { longitude: 37.64, latitude: 55.76 }, mode: 'foot',
  });
  expect(plan.legs[0]).toMatchObject({ coordinates: geometry, durationSeconds: 600 });
});

test('a legacy road whose endpoints still match the stops can be reused', async () => {
  vi.mocked(journeyRequest).mockClear();
  const plan = await planRoute(stops, [{ mode: 'foot', coordinates: geometry, durationSeconds: 600 }],
    '2026-12-01T10:00', false, () => {});
  expect(plan.legs[0].coordinates).toEqual(geometry);
  expect(journeyRequest).not.toHaveBeenCalled();
});
