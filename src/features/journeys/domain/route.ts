import type { RouteLeg, RouteStop, TimelineRow } from './routeTimeline';
export interface PlannedLeg extends RouteLeg {
  coordinates: [number, number][];
  distanceMeters?: number;
}
export interface RouteSnapshot {
  stops: RouteStop[];
  legs: PlannedLeg[];
  timeline: TimelineRow[];
  startLocal: string;
  mapId: string;
  photos?: RoutePhoto[];
  pointNumbering?: 'interior';
}
export function routePointMarker(index: number, count: number): string {
  return index === 0 ? 'A' : index === count - 1 ? 'B' : String(index);
}
export interface RoutePhoto { stopId: string; imageId: string; sourceUrl: string; author: string; license: string; licenseUrl: string }

/** Split at the date line so the renderer does not draw a flight across the whole world. */
export function mapRouteLines(coordinates: [number, number][]): [number, number][][] {
  if (!coordinates.length) return [];
  const lines: [number, number][][] = [[coordinates[0]]];
  for (let i = 1; i < coordinates.length; i++) {
    const previous = coordinates[i - 1],
      current = coordinates[i];
    if (Math.abs(current[0] - previous[0]) > 180) {
      const adjusted = current[0] + (current[0] > previous[0] ? -360 : 360);
      const edge = previous[0] > 0 ? 180 : -180;
      const latitude =
        previous[1] +
        ((current[1] - previous[1]) * (edge - previous[0])) / (adjusted - previous[0]);
      lines.at(-1)!.push([edge, latitude]);
      lines.push([[-edge, latitude]]);
    }
    lines.at(-1)!.push(current);
  }
  return lines;
}

export function routeMapBounds(
  coordinates: [number, number][],
): [[number, number], [number, number]] {
  const longitudes = coordinates.map((point) => (point[0] + 360) % 360).sort((a, b) => a - b);
  let gap = -1,
    start = 0;
  for (let i = 0; i < longitudes.length; i++) {
    const next = longitudes[(i + 1) % longitudes.length] + (i === longitudes.length - 1 ? 360 : 0);
    if (next - longitudes[i] > gap) {
      gap = next - longitudes[i];
      start = next % 360;
    }
  }
  const latitude = coordinates.map((point) => Math.max(-85, Math.min(85, point[1])));
  return [
    [start, Math.min(...latitude)],
    [start + 360 - gap, Math.max(...latitude)],
  ];
}

/** Spherical interpolation avoids a misleading straight line on long-haul flights. */
export function flightCoordinates(a: RouteStop, b: RouteStop): [number, number][] {
  const rad = Math.PI / 180;
  const vector = (point: RouteStop) => [
    Math.cos(point.latitude * rad) * Math.cos(point.longitude * rad),
    Math.cos(point.latitude * rad) * Math.sin(point.longitude * rad),
    Math.sin(point.latitude * rad),
  ];
  const first = vector(a),
    last = vector(b);
  const angle = Math.acos(
    Math.max(
      -1,
      Math.min(
        1,
        first.reduce((sum, x, i) => sum + x * last[i], 0),
      ),
    ),
  );
  if (angle < 1e-6)
    return [
      [a.longitude, a.latitude],
      [b.longitude, b.latitude],
    ];
  if (Math.abs(Math.sin(angle)) < 1e-6)
    return [
      [a.longitude, a.latitude],
      [b.longitude, b.latitude],
    ];
  return Array.from({ length: 65 }, (_, index) => {
    const t = index / 64,
      start = Math.sin((1 - t) * angle) / Math.sin(angle),
      end = Math.sin(t * angle) / Math.sin(angle);
    const [x, y, z] = first.map((value, i) => value * start + last[i] * end);
    return [
      Math.atan2(y, x) / rad,
      Math.max(-85, Math.min(85, Math.atan2(z, Math.hypot(x, y)) / rad)),
    ];
  });
}
