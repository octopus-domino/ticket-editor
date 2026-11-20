import { Temporal } from '@js-temporal/polyfill';
import type { DayPlanPreferences, PlanningIssue, PlanningStop, RoadMatrix } from './plannerTypes';

function wallTime(date: string, clock: string, zone: string) {
  return Number(Temporal.PlainDateTime.from(`${date}T${clock}`).toZonedDateTime(zone, { disambiguation: 'reject' }).epochMilliseconds);
}

export function scheduleDay(stops: PlanningStop[], road: RoadMatrix, date: string, zone: string, preferences: DayPlanPreferences) {
  const issues: PlanningIssue[] = [];
  let time: number | undefined;
  let finish: number | undefined;
  let walking = 0, distance = 0, wait = 0, visits = 0;
  const pace = { normal: 1, relaxed: 1.2, fast: .9 }[preferences.walkingPace];
  try {
    time = wallTime(date, preferences.startLocal, zone);
    finish = wallTime(date, preferences.finishLocal, zone);
    if (finish <= time) issues.push({ kind: 'too_long', severity: 'blocking' });
  } catch { issues.push({ kind: 'time_zone', severity: 'blocking' }); }
  const rows = stops.map((stop, index) => {
    if (stop.latitude == null || stop.longitude == null) issues.push({ stopId: stop.id, kind: 'missing_coordinates', severity: 'warning' });
    if (index > 0) {
      const leg = road(stops[index - 1], stop);
      if (leg) { walking += leg.seconds * pace; distance += leg.meters; if (time != null) time += leg.seconds * pace * 1000; }
      else { issues.push({ stopId: stop.id, kind: 'unreachable', severity: 'blocking' }); time = undefined; }
      if (time != null && preferences.includeBreaks && index % 2 === 0) time += 10 * 60_000;
    }
    const arrival = time;
    const duration = Math.max(0, stop.visitMinutes) * 60_000;
    visits += duration / 1000;
    let opens: number | undefined, closes: number | undefined, fixed: number | undefined;
    try {
      if (stop.openingHours?.from && stop.openingHours.to && stop.openingHours.confidence !== 'unknown') {
        opens = wallTime(date, stop.openingHours.from, zone);
        closes = wallTime(date, stop.openingHours.to, zone);
      } else issues.push({ stopId: stop.id, kind: 'unknown_hours', severity: 'info' });
      if (stop.fixedStartLocal) fixed = wallTime(date, stop.fixedStartLocal, zone);
    } catch { issues.push({ stopId: stop.id, kind: 'time_zone', severity: 'blocking' }); }
    if (time == null) return { stop };
    if (fixed != null && time > fixed) issues.push({ stopId: stop.id, kind: 'overlap', severity: 'blocking' });
    const start = fixed != null ? Math.max(fixed, time) : Math.max(opens ?? time, time);
    const end = start + duration;
    if ((opens != null && start < opens) || (closes != null && end > closes)) {
      issues.push({ stopId: stop.id, kind: 'closed', severity: stop.priority === 'must' ? 'blocking' : 'warning' });
    }
    wait += (start - time) / 1000;
    time = end;
    return { stop, arrival, start, end };
  });
  if (preferences.returnToStart && stops.length > 1) {
    const leg = road(stops[stops.length - 1], stops[0]);
    if (leg) { walking += leg.seconds * pace; distance += leg.meters; if (time != null) time += leg.seconds * pace * 1000; }
    else { issues.push({ kind: 'unreachable', severity: 'blocking' }); time = undefined; }
  }
  if ((finish != null && time != null && time > finish) ||
      (preferences.maxWalkingMinutes != null && walking > preferences.maxWalkingMinutes * 60)) {
    issues.push({ kind: 'too_long', severity: 'warning' });
  }
  return { issues, rows, walking, distance, wait, visits, remaining: finish != null && time != null ? (finish - time) / 1000 : undefined };
}
