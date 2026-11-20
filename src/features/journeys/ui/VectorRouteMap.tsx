import { useEffect, useRef, useState } from 'react';
import {
  Map,
  Marker,
  type GeoJSONSource,
  NavigationControl,
  setWorkerUrl,
  setWorkerCount,
  setMaxParallelImageRequests,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { t } from '@/shared/i18n';
import type { RouteStop } from '../domain/routeTimeline';
import type { RouteMapLeg, RouteMapProps } from './routeMapTypes';
import { drawMapCollage } from './drawMapCollage';
import { mapRouteLines, routeMapBounds, routePointMarker } from '../domain/route';
import { routePointCaption } from './routePointCaption';

setWorkerUrl(workerUrl);
setWorkerCount(2);
setMaxParallelImageRequests(4);
function osmRasterStyle() {
  return { version: 8 as const, sources: { osm: { type: 'raster' as const, tileSize: 256,
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], maxzoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  } }, layers: [{ id: 'osm-basemap', type: 'raster' as const, source: 'osm' }] };
}

export default function VectorRouteMap({
  stops,
  legs,
  onReady,
  onPick,
  onUserMove,
  pickedPoint,
  focusStopId,
  cityMap = false,
  rasterBasemap = false,
  fit = true,
  onStopMove,
  onStopSelect,
  onLegSelect,
  photos = [],
}: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const initialFitDone = useRef(false);
  const pinBoundsKey = useRef<string>();
  const fitted = useRef<{ stops: RouteStop[]; legs: RouteMapLeg[] } | null>(null);
  const [ready, setReady] = useState(false);
  const [styleGeneration, setStyleGeneration] = useState(0);
  const [error, setError] = useState('');
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  // Event subscriptions stay stable while the chosen stop changes.
  const onUserMoveRef = useRef(onUserMove);
  onUserMoveRef.current = onUserMove;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onStopMoveRef = useRef(onStopMove);
  onStopMoveRef.current = onStopMove;
  const onStopSelectRef = useRef(onStopSelect);
  onStopSelectRef.current = onStopSelect;
  const canSelectStops = Boolean(onStopSelect);
  const onLegSelectRef = useRef(onLegSelect);
  onLegSelectRef.current = onLegSelect;
  const canMoveStops = Boolean(onStopMove);
  const photosRef = useRef(photos); photosRef.current = photos;
  const legsRef = useRef(legs); legsRef.current = legs;
  useEffect(() => {
    if (!container.current) return;
    let map: Map;
    try {
      map = new Map({
        container: container.current,
        style: rasterBasemap ? osmRasterStyle() : 'https://tiles.openfreemap.org/styles/liberty',
        center: rasterBasemap && stopsRef.current[0]
          ? [stopsRef.current[0].longitude, stopsRef.current[0].latitude] : [37.62, 55.75],
        zoom: rasterBasemap ? 15 : 9,
        canvasContextAttributes: { preserveDrawingBuffer: !rasterBasemap },
        maxTileCacheSize: 128,
        pixelRatio: rasterBasemap ? 1 : Math.min(window.devicePixelRatio || 1, 2),
        dragRotate: !rasterBasemap,
        pitchWithRotate: !rasterBasemap,
        touchPitch: !rasterBasemap,
        ...(rasterBasemap ? { maxPitch: 0 } : {}),
        attributionControl: { compact: true },
      });
    } catch {
      setError(t('The map could not be loaded. Check WebGL support in your browser.'));
      return;
    }
    mapRef.current = map;
    let raster = rasterBasemap, tileErrors = 0;
    const fallback = () => {
      if (raster) return;
      raster = true;
      setReady(false);
      // A public raster fallback, without prefetching or offline bulk downloads.
      map.setStyle(osmRasterStyle());
    };
    map.on('style.load', () => { setReady(true); setStyleGeneration(value => value + 1); });
    map.on('error', () => {
      if (++tileErrors >= 3 && !raster) fallback();
      else if (raster) setError(t('The map is taking too long to load. Check your connection.'));
    });
    map.on('moveend', event => { if (event.originalEvent) onUserMoveRef.current?.(); });
    map.on('click', event => {
      if (onLegSelectRef.current) {
        const layers = ['route-road', 'route-flight'].filter(id => map.getLayer(id));
        const { x, y } = event.point;
        const found = layers.length ? map.queryRenderedFeatures([[x - 8, y - 8], [x + 8, y + 8]], { layers }) : [];
        const id = found.find(feature => typeof feature.properties?.legId === 'string')?.properties?.legId;
        if (typeof id === 'string') { onLegSelectRef.current(id); return; }
      }
      const longitude = ((event.lngLat.lng + 180) % 360 + 360) % 360 - 180;
      if (Math.abs(event.lngLat.lat) <= 85)
        onPickRef.current?.({ longitude, latitude: event.lngLat.lat });
    });
    if (rasterBasemap) map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ visualizePitch: false, showCompass: !rasterBasemap }), 'top-right');
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
          // Match the print aspect ratio and fit walks independently of the phone's viewport.
          const previous = map.getPixelRatio();
          const element=map.getContainer(),previousStyle=element.style.cssText;
          const previousCamera={center:map.getCenter(),zoom:map.getZoom(),bearing:map.getBearing(),pitch:map.getPitch()};
          const previousPadding=map.getPadding();
          try {
            const photos = photosRef.current.slice(0, 12);
            // Collage stays below 4 million pixels: the server's bounded image budget.
            const width = photos.length ? 2200 : 2400, height = photos.length ? 1800 : 1500;
            const photoRows=Math.ceil(photos.length/4);
            const mapHeight = photos.length ? height-(photoRows===1?425:photoRows*320) : 1500;
            element.style.height=`${element.clientWidth*mapHeight/width}px`;
            element.style.aspectRatio='auto';map.resize();
            if(legsRef.current.length>0&&legsRef.current.every(leg=>leg.mode==='foot')){
              const coordinates:[number,number][]=[...stopsRef.current.map(point=>[point.longitude,point.latitude] as [number,number]),...legsRef.current.flatMap(leg=>leg.coordinates)];
              const inset=Math.max(12,element.clientWidth*.035);
              if(coordinates.length)map.fitBounds(routeMapBounds(coordinates),{padding:{top:inset,right:inset,left:inset,bottom:inset+(photos.length?0:84*element.clientWidth/width)},maxZoom:19,duration:0});
            }
            map.setPixelRatio(width / Math.max(1, map.getContainer().clientWidth));
            map.triggerRepaint();
            await new Promise<void>((resolve, reject) => {
              const done = () => { clearTimeout(timer); map.off('remove', removed); resolve(); };
              const removed = () => { clearTimeout(timer); map.off('idle', done); reject(new Error(t('The map could not be loaded. Check WebGL support in your browser.'))); };
              const timer = setTimeout(() => { map.off('idle', done); map.off('remove', removed); reject(new Error(t('Wait until the map has finished loading.'))); }, 15000);
              map.once('idle', done); map.once('remove', removed);
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
              context.fillText(routePointMarker(index, stopsRef.current.length), x, y);
            });
            context.fillStyle = '#ffffffee';
            context.fillRect(0, height - 84, width, 84);
            context.fillStyle = '#273c35';
            context.font = '22px sans-serif';
            context.textAlign = 'left';
            context.fillText(`A · ${t('Route start')}     B · ${t('Route end')}`,30,height-60);
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
            element.style.cssText=previousStyle;map.resize();map.setPadding(previousPadding);map.jumpTo(previousCamera);
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
  }, [rasterBasemap]);
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
    const source = map.getSource<GeoJSONSource>('journey-route');
    if (!source && !legs.length) return;
    const data = {
      type: 'FeatureCollection' as const,
      features: legs
        .filter(leg => leg.coordinates.length >= 2)
        .map(leg => ({
          type: 'Feature' as const,
          properties: { mode: leg.mode, ...(leg.id ? { legId: leg.id } : {}) },
          geometry: { type: 'MultiLineString' as const, coordinates: mapRouteLines(leg.coordinates) },
        })),
    };
    if (source) {
      source.setData(data);
    } else {
      map.addSource('journey-route', { type: 'geojson', data });
      map.addLayer({
        id: 'route-road',
        type: 'line',
        source: 'journey-route',
        filter: ['!', ['in', ['get', 'mode'], ['literal', ['flight', 'transfer']]]],
        paint: { 'line-color': '#225fcb', 'line-width': 5, 'line-opacity': 0.9 },
      });
      map.addLayer({
        id: 'route-flight',
        type: 'line',
        source: 'journey-route',
        filter: ['in', ['get', 'mode'], ['literal', ['flight', 'transfer']]],
        paint: { 'line-color': '#af5347', 'line-width': 4, 'line-dasharray': [2, 2] },
      });
    }
  }, [legs, ready, styleGeneration]);

  // Labels, order and coordinates are the only fields used to draw the pins.
  const markerKey = JSON.stringify(stops.map(({ id, label, latitude, longitude }) => ({ id, label, latitude, longitude })));
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const markerStops = JSON.parse(markerKey) as Pick<RouteStop, 'id' | 'label' | 'latitude' | 'longitude'>[];
    const markers = markerStops.map((stop, index) => {
      const element = document.createElement(canSelectStops ? 'button' : 'span');
      if (element instanceof HTMLButtonElement) {
        element.type = 'button';
        element.setAttribute('aria-label', stop.label);
        element.onclick = event => {
          event.stopPropagation();
          onStopSelectRef.current?.(stop.id);
        };
      }
      element.className = 'route-map-marker';
      element.textContent = routePointMarker(index, markerStops.length);
      element.title = cityMap ? stop.label : `${routePointCaption(index, markerStops.length)} · ${stop.label}`;
      const marker = new Marker({ element, anchor: 'center', draggable: canMoveStops })
        .setLngLat([stop.longitude, stop.latitude])
        .addTo(map);
      if (canMoveStops) marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat();
        if (Math.abs(lat) <= 85) {
          const longitude = ((lng + 180) % 360 + 360) % 360 - 180;
          onStopMoveRef.current?.(stop.id, { longitude, latitude: lat });
        } else marker.setLngLat([stop.longitude, stop.latitude]);
      });
      return marker;
    });
    return () => { markers.forEach(marker => marker.remove()); };
  }, [markerKey, ready, styleGeneration, cityMap, canMoveStops, canSelectStops]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || fit === false || (fit === 'initial' && initialFitDone.current)) return;
    const pins: [number, number][] = stops.map(stop => [stop.longitude, stop.latitude]);
    const usePins = rasterBasemap && pins.length > 0;
    const key = usePins ? JSON.stringify(pins) : undefined;
    if (usePins ? pinBoundsKey.current === key : fitted.current?.stops === stops && fitted.current?.legs === legs) return;
    const coordinates = usePins ? pins : [...pins, ...legs.flatMap(leg => leg.coordinates)];
    if (!coordinates.length) return;
    initialFitDone.current = true;
    pinBoundsKey.current = key;
    fitted.current = { stops, legs };
    const walking = legs.length > 0 && legs.every(leg => leg.mode === 'foot');
    map.fitBounds(routeMapBounds(coordinates), {
      padding: walking ? 24 : 55, maxZoom: usePins ? 15 : walking ? 18 : 14, duration: 0,
    });
  }, [fit, legs, ready, rasterBasemap, stops]);

  useEffect(() => {
    const map = mapRef.current;
    const stop = stopsRef.current.find(item => item.id === focusStopId);
    if (ready && map && stop) map.easeTo({
      center: [stop.longitude, stop.latitude], zoom: Math.max(9, map.getZoom()),
    });
  }, [focusStopId, ready]);
  return (
    <div>
      <div ref={container} className="route-map" data-picking={Boolean(onPick)}
        aria-label={cityMap ? t('Trip map') : t('Route map')} />
      {!cityMap && <small>A · {t('Route start')} — B · {t('Route end')}</small>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
