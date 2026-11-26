import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/shared/i18n';
import type { RouteStop } from '../domain/routeTimeline';
import { decodePrivateWalkLink, importPrivateWalk, isWalkMessage } from '../domain/privateWalk';
import { placePhotos } from '../api/placePhotos';
import { cityVisitPlan } from '../domain/cityVisitPlan';
import { RouteWalk, type RouteWalkHandle } from './RouteWalk';
import type { RouteAddress } from './RouteAddressInput';
import { RouteHotels } from './RouteHotels';
import './private-walk-picker.css';

/** CoDoc owns the trip; the embedded private application owns all walk construction. */
export function RoutePlacePanel({ stop, onNotes, onAdd, onWalkChange, onWalkBusy, visitDate }: {
  stop: RouteStop; onNotes: (notes: string) => void; onAdd: (address: RouteAddress) => void;
  onWalkChange: (id?: string, minutes?: number) => void; onWalkBusy: (busy: boolean) => void; visitDate: string;
}) {
  const [channel, setChannel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{ value: unknown; walk: ReturnType<typeof importPrivateWalk> }>();
  const [planDate, setPlanDate] = useState(visitDate);
  const frame = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const walk = useRef<RouteWalkHandle>(null);
  const active = useRef(false);
  const abort = useRef<AbortController>();
  const callbacks = useRef({ onWalkBusy, onWalkChange });
  callbacks.current = { onWalkBusy, onWalkChange };
  const startLocal = `${visitDate || new Date().toISOString().slice(0, 10)}T09:00`;
  const sharedLink = new URLSearchParams(location.search).get('walk');

  useEffect(() => () => {
    abort.current?.abort();
    callbacks.current.onWalkBusy(false);
  }, []);

  const saveTransfer = useCallback(async (value: unknown) => {
      if (active.current) return;
      active.current = true;
      setBusy(true); setError(''); callbacks.current.onWalkBusy(true);
      abort.current = new AbortController();
      try {
        const imported = importPrivateWalk(value, stop, startLocal);
        if (!walk.current) throw new Error(t('Wait until the map has finished loading.'));
        const photos = await placePhotos(imported.candidates, abort.current.signal);
        await walk.current.save(imported.stops, imported.legs, imported.startLocal, abort.current.signal, photos, imported.timeline);
        const url = new URL(location.href);
        url.searchParams.delete('walk');
        history.replaceState(null, '', url);
        setChannel('');
        setPending(undefined);
      } catch (reason) {
        if (!abort.current.signal.aborted) setError(reason instanceof Error ? reason.message : t('Could not prepare the image.'));
      } finally {
        active.current = false; setBusy(false); callbacks.current.onWalkBusy(false);
      }
  }, [stop, startLocal]);

  useEffect(() => {
    if (!channel) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const listener = (event: MessageEvent) => {
      if (!isWalkMessage(event, location.origin, frame.current?.contentWindow, channel)) return;
      try {
        const imported = importPrivateWalk(event.data.walk, stop, startLocal);
        setPending({ value: event.data.walk, walk: imported });
        setPlanDate(startLocal.slice(0, 10));
        setChannel('');
      } catch {
        setError(t('Could not import the walking route.'));
      }
    };
    window.addEventListener('message', listener);
    return () => { window.removeEventListener('message', listener); previousFocus?.focus(); };
  }, [channel, stop, startLocal]);

  const url = new URL('/private-journey/', location.origin);
  url.search = new URLSearchParams({ embed: 'codoc', channel, points: `${stop.latitude},${stop.longitude}` }).toString();
  const schedule = pending?.walk.places.some(place => place.schedule) && /^\d{4}-\d{2}-\d{2}$/.test(planDate)
    && Number.isFinite(Date.parse(planDate))
    ? cityVisitPlan(pending.walk.places, planDate,
      pending.walk.places.map((_, index) => pending.walk.legs[index - 1]?.durationSeconds ?? 0)).visits : [];
  return <details className="route-place-panel">
    <summary>{t('Private itineraries')}</summary>
    <p>{t('This walk has a separate map and its own pages in the trip PDF.')}</p>
    <button type="button" className="journey-secondary" disabled={busy} onClick={() => { setError(''); setChannel(crypto.randomUUID()); }}>
      {t('Private itineraries')} ↗
    </button>
    <RouteWalk ref={walk} value={stop.walkId} onChange={onWalkChange} />
    {pending && <div>
      <strong>{pending.walk.stops[0].meta?.walk_title ?? stop.label}</strong>
      <ol>{pending.walk.stops.map(point => <li key={point.id}>{point.label}</li>)}</ol>
      {pending.walk.places.some(place => place.schedule) && <details>
        <summary>{t('Plan this day')}</summary>
        <label>{t('Visit date')} <input type="date" value={planDate} onChange={event => setPlanDate(event.target.value)} /></label>
        <ol>{schedule.map(({ place, start, end }) => <li key={place.id}>{start.slice(11, 16)}–{end.slice(11, 16)} · {place.label}</li>)}</ol>
        <button type="button" disabled={!schedule.length || busy} onClick={() => onNotes(
          [stop.description, planDate, ...schedule.map(({ place, start, end }) => `${start.slice(11, 16)}–${end.slice(11, 16)} ${place.label}`)]
            .filter(Boolean).join('\n').slice(0, 500),
        )}>{t('Add day plan to notes')}</button>
      </details>}
      <button type="button" disabled={busy} onClick={() => void saveTransfer(pending.value)}>{t('Use this walk')}</button>{' '}
      <button type="button" disabled={busy} onClick={() => setPending(undefined)}>{t('Cancel')}</button>
      {busy && <p role="status">{t('Calculating the route…')}</p>}
    </div>}
    {sharedLink && <button type="button" className="journey-secondary" disabled={busy} onClick={() => {
      try {
        void saveTransfer(decodePrivateWalkLink(sharedLink));
      } catch {
        setError(t('Could not prepare the image.'));
      }
    }}>{t('Use this walk')}</button>}
    <RouteHotels stop={stop} onAdd={onAdd} />
    {channel && <dialog ref={dialog} className="private-walk-overlay" aria-label={t('Private itineraries')}
      onCancel={event => { event.preventDefault(); if (!active.current) setChannel(''); }}>
      <header><strong>{t('Private itineraries')}</strong><button type="button" disabled={busy} onClick={() => setChannel('')} aria-label={t('Close')}>×</button></header>
      <iframe ref={frame} src={url.href} title={t('Private itineraries')} allow="geolocation; clipboard-write" />
      {busy && <p role="status">{t('Calculating the route…')}</p>}
      {error && <p role="alert">{error}</p>}
    </dialog>}
    {!channel && error && <p role="alert">{error}</p>}
  </details>;
}
