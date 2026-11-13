import { forwardRef, lazy, Suspense, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { API_BASE } from '@/shared/api/client';
import type { RouteSnapshot, PlannedLeg, RoutePhoto } from '../domain/route';
import { buildRouteTimeline, type RouteStop, type TimelineRow } from '../domain/routeTimeline';
import { routePointMarker } from '../domain/route';
import { routePointCaption } from './routePointCaption';
import { journeyRequest } from '../api/journeys';
import type { RouteMapHandle } from './RouteMap';
const RouteMap = lazy(() => import('./RouteMap').then(module => ({ default: module.RouteMap })));
export interface RouteWalkHandle { save(stops: RouteStop[], legs: PlannedLeg[], startLocal: string, signal?: AbortSignal, photos?: RoutePhoto[], timeline?: TimelineRow[]): Promise<void> }

/** Each city walk has its own immutable snapshot, numbered map and printable PDF pages. */
export const RouteWalk = forwardRef<RouteWalkHandle, { value?: string; onChange: (id?: string) => void }>(function RouteWalk({ value, onChange }, ref) {
  const [snapshot, setSnapshot] = useState<RouteSnapshot | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const map = useRef<RouteMapHandle | null>(null), loaded = useRef('');
  const callbacks = useRef({ onChange }); callbacks.current = { onChange };
  useEffect(() => {
    if (!value) { setSnapshot(null); loaded.current = ''; return; }
    if (loaded.current === value) return;
    const abort = new AbortController();
    void journeyRequest<RouteSnapshot>(`/api/journeys/routes/${encodeURIComponent(value)}`, { signal: abort.signal })
      .then(result => { if (!abort.signal.aborted) { setSnapshot(result); loaded.current = value; } })
      .catch(reason => { if (!abort.signal.aborted) setError((reason as Error).message); });
    return () => abort.abort();
  }, [value]);
  useImperativeHandle(ref, () => ({ save: async (inputStops, legs, startLocal, signal, photos, plannedTimeline) => {
    const previous = snapshot;
    const stops = inputStops.map(stop => ({ ...stop, walkId: undefined, confirmed: undefined }));
    const timeline = plannedTimeline ?? buildRouteTimeline(stops, legs, startLocal);
    if (new Date(timeline.at(-1)!.end).getTime() - new Date(timeline[0].start).getTime() > 12 * 3600000)
      throw new Error(t('This walk is too long for one day. Choose fewer or closer places.'));
    const draft: RouteSnapshot = { stops, legs, startLocal, timeline, mapId: '', pointNumbering: 'interior', ...(photos?.length ? { photos } : {}) };
    setSnapshot(draft); setError('');
    try {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const deadline = Date.now() + 20000;
    while (!map.current && Date.now() < deadline && !signal?.aborted) await new Promise<void>(resolve => setTimeout(resolve, 100));
    signal?.throwIfAborted();
    if (!map.current) throw new Error(t('Wait until the map has finished loading.'));
    const image = await map.current.capture();
    const asset = await journeyRequest<{ id: string }>('/api/journeys/media', { method: 'POST', body: JSON.stringify({ image }), signal });
    const saved = { ...draft, mapId: asset.id };
    const result = await journeyRequest<{ id: string }>('/api/journeys/routes', { method: 'POST', body: JSON.stringify(saved), signal });
    signal?.throwIfAborted();
    loaded.current = result.id; setSnapshot(saved); callbacks.current.onChange(result.id);
    } catch (reason) { setSnapshot(previous); throw reason; }
  } }));
  const download = async () => {
    if (!snapshot?.mapId || downloading) return;
    setDownloading(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/journeys/media/${encodeURIComponent(snapshot.mapId)}`);
      if (!response.ok) throw new Error(t('Could not prepare the image.'));
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a'); anchor.href = url;
      anchor.download = 'city-walk-map.jpg'; document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError((reason as Error).message); }
    finally { setDownloading(false); }
  };
  const time = (instant: string, zone: string) => new Intl.DateTimeFormat(getLocale(), { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(new Date(instant));
  return <section className="route-walk">
    {snapshot && <>
      <h4>{t('City walk')} · {snapshot.startLocal.slice(0, 10)}</h4>
      <p>{t('This walk has a separate map and its own pages in the trip PDF.')}</p>
      {snapshot.mapId ? <img className="route-walk-print" src={`${API_BASE}/api/journeys/media/${encodeURIComponent(snapshot.mapId)}`} alt={t('City walk')} /> :
        <Suspense fallback={<p>{t('Loading map…')}</p>}><RouteMap stops={snapshot.stops} legs={snapshot.legs} photos={snapshot.photos} onReady={handle => { map.current = handle; }} /></Suspense>}
      {!!snapshot.photos?.length && <details><summary>{t('Photo credits')}</summary><ol className="route-photo-credits">{snapshot.photos.map(photo => <li key={photo.stopId}>
        {snapshot.pointNumbering === 'interior' ? routePointMarker(snapshot.stops.findIndex(stop => stop.id === photo.stopId), snapshot.stops.length) : snapshot.stops.findIndex(stop => stop.id === photo.stopId) + 1}. <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.author}</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a>
      </li>)}</ol></details>}
      <ol className="route-timeline">{snapshot.timeline.filter(row => row.kind === 'stop').map((row, index) => <li key={index}>
        <strong>{routePointCaption(index, snapshot.stops.length)} · {row.label}</strong><time>{time(row.start, row.zone)}–{time(row.end, row.zone)}</time>{row.description && <small>{row.description}</small>}
      </li>)}</ol>
      <div className="route-actions">
        <button type="button" className="journey-secondary" disabled={downloading || !snapshot.mapId} onClick={() => void download()}>{t('Download walking map (JPG)')}</button>
        <button type="button" className="journey-secondary" onClick={() => { setSnapshot(null); loaded.current = ''; callbacks.current.onChange(undefined); }}>{t('Remove walk')}</button>
      </div>
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
});
