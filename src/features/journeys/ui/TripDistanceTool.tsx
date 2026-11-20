import { useEffect, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { requestRoad } from '../api/routePlanner';
import type { CityPoint } from '../api/tripDraft';
import { RouteMap, type RouteMapLeg } from './RouteMap';
import { geographicDistance } from '../domain/route';

const ignoreMapHandle = () => undefined;

export function TripDistanceTool() {
  const [points, setPoints] = useState<CityPoint[]>([]);
  const [roads, setRoads] = useState<{ legs: RouteMapLeg[]; distance: number }>();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);
  const coordinates = points.map(({ longitude, latitude }): [number, number] => [longitude, latitude]);
  const direct = points.slice(1).reduce((sum, point, index) => sum + geographicDistance(points[index], point), 0);
  const kilometres = (meters: number) => new Intl.NumberFormat(getLocale(), {
    style: 'unit', unit: 'kilometer', maximumFractionDigits: 1,
  }).format(meters / 1000);

  function update(next: CityPoint[]) {
    request.current?.abort();
    request.current = undefined;
    setPoints(next);
    setRoads(undefined);
    setError(false);
    setBusy(false);
  }

  async function calculate() {
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(false);
    try {
      const legs: RouteMapLeg[] = [];
      let distance = 0;
      for (let index = 1; index < points.length; index++) {
        const road = await requestRoad(points[index - 1], points[index], 'car', controller.signal);
        legs.push({ ...road, mode: 'car' });
        distance += road.distanceMeters;
      }
      if (!controller.signal.aborted) setRoads({ legs, distance });
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (request.current === controller) {
        request.current = undefined;
        setBusy(false);
      }
    }
  }

  return <section aria-label={t('Measure distance')}>
    <p>{t('Select at least two points on the trip map.')}</p>
    <RouteMap rasterBasemap stops={points.map((point, index) => ({ ...point, id: String(index),
      label: String(index + 1), zone: 'UTC', stayMinutes: 0 }))}
      legs={roads?.legs ?? [{ mode: 'transfer', coordinates }]} onReady={ignoreMapHandle} cityMap fit={false}
      onPick={points.length < 8 ? point => update([...points, point]) : undefined} />
    {points.length >= 2 && <p>{t('Straight-line distance')} · {kilometres(direct)}</p>}
    {roads && <p>{t('Road distance')} · {kilometres(roads.distance)}</p>}
    {error && <p role="alert">{t('The road route could not be calculated. Try closer stops or retry later.')}</p>}
    <button type="button" disabled={points.length < 2 || busy} onClick={() => void calculate()}>{t('Road distance')}</button>
    <button type="button" disabled={!points.length} onClick={() => update(points.slice(0, -1))}>{t('Undo')}</button>
  </section>;
}
