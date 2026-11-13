import type { CityVisit } from './cityVisitPlan';
import type { PlannedLeg } from './route';
import { routeInstant, type RouteStop, type TimelineRow } from './routeTimeline';

/** Keep published opening-time waits in the saved map/PDF instead of treating them as walking. */
export function timedCityWalk(origin: RouteStop, visits: CityVisit[], roads: PlannedLeg[], date: string) {
  if (!visits.length || roads.length !== visits.length + 1) throw new Error('Invalid walking plan');
  const stops = [{ ...origin, walkId: undefined, stayMinutes: 0 }, ...visits.map(visit => ({
    ...visit.place, id: crypto.randomUUID(), zone: origin.zone, stayMinutes: 60,
    description:[visit.place.description?.slice(0,350),visit.place.url].filter(Boolean).join('\n').slice(0,500),
  })), { ...origin, id: crypto.randomUUID(), walkId: undefined, stayMinutes: 0 }];
  const startLocal = `${date}T09:00`, timeline: TimelineRow[] = [];
  let clock = routeInstant(startLocal, origin.zone);
  const add = (kind: TimelineRow['kind'], label: string, end: number, description?:string) => {
    if (end < clock) throw new Error('Invalid walking time');
    timeline.push({ kind, label, start: new Date(clock).toISOString(), end: new Date(end).toISOString(), zone: origin.zone, ...(description?{description}: {}) });
    clock = end;
  };
  add('stop', origin.label, clock);
  visits.forEach((visit, index) => {
    add('foot', `${stops[index].label} → ${visit.place.label}`, clock + roads[index].durationSeconds * 1000);
    const start = routeInstant(visit.start, origin.zone);
    if (start > clock) add('waiting', visit.place.label, start);
    add('stop', visit.place.label, routeInstant(visit.end, origin.zone),[visit.place.description?.slice(0,350),visit.place.url].filter(Boolean).join('\n').slice(0,500));
  });
  add('foot', `${visits.at(-1)!.place.label} → ${origin.label}`, clock + roads.at(-1)!.durationSeconds * 1000);
  add('stop', origin.label, clock);
  if (clock > routeInstant(`${date}T21:00`, origin.zone)) throw new Error('journey.route.walk-too-long');
  return { stops, timeline, startLocal };
}
