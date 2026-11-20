import { scheduleDay } from './dayScheduling';
import type { DayPlanPreferences, PlanningStop, RoadMatrix } from './plannerTypes';

export type OptimizationMode = 'balanced' | 'shortest' | 'relaxed' | 'interesting';
const weights = {
  balanced: { walking: 1, distance: .05, wait: .5 },
  shortest: { walking: .2, distance: 1, wait: .1 },
  relaxed: { walking: 1, distance: .05, wait: 1 },
  interesting: { walking: .6, distance: .02, wait: 1 },
};

/** Bounded directed swaps. Missing edges are not scored as a cheap shortcut. */
export function optimizeDayRoute(input: PlanningStop[], matrix: RoadMatrix, date: string, zone: string,
  preferences: DayPlanPreferences, mode: OptimizationMode = 'balanced') {
  const before = scheduleDay(input, matrix, date, zone, preferences);
  const w = weights[mode];
  function score(order: PlanningStop[]) {
    const result = scheduleDay(order, matrix, date, zone, preferences);
    if (result.issues.some(issue => issue.severity === 'blocking')) return Infinity;
    return result.walking * w.walking + result.distance * w.distance + result.wait * w.wait;
  }
  let order = [...input], best = score(order);
  const movable = (index: number) => index > 0 && index < input.length - 1 && !input[index].locked && !input[index].fixedStartLocal;
  // The stationary/pinned position checks use the input even after an accepted swap.
  if (input.length <= 12) for (let pass = 0; pass < 3; pass++) {
    for (let a = 1; a < order.length - 1; a++) for (let b = a + 1; b < order.length - 1; b++) {
      if (!movable(a) || !movable(b)) continue;
      const candidate = [...order];
      [candidate[a], candidate[b]] = [candidate[b], candidate[a]];
      const value = score(candidate);
      if (value < best) { order = candidate; best = value; }
    }
  }
  return { order, before, after: scheduleDay(order, matrix, date, zone, preferences),
    changed: order.some((stop, index) => stop.id !== input[index].id) };
}
