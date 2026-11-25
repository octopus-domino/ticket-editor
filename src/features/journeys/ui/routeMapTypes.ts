import type { RouteStop } from '../domain/routeTimeline';
import type { PlannedLeg, RoutePhoto } from '../domain/route';

export interface RouteMapHandle {
  capture: () => Promise<string>;
  center: () => { longitude: number; latitude: number };
}
export type RouteMapLeg = (PlannedLeg | { mode: 'transfer'; coordinates: [number, number][] }) & { id?: string };
export interface RouteMapProps {
  stops: RouteStop[];
  legs: RouteMapLeg[];
  onReady: (handle: RouteMapHandle | null) => void;
  onPick?: (point: { longitude: number; latitude: number }) => void;
  onUserMove?: (point: { longitude: number; latitude: number }) => void;
  pickedPoint?: { longitude: number; latitude: number } | null;
  focusStopId?: string;
  keepRouteInView?: boolean;
  cityMap?: boolean;
  rasterBasemap?: boolean;
  fit?: boolean | 'initial';
  onStopMove?: (id: string, point: { longitude: number; latitude: number }) => void;
  onStopSelect?: (id: string) => void;
  onLegSelect?: (id: string) => void;
  photos?: RoutePhoto[];
}

