import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { t } from '@/shared/i18n';
import { mapRouteLines, routePointMarker } from '../domain/route';
import type { RouteMapProps } from './routeMapTypes';

export function LeafletTripMap({
  stops, legs, fit = true, cityMap, onPick, onUserMove, onStopSelect, onStopMove, onLegSelect, pickedPoint, focusStopId,
}: RouteMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map>();
  const lineLayer = useRef<L.LayerGroup>();
  const pinLayer = useRef<L.LayerGroup>();
  const fitted = useRef<string>();
  const latest = useRef({ stops, onPick, onUserMove, onStopSelect, onStopMove, onLegSelect });
  latest.current = { stops, onPick, onUserMove, onStopSelect, onStopMove, onLegSelect };
  const moving = Boolean(onStopMove);
  const selectable = Boolean(onStopSelect);
  const markerKey = JSON.stringify(stops.map(({ id, label, latitude, longitude }) => ({ id, label, latitude, longitude })));

  useEffect(() => {
    if (!container.current) return;
    const element = container.current;
    const start = latest.current.stops[0];
    const instance = L.map(element, { preferCanvas: true, scrollWheelZoom: true, maxZoom: 19 })
      .setView(start ? [start.latitude, start.longitude] : [55.75, 37.62], start ? 15 : 6);
    instance.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, updateWhenIdle: true, keepBuffer: 2,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(instance);
    map.current = instance;
    pinLayer.current = L.layerGroup().addTo(instance);
    lineLayer.current = L.layerGroup().addTo(instance);
    instance.on('click', event => latest.current.onPick?.({ latitude: event.latlng.lat, longitude: event.latlng.wrap().lng }));
    const notifyMove = () => {
      const center = instance.getCenter().wrap();
      latest.current.onUserMove?.({ longitude: center.lng, latitude: center.lat });
    };
    instance.on('dragend', notifyMove);
    // Zoom can be initiated by fitting or by the user. Only input gestures refresh the hotel search.
    const wheel = notifyMove;
    element.addEventListener('wheel', wheel, { passive: true });
    const resize = new ResizeObserver(() => instance.invalidateSize({ pan: false, debounceMoveend: true }));
    resize.observe(element);
    return () => {
      element.removeEventListener('wheel', wheel);
      resize.disconnect();
      instance.remove();
      map.current = undefined;
      fitted.current = undefined;
    };
  }, []);

  useEffect(() => {
    const layer = pinLayer.current;
    if (!layer) return;
    layer.clearLayers();
    const pins = JSON.parse(markerKey) as { id: string; label: string; latitude: number; longitude: number }[];
    const hotelMode = pins.some(pin => pin.id === '__day_point__');
    pins.forEach(({ id, label, latitude, longitude }, index) => {
      const origin = id === '__day_point__';
      const clickable = selectable && !origin;
      const node = document.createElement(clickable ? 'button' : 'span');
      node.className = `route-map-marker${origin ? ' route-map-marker--origin' : hotelMode ? ' route-map-marker--hotel' : ''}`;
      node.textContent = origin ? '•' : hotelMode ? 'H' : routePointMarker(index, pins.length);
      if (node instanceof HTMLButtonElement) {
        node.type = 'button';
        node.setAttribute('aria-label', label);
        L.DomEvent.on(node, 'click', event => {
          L.DomEvent.stopPropagation(event);
          latest.current.onStopSelect?.(id);
        });
      }
      const marker = L.marker([latitude, longitude], {
        icon: L.divIcon({ className: 'trip-leaflet-marker', html: node, iconSize: [30, 30], iconAnchor: [15, 15] }),
        title: label, alt: label, draggable: moving, keyboard: false, autoPanOnFocus: false,
        interactive: !origin, zIndexOffset: origin ? -1000 : 0,
        bubblingMouseEvents: false,
      }).addTo(layer);
      if (moving) marker.on('dragend', () => {
        const point = marker.getLatLng().wrap();
        latest.current.onStopMove?.(id, { latitude: point.lat, longitude: point.lng });
      });
    });
  }, [markerKey, moving, selectable]);

  useEffect(() => {
    const layer = lineLayer.current;
    if (!layer) return;
    layer.clearLayers();
    legs.forEach(leg => {
      if (leg.coordinates.length < 2) return;
      const dashed = leg.mode === 'flight' || leg.mode === 'transfer';
      const line = L.polyline(mapRouteLines(leg.coordinates).map(part => part.map(([lng, lat]): L.LatLngTuple => [lat, lng])),
        { color: dashed ? '#af5347' : '#225fcb', weight: 4, dashArray: dashed ? '6 6' : undefined,
          bubblingMouseEvents: !leg.id, interactive: Boolean(leg.id) }).addTo(layer);
      if (leg.id) line.on('click', () => latest.current.onLegSelect?.(leg.id!));
    });
  }, [legs]);

  useEffect(() => {
    if (!map.current || !pickedPoint) return;
    const pin = L.circleMarker([pickedPoint.latitude, pickedPoint.longitude], {
      radius: 7, stroke: false, fillColor: '#af5347', fillOpacity: 1,
    }).addTo(map.current);
    return () => { pin.remove(); };
  }, [pickedPoint]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || fit === false || (fit === 'initial' && fitted.current)) return;
    const points: L.LatLngTuple[] = stops.length ? stops.map(stop => [stop.latitude, stop.longitude])
      : legs.flatMap(leg => leg.coordinates.map(([lng, lat]): L.LatLngTuple => [lat, lng]));
    if (!points.length) return;
    const key = JSON.stringify(points);
    if (key === fitted.current) return;
    fitted.current = key;
    instance.fitBounds(points, { padding: [38, 38], maxZoom: 15, animate: false });
  }, [fit, legs, stops]);

  useEffect(() => {
    const point = latest.current.stops.find(stop => stop.id === focusStopId);
    if (point) map.current?.panTo([point.latitude, point.longitude], { animate: false });
  }, [focusStopId]);

  return <div ref={container} className="route-map trip-leaflet-map" data-picking={Boolean(onPick)}
    aria-label={cityMap ? t('Trip map') : t('Route map')} />;
}
