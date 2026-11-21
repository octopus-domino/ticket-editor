import { expect, test } from 'vitest';
import { scheduleDay } from '@/features/journeys/domain/planner/dayScheduling';
import { optimizeDayRoute } from '@/features/journeys/domain/planner/optimizeDayRoute';
import { defaultDayPreferences, type PlanningStop, type RoadMatrix } from '@/features/journeys/domain/planner/plannerTypes';

const stop = (id: string): PlanningStop => ({ id, title: id, latitude: 55, longitude: 37, locked: false, priority: 'must', visitMinutes: 15 });
const date = '2026-12-01';
const cost: RoadMatrix = () => ({ seconds: 600, meters: 700 });

test('keeps stops with unknown hours and warns about appointments after closing', () => {
  const result = scheduleDay([stop('unknown'), { ...stop('museum'), fixedStartLocal: '17:30',
    openingHours: { from: '10:00', to: '17:00', confidence: 'confirmed' } }], cost, date, 'Europe/Moscow', defaultDayPreferences);
  expect(result.rows).toHaveLength(2);
  expect(result.issues).toEqual(expect.arrayContaining([
    { stopId: 'unknown', kind: 'unknown_hours', severity: 'info' },
    { stopId: 'museum', kind: 'closed', severity: 'blocking' },
  ]));
});

test('never treats an absent directed road as a zero-cost leg', () => {
  const result = scheduleDay([stop('a'), stop('b')], () => undefined, date, 'Europe/Moscow', defaultDayPreferences);
  expect(result.rows[1].start).toBeUndefined();
  expect(result.issues).toContainEqual({ stopId: 'b', kind: 'unreachable', severity: 'blocking' });
});

test('uses directed roads and keeps start, end and locked points fixed', () => {
  const distances: Record<string, number> = { ab: 600, bc: 700, cd: 900, ac: 150, cb: 120, bd: 100 };
  const matrix: RoadMatrix = (a, b) => {
    const value = distances[a.id + b.id];
    return value === undefined ? undefined : { seconds: value, meters: value };
  };
  const original = ['a', 'b', 'c', 'd'].map(stop);
  const result = optimizeDayRoute(original, matrix, date, 'Europe/Moscow', defaultDayPreferences);
  expect(result.order.map(item => item.id)).toEqual(['a', 'c', 'b', 'd']);
  expect(result.after.walking).toBeLessThan(result.before.walking);
  expect(optimizeDayRoute([original[0], { ...original[1], locked: true }, ...original.slice(2)],
    matrix, date, 'Europe/Moscow', defaultDayPreferences).changed).toBe(false);
});

test('rejects ambiguous local appointments at the autumn clock change', () => {
  const result = scheduleDay([{ ...stop('museum'), fixedStartLocal: '02:30' }], cost, '2026-10-25', 'Europe/Berlin',
    { ...defaultDayPreferences, startLocal: '00:00' });
  expect(result.issues).toContainEqual({ stopId: 'museum', kind: 'time_zone', severity: 'blocking' });
});

test('only proposes dropping a lower-priority stop to resolve a closed visit', () => {
  const museum: PlanningStop = { ...stop('museum'), priority: 'preferred',
    openingHours: { from: '08:00', to: '08:15', confidence: 'confirmed' } };
  const original = [stop('start'), museum, stop('park'), stop('end')];
  const proposal = optimizeDayRoute(original, cost, date, 'Europe/Moscow', defaultDayPreferences);
  expect(proposal.before.issues).toContainEqual({ stopId: 'museum', kind: 'closed', severity: 'blocking' });
  expect(proposal.removed.map(item => item.id)).toEqual(['museum']);
  expect(proposal.after.issues.some(issue => issue.severity === 'blocking')).toBe(false);
  expect(optimizeDayRoute([original[0], { ...museum, priority: 'must' }, ...original.slice(2)],
    cost, date, 'Europe/Moscow', defaultDayPreferences).removed).toEqual([]);
});
