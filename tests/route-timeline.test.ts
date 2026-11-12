import { describe, expect, it } from 'vitest';
import {
  buildRouteTimeline,
  departureForFlight,
  routeInstant,
  type RouteStop,
  type RouteLeg,
} from '../src/features/journeys/domain/routeTimeline';
import {
  flightCoordinates,
  mapRouteLines,
  routeMapBounds,
} from '../src/features/journeys/domain/route';

const stop = (label: string, zone = 'Europe/Moscow', stayMinutes = 0): RouteStop => ({
  id: label,
  label,
  zone,
  stayMinutes,
  longitude: 37,
  latitude: 55,
});
describe('travel planning in local time zones', () => {
  it('keeps a Pacific flight on the Pacific side of the map and includes its arc', () => {
    const tokyo = { ...stop('Tokyo'), latitude: 35.68, longitude: 139.69 };
    const la = { ...stop('Los Angeles'), latitude: 34.05, longitude: -118.24 };
    const points = flightCoordinates(tokyo, la);
    const bounds = routeMapBounds(points);
    expect(bounds[1][0] - bounds[0][0]).toBeLessThan(180);
    expect(bounds[1][1]).toBeGreaterThan(45);
    const lines = mapRouteLines(points);
    expect(lines).toHaveLength(2);
    for (const line of lines)
      for (let i = 1; i < line.length; i++)
        expect(Math.abs(line[i][0] - line[i - 1][0])).toBeLessThan(180);
  });
  it('works backwards through airport check-in and ground transfer', () => {
    const stops = [stop('Home'), stop('Airport'), stop('Destination', 'Asia/Dubai')];
    const legs: RouteLeg[] = [
      { mode: 'car', durationSeconds: 3600 },
      {
        mode: 'flight',
        durationSeconds: 0,
        departure: '2026-11-12T10:00',
        arrival: '2026-11-12T16:00',
      },
    ];
    const start = departureForFlight(stops, legs);
    expect(start).toBe('2026-11-12T07:00');
    const rows = buildRouteTimeline(stops, legs, start);
    expect(rows.map((row) => row.kind)).toEqual([
      'stop',
      'car',
      'stop',
      'checkin',
      'flight',
      'baggage',
      'stop',
    ]);
    expect(rows.at(-1)?.start).toBe('2026-11-12T12:45:00.000Z');
    expect(rows.find((row) => row.kind === 'flight')).toMatchObject({
      startZone: 'Europe/Moscow',
      zone: 'Asia/Dubai',
    });
  });
  it('does not silently reschedule a missed flight', () => {
    expect(() =>
      buildRouteTimeline(
        [stop('A'), stop('B')],
        [
          {
            mode: 'flight',
            durationSeconds: 0,
            departure: '2026-11-12T10:00',
            arrival: '2026-11-12T12:00',
          },
        ],
        '2026-11-12T09:00',
      ),
    ).toThrow('journey.route.missed-flight');
  });
  it('rejects both nonexistent and ambiguous daylight-saving times', () => {
    expect(() => routeInstant('2026-03-29T02:30', 'Europe/Berlin')).toThrow('invalid-time');
    expect(() => routeInstant('2026-10-25T02:30', 'Europe/Berlin')).toThrow('invalid-time');
  });
  it('supports flights crossing midnight and the date line', () => {
    const rows = buildRouteTimeline(
      [stop('Tokyo', 'Asia/Tokyo'), stop('LA', 'America/Los_Angeles')],
      [
        {
          mode: 'flight',
          durationSeconds: 0,
          departure: '2026-11-13T00:30',
          arrival: '2026-11-12T17:00',
          beforeMinutes: 60,
          afterMinutes: 0,
        },
      ],
      '2026-11-12T23:30',
    );
    expect(rows.find((row) => row.kind === 'flight')?.end).toBe('2026-11-13T01:00:00.000Z');
  });
  it('includes activities and waiting without losing time', () => {
    const rows = buildRouteTimeline(
      [stop('Home', 'Europe/Moscow', 15), stop('Airport'), stop('Arrival')],
      [
        { mode: 'car', durationSeconds: 1800 },
        {
          mode: 'flight',
          durationSeconds: 0,
          departure: '2026-11-12T10:00',
          arrival: '2026-11-12T12:00',
          beforeMinutes: 60,
        },
      ],
      '2026-11-12T07:00',
    );
    expect(rows.find((row) => row.kind === 'waiting')?.start).toBe('2026-11-12T04:45:00.000Z');
    expect(rows.find((row) => row.kind === 'waiting')?.end).toBe('2026-11-12T06:00:00.000Z');
  });
  it('rejects malformed or unbounded routes', () => {
    expect(() =>
      buildRouteTimeline(
        [stop('A'), stop('B')],
        [{ mode: 'car', durationSeconds: NaN }],
        '2026-11-12T10:00',
      ),
    ).toThrow('invalid-route');
    expect(() => buildRouteTimeline([stop('A')], [], '2026-11-12T10:00')).toThrow('invalid-route');
  });
});
