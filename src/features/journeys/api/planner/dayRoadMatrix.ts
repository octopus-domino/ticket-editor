import { requestRoad } from '../routePlanner';
import { legCalculationKey } from '../../domain/planner/legCalculationKey';
import type { PlanningStop, RoadCost, RoadMatrix } from '../../domain/planner/plannerTypes';

type LocatedStop = PlanningStop & { latitude: number; longitude: number };
const located = (stop: PlanningStop): stop is LocatedStop => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude);
const key = (from: LocatedStop, to: LocatedStop) => legCalculationKey(from, to, 'foot');

export async function readDayRoads(stops: PlanningStop[], cache: Map<string, RoadCost>, returnToStart: boolean, alternatives: boolean,
  signal: AbortSignal): Promise<RoadMatrix> {
  const get: RoadMatrix = (from, to) => located(from) && located(to) ? cache.get(key(from, to)) : undefined;
  const seen = new Set<string>();
  const budget = alternatives ? 24 : Math.min(12, stops.length);
  async function read(from: PlanningStop, to: PlanningStop) {
    if (!located(from) || !located(to) || seen.size >= budget || signal.aborted) return;
    const id = key(from, to);
    if (cache.has(id) || seen.has(id)) return;
    seen.add(id);
    try {
      if (from.latitude === to.latitude && from.longitude === to.longitude) {
        cache.set(id, { seconds: 0, meters: 0 });
        return;
      }
      const road = await requestRoad(from, to, 'foot', signal);
      if (!signal.aborted) cache.set(id, { seconds: road.durationSeconds, meters: road.distanceMeters, coordinates: road.coordinates });
    } catch { /* A missing pair remains unknown. */ }
  }
  const readOrder = async (order: PlanningStop[]) => {
    for (let i = 1; i < order.length; i++) await read(order[i - 1], order[i]);
    if (returnToStart && order.length > 1) await read(order[order.length - 1], order[0]);
  };
  await readOrder(stops);
  if (alternatives && stops.length <= 12) {
    for (let i = 1; i < stops.length - 1 && seen.size < budget; i++) {
      if (stops[i].priority !== 'must' && !stops[i].locked && !stops[i].fixedStartLocal)
        await read(stops[i - 1], stops[i + 1]);
    }
    for (let gap = 1; gap < stops.length - 2 && seen.size < budget; gap++) {
      for (let i = 1; i + gap < stops.length - 1 && seen.size < budget; i++) {
        const j = i + gap;
        if (stops[i].locked || stops[j].locked || stops[i].fixedStartLocal || stops[j].fixedStartLocal) continue;
        const order = [...stops];
        [order[i], order[j]] = [order[j], order[i]];
        await readOrder(order);
      }
    }
  }
  return get;
}
