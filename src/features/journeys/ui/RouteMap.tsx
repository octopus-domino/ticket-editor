import { lazy, Suspense } from 'react';
import { LeafletTripMap } from './LeafletTripMap';
import type { RouteMapProps } from './routeMapTypes';

export type { RouteMapHandle, RouteMapLeg, RouteMapProps } from './routeMapTypes';

const VectorRouteMap = lazy(() => import('./VectorRouteMap'));

export function RouteMap(props: RouteMapProps) {
  return props.rasterBasemap ? <LeafletTripMap {...props} />
    : <Suspense fallback={<div className="route-map" aria-busy="true" />}><VectorRouteMap {...props} /></Suspense>;
}
