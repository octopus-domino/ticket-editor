import { describe, expect, it } from 'vitest';
import { reorderRoute } from '@/features/journeys/domain/reorderRoute';
import { cityVisitPlan, nearestPlaces, type RecommendedPlace } from '@/features/journeys/domain/cityVisitPlan';
import type { RouteStop } from '@/features/journeys/domain/routeTimeline';
import type { PlannedLeg } from '@/features/journeys/domain/route';
const stop = (id: string): RouteStop => ({ id, label: id, longitude: 37, latitude: 55, zone: 'Europe/Moscow', stayMinutes: 0, description: `Notes ${id}` });
const leg = (mode: PlannedLeg['mode']): PlannedLeg => ({ mode, durationSeconds: 600, coordinates: [[37, 55], [38, 56]], departure: '2026-11-12T10:00', arrival: '2026-11-12T11:00' });
const place = (id: string, from = '10:00', to = '18:00'): RecommendedPlace => ({ id, label: id, latitude: 55, longitude: 37, url: 'https://2gis.ru/', schedule: { Thu: { working_hours: [{ from, to }] } } });
describe('route reorder and city visits', () => {
  it('retains directed flights only for the original pair and carries notes with the stop', () => {
    const stops = ['a', 'b', 'c', 'd'].map(stop), legs = [leg('flight'), leg('car'), leg('foot')];
    const result = reorderRoute(stops, legs, 3, 2);
    expect(result.stops.map(item => item.id)).toEqual(['a', 'b', 'd', 'c']);
    expect(result.stops[2].description).toBe('Notes d');
    expect(result.legs[0]).toBe(legs[0]);
    expect(result.legs.slice(1).every(item => item.coordinates.length === 0 && !item.departure)).toBe(true);
    expect(stops.map(item => item.id)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('does not attach a booked flight to a reversed pair', () => {
    const result = reorderRoute([stop('a'), stop('b')], [leg('flight')], 0, 1);
    expect(result.legs[0]).toMatchObject({ mode: 'car', coordinates: [], durationSeconds: 0 });
  });
  it('waits for opening and leaves evenings and nights free', () => {
    const result = cityVisitPlan([place('museum'), place('late', '21:30', '23:00')], '2026-11-12', [900, 900]);
    expect(result.visits).toHaveLength(1);
    expect(result.visits[0]).toMatchObject({ start: '2026-11-12T10:00', end: '2026-11-12T11:00' });
    expect(result.skipped.map(item => item.id)).toEqual(['late']);
  });
  it('does not invent hours, plan through a lunch break or visit on a closed weekday', () => {
    const split = place('split'); split.schedule = { Thu: { working_hours: [{ from: '10:00', to: '10:30' }, { from: '14:00', to: '17:00' }] } };
    expect(cityVisitPlan([split], '2026-11-12', [0]).visits[0].start).toBe('2026-11-12T14:00');
    expect(cityVisitPlan([{ ...place('unknown'), schedule: undefined }, place('closed')], '2026-11-13', [0, 0]).visits).toEqual([]);
  });
  it('orders nearby visits without mutating provider results', () => {
    const places = [{ ...place('far'), longitude: 37.1 }, { ...place('near'), longitude: 37.01 }];
    expect(nearestPlaces(stop('origin'), places).map(item => item.id)).toEqual(['near', 'far']);
    expect(places[0].id).toBe('far');
  });
});
