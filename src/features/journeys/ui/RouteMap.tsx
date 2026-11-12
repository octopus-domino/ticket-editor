import { useEffect, useRef, useState } from 'react';
import {
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
  setWorkerCount,
  setMaxParallelImageRequests,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { t } from '@/shared/i18n';
import type { RouteStop } from '../domain/routeTimeline';
import type { PlannedLeg } from '../domain/route';
import { mapRouteLines, routeMapBounds } from '../domain/route';

setWorkerUrl(workerUrl);
setWorkerCount(2);
setMaxParallelImageRequests(4);
export interface RouteMapHandle {
  capture: () => Promise<string>;
}
export function RouteMap({
  stops,
  legs,
  onReady,
}: {
  stops: RouteStop[];
  legs: PlannedLeg[];
  onReady: (handle: RouteMapHandle | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    if (!container.current) return;
    let map: Map;
    try {
      map = new Map({
        container: container.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [37.62, 55.75],
        zoom: 9,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        maxTileCacheSize: 128,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        attributionControl: { compact: true },
      });
    } catch {
      setError(t('The map could not be loaded. Check WebGL support in your browser.'));
      return;
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    const fail = window.setTimeout(() => {
      if (!map.isStyleLoaded())
        setError(t('The map is taking too long to load. Check your connection.'));
    }, 20000);
    map.once('load', () => {
      clearTimeout(fail);
      setError('');
      setReady(true);
      onReadyRef.current({
        capture: async () => {
          if (!map.loaded())
            await new Promise<void>((resolve, reject) => {
              const timer = setTimeout(() => {
                map.off('idle', done);
                reject(new Error(t('Wait until the map has finished loading.')));
              }, 15000);
              const done = () => {
                clearTimeout(timer);
                resolve();
              };
              map.once('idle', done);
            });
          // Re-render at print resolution using the same viewport, then restore the interactive map.
          const previous = map.getPixelRatio();
          try {
            map.setPixelRatio(2400 / Math.max(1, map.getContainer().clientWidth));
            map.triggerRepaint();
            await new Promise<void>((resolve) => map.once('render', () => resolve()));
            const canvas = document.createElement('canvas');
            canvas.width = 2400;
            canvas.height = 1500;
            const context = canvas.getContext('2d');
            if (!context) throw new Error(t('Could not prepare the image.'));
            context.fillStyle = '#fff';
            context.fillRect(0, 0, 2400, 1500);
            context.drawImage(map.getCanvas(), 0, 0, 2400, 1500);
            // DOM markers are not part of the WebGL canvas, so explicitly print numbered stops.
            stopsRef.current.forEach((stop, index) => {
              const longitude =
                stop.longitude + Math.round((map.getCenter().lng - stop.longitude) / 360) * 360;
              const point = map.project([longitude, stop.latitude]);
              const x = (point.x / map.getContainer().clientWidth) * 2400,
                y = (point.y / map.getContainer().clientHeight) * 1500;
              context.beginPath();
              context.arc(x, y, 36, 0, Math.PI * 2);
              context.fillStyle = '#244e42';
              context.fill();
              context.strokeStyle = '#fff';
              context.lineWidth = 5;
              context.stroke();
              context.font = 'bold 42px sans-serif';
              context.textAlign = 'center';
              context.textBaseline = 'middle';
              context.fillStyle = '#fff';
              context.fillText(String(index + 1), x, y);
            });
            context.fillStyle = '#ffffffee';
            context.fillRect(0, 1444, 2400, 56);
            context.fillStyle = '#273c35';
            context.font = '22px sans-serif';
            context.textAlign = 'right';
            context.textBaseline = 'middle';
            context.fillText(
              '© OpenStreetMap contributors · openstreetmap.org/copyright · OpenFreeMap / OpenMapTiles',
              2370,
              1472,
            );
            for (const quality of [0.88, 0.8, 0.72, 0.64]) {
              const image = canvas.toDataURL('image/jpeg', quality);
              if (image.length <= 1200000) return image;
            }
            throw new Error(t('Could not prepare the image.'));
          } finally {
            map.setPixelRatio(previous);
          }
        },
      });
    });
    return () => {
      clearTimeout(fail);
      observer.disconnect();
      onReadyRef.current(null);
      mapRef.current = null;
      map.remove();
    };
  }, []);
  const stopsRef = useRef(stops);
  stopsRef.current = stops;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const id of ['route-road', 'route-flight']) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource('journey-route')) map.removeSource('journey-route');
    map.addSource('journey-route', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: legs
          .filter((leg) => leg.coordinates.length >= 2)
          .map((leg) => ({
            type: 'Feature',
            properties: { mode: leg.mode },
            geometry: { type: 'MultiLineString', coordinates: mapRouteLines(leg.coordinates) },
          })),
      },
    });
    map.addLayer({
      id: 'route-road',
      type: 'line',
      source: 'journey-route',
      filter: ['!=', ['get', 'mode'], 'flight'],
      paint: { 'line-color': '#225fcb', 'line-width': 5, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: 'route-flight',
      type: 'line',
      source: 'journey-route',
      filter: ['==', ['get', 'mode'], 'flight'],
      paint: { 'line-color': '#af5347', 'line-width': 4, 'line-dasharray': [2, 2] },
    });
    const markers = stops.map((stop, index) => {
      const element = document.createElement('span');
      element.className = 'route-map-marker';
      element.textContent = String(index + 1);
      element.title = stop.label;
      return new Marker({ element, anchor: 'center' })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(map);
    });
    if (stops.length) {
      const coordinates: [number, number][] = [
        ...stops.map((stop): [number, number] => [stop.longitude, stop.latitude]),
        ...legs.flatMap((leg) => leg.coordinates),
      ];
      map.fitBounds(routeMapBounds(coordinates), { padding: 55, maxZoom: 14, duration: 0 });
    }
    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [stops, legs, ready]);
  return (
    <div>
      <div ref={container} className="route-map" aria-label={t('Route map')} />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
