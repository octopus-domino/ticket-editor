import { scheduleDay, wallTime } from './dayScheduling';
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
  const times = new Map<string, number>();
  function resolveClock(clock: string) {
    const cached = times.get(clock);
    if (cached !== undefined) return cached;
    const time = wallTime(date, clock, zone);
    times.set(clock, time);
    return time;
  }
  const schedule = (order: PlanningStop[]) => scheduleDay(order, matrix, date, zone, preferences, resolveClock);
  const before = schedule(input);
  const w = weights[mode];
  function score(order: PlanningStop[]) {
    const result = schedule(order);
    if (result.issues.some(issue => issue.severity === 'blocking')) return Infinity;
    const penalty = result.issues.filter(issue => issue.kind === 'too_long').length * 10;
    const retained = new Set(order.map(stop => stop.id));
    const removedValue = input.reduce((penalty, stop) => retained.has(stop.id) ? penalty :
      penalty + (stop.priority === 'preferred' ? 2 : 1), 0);
    return result.walking / Math.max(600, before.walking) * w.walking +
      result.distance / Math.max(500, before.distance) * w.distance +
      result.wait / Math.max(600, before.wait) * w.wait + penalty + removedValue * (mode === 'interesting' ? 4 : 2);
  }
  let order = [...input], best = score(order);
  const movable = (index: number) => index > 0 && index < input.length - 1 && !input[index].locked && !input[index].fixedStartLocal;
  function consider(candidate: PlanningStop[]) {
    const value = score(candidate);
    if (value < best) { order = candidate; best = value; }
  }
  if (input.length <= 12) {
    const remaining = input.filter((_, index) => movable(index));
    const directed: PlanningStop[] = [];
    for (const [index, stop] of input.entries()) {
      const from = directed[index - 1];
      if (!movable(index) || !from) { directed.push(stop); continue; }
      const closest = remaining.reduce((pick, candidate, i) => {
        const weight = matrix(from, candidate)?.seconds ?? Infinity;
        return weight < pick.weight ? { i, weight } : pick;
      }, { i: 0, weight: Infinity });
      directed.push(remaining.splice(closest.i, 1)[0]);
    }
    consider(directed);
    // Do not move an anchor indirectly by reversing or shifting its position.
    for (let pass = 0; pass < 2; pass++) {
      for (let a = 1; a < order.length - 1; a++) for (let b = a + 1; b < order.length - 1; b++) {
        if (!movable(a) || !movable(b)) continue;
        const swapped = [...order];
        [swapped[a], swapped[b]] = [swapped[b], swapped[a]];
        consider(swapped);
        if (!order.slice(a, b + 1).every((_, i) => movable(a + i))) continue;
        consider([...order.slice(0, a), ...order.slice(a, b + 1).reverse(), ...order.slice(b + 1)]);
        const relocated = [...order];
        relocated.splice(b, 0, relocated.splice(a, 1)[0]);
        consider(relocated);
      }
    }
  }
  const issues = schedule(order).issues;
  if (issues.some(issue => issue.severity === 'blocking' || issue.kind === 'too_long')) {
    for (let index = 1; index < order.length - 1; index++) {
      if (order[index].priority === 'must' || order[index].locked || order[index].fixedStartLocal ||
          order.slice(index + 1).some(stop => stop.locked || stop.fixedStartLocal)) continue;
      const candidate = order.filter((_, position) => position !== index);
      const value = score(candidate);
      if (value < best) { best = value; order = candidate; break; }
    }
  }
  const retained = new Set(order.map(stop => stop.id));
  const removed = input.filter(stop => !retained.has(stop.id));
  return { order, removed, before, after: schedule(order),
    changed: order.some((stop, index) => stop.id !== input[index].id) };
}
