import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/shared/i18n';
import type { RouteStop } from '../domain/routeTimeline';
import { importPrivateWalk } from '../domain/privateWalk';
import { RouteWalk, type RouteWalkHandle } from './RouteWalk';
import type { RouteAddress } from './RouteAddressInput';
import { RouteHotels } from './RouteHotels';
import './private-walk-picker.css';

/** CoDoc owns the trip; the embedded private application owns all walk construction. */
export function RoutePlacePanel({ stop, onAdd, onWalkChange, onWalkBusy, visitDate }: {
  stop: RouteStop; onNotes: (notes: string) => void; onAdd: (address: RouteAddress) => void;
  onWalkChange: (id?: string, minutes?: number) => void; onWalkBusy: (busy: boolean) => void; visitDate: string;
}) {
  const [channel, setChannel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
        await walk.current.save(imported.stops, imported.legs, imported.startLocal, abort.current.signal, undefined, imported.timeline);
        const url = new URL(location.href);
        url.searchParams.delete('walk');
        history.replaceState(null, '', url);
        setChannel('');
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
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow ||
          event.data?.type !== 'private-walk:complete' || event.data.channel !== channel) return;
      void saveTransfer(event.data.walk);
    };
    window.addEventListener('message', listener);
    return () => { window.removeEventListener('message', listener); previousFocus?.focus(); };
  }, [channel, saveTransfer]);

  const url = new URL('/private-journey/', location.origin);
  url.search = new URLSearchParams({ embed: 'codoc', channel, points: `${stop.latitude},${stop.longitude}` }).toString();
  return <details className="route-place-panel">
    <summary>{t('Private itineraries')}</summary>
    <p>{t('This walk has a separate map and its own pages in the trip PDF.')}</p>
    <button type="button" className="journey-secondary" disabled={busy} onClick={() => { setError(''); setChannel(crypto.randomUUID()); }}>
      {t('Private itineraries')} ↗
    </button>
    <RouteWalk ref={walk} value={stop.walkId} onChange={onWalkChange} />
    {sharedLink && <button type="button" className="journey-secondary" disabled={busy} onClick={() => {
      try {
        const encoded = sharedLink.replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
        void saveTransfer(JSON.parse(new TextDecoder().decode(bytes)));
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
