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
import type { PlannedLeg, RoutePhoto } from '../domain/route';
import { drawMapCollage } from './drawMapCollage';
import { mapRouteLines, routeMapBounds } from '../domain/route';

setWorkerUrl(workerUrl);
setWorkerCount(2);
setMaxParallelImageRequests(4);
export interface RouteMapHandle {
  capture: () => Promise<string>;
  center: () => { longitude: number; latitude: number };
}
export function RouteMap({
  stops,
  legs,
  onReady,
  onPick,
  pickedPoint,
  photos = [],
}: {
  stops: RouteStop[];
  legs: PlannedLeg[];
  onReady: (handle: RouteMapHandle | null) => void;
  onPick?: (point: { longitude: number; latitude: number }) => void;
  pickedPoint?: { longitude: number; latitude: number } | null;
  photos?: RoutePhoto[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const fitted = useRef<{ stops: RouteStop[]; legs: PlannedLeg[] } | null>(null);
  const [ready, setReady] = useState(false);
  const [styleGeneration, setStyleGeneration] = useState(0);
  const [error, setError] = useState('');
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  // Event subscriptions stay stable while the chosen stop changes.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const photosRef = useRef(photos); photosRef.current = photos;
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
    let raster = false, tileErrors = 0;
    const fallback = () => {
      if (raster) return;
      raster = true;
      setReady(false);
      // A public raster fallback, without prefetching or offline bulk downloads.
      map.setStyle({ version: 8, sources: { osm: { type: 'raster', tileSize: 256,
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], maxzoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      } }, layers: [{ id: 'osm-basemap', type: 'raster', source: 'osm' }] });
    };
    map.on('style.load', () => { setReady(true); setStyleGeneration(value => value + 1); });
    map.on('error', () => {
      if (++tileErrors >= 3 && !raster) fallback();
      else if (raster) setError(t('The map is taking too long to load. Check your connection.'));
    });
    map.on('click', event => {
      const longitude = ((event.lngLat.lng + 180) % 360 + 360) % 360 - 180;
      if (Math.abs(event.lngLat.lat) <= 85)
        onPickRef.current?.({ longitude, latitude: event.lngLat.lat });
    });
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right');
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    const fail = window.setTimeout(() => {
      if (!map.loaded()) {
        fallback();
        setError(t('The map is taking too long to load. Check your connection.'));
      }
    }, 20000);
    map.once('load', () => {
      clearTimeout(fail);
      setError('');
      setReady(true);
      onReadyRef.current({
        center: () => {
          const point = map.getCenter();
          return { longitude: ((point.lng + 180) % 360 + 360) % 360 - 180, latitude: point.lat };
        },
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
            const photos = photosRef.current.slice(0, 12);
            // Collage stays below 4 million pixels: the server's bounded image budget.
            const width = photos.length ? 2200 : 2400, height = photos.length ? 1800 : 1500;
            const photoRows=Math.ceil(photos.length/4);
            const mapHeight = photos.length ? height-(photoRows===1?425:photoRows*320) : 1500;
            map.setPixelRatio(width / Math.max(1, map.getContainer().clientWidth));
            map.triggerRepaint();
            await new Promise<void>((resolve, reject) => {
              const done = () => { clearTimeout(timer); map.off('remove', removed); resolve(); };
              const removed = () => { clearTimeout(timer); map.off('render', done); reject(new Error(t('The map could not be loaded. Check WebGL support in your browser.'))); };
              const timer = setTimeout(() => { map.off('render', done); map.off('remove', removed); reject(new Error(t('Wait until the map has finished loading.'))); }, 15000);
              map.once('render', done); map.once('remove', removed);
            });
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) throw new Error(t('Could not prepare the image.'));
            context.fillStyle = '#fff';
            context.fillRect(0, 0, width, height);
            context.drawImage(map.getCanvas(), 0, 0, width, mapHeight);
            const project = (stop: RouteStop) => {
              const longitude = stop.longitude + Math.round((map.getCenter().lng - stop.longitude) / 360) * 360;
              const point = map.project([longitude, stop.latitude]);
              return { x: point.x / map.getContainer().clientWidth * width, y: point.y / map.getContainer().clientHeight * mapHeight };
            };
            if (photos.length) await drawMapCollage(context, photos, stopsRef.current, project, width, mapHeight);
            // DOM markers are not part of the WebGL canvas, so explicitly print numbered stops.
            stopsRef.current.forEach((stop, index) => {
              const { x, y } = project(stop);
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
            context.fillRect(0, height - 56, width, 56);
            context.fillStyle = '#273c35';
            context.font = '22px sans-serif';
            context.textAlign = 'right';
            context.textBaseline = 'middle';
            context.fillText(
              raster ? '© OpenStreetMap contributors · openstreetmap.org/copyright' : '© OpenStreetMap contributors · openstreetmap.org/copyright · OpenFreeMap / OpenMapTiles',
              width - 30,
              height - 28,
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
    if (!map || !ready || !pickedPoint) return;
    const marker = new Marker({ color: '#af5347' })
      .setLngLat([pickedPoint.longitude, pickedPoint.latitude]).addTo(map);
    return () => { marker.remove(); };
  }, [pickedPoint, ready]);
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
    if (stops.length && (fitted.current?.stops !== stops || fitted.current?.legs !== legs)) {
      fitted.current = { stops, legs };
      const coordinates: [number, number][] = [
        ...stops.map((stop): [number, number] => [stop.longitude, stop.latitude]),
        ...legs.flatMap((leg) => leg.coordinates),
      ];
      map.fitBounds(routeMapBounds(coordinates), { padding: 55, maxZoom: 14, duration: 0 });
    }
    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [stops, legs, ready, styleGeneration]);
  return (
    <div>
      <div ref={container} className="route-map" data-picking={Boolean(onPick)} aria-label={t('Route map')} />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
