import { expect, test } from 'vitest';
import { scheduledSeconds, tripDayDate } from '@/features/journeys/domain/planner/travelTimes';

test('uses station offsets to distinguish the repeated hour at the DST transition', () => {
  expect(scheduledSeconds('2026-10-25T02:15:00+02:00', '2026-10-25T02:15:00+01:00')).toBe(3600);
  expect(scheduledSeconds('2026-10-25T02:15:00', '2026-10-25T03:15:00')).toBeUndefined();
});

test('adds calendar days independently of DST or the device zone', () => {
  expect(tripDayDate('2026-10-24', 3)).toBe('2026-10-26');
  expect(tripDayDate('not a date', 3)).toBeUndefined();
});
