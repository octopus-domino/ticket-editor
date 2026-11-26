import { useEffect, useRef, useState } from 'react';
import type { CityPoint } from '../api/tripDraft';
import { t } from '@/shared/i18n';
import { decodePrivateWalkLink, isWalkMessage, readPrivateWalk } from '../domain/privateWalk';
import { placePhotos } from '../api/placePhotos';
import type { RoutePhoto } from '../domain/route';
import './private-walk-picker.css';

export type WalkCandidate = ReturnType<typeof readPrivateWalk> & { photos?: RoutePhoto[] };

export function TripWalkImport({ onPreview, onComplete = onPreview, point, address, primary }: {
  onPreview: (walk: WalkCandidate) => void;
  onComplete?: (walk: WalkCandidate) => void;
  point?: CityPoint;
  address?: string;
  primary?: boolean;
}) {
  const [channel, setChannel] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const callback = useRef(onComplete);
  const pending = useRef<AbortController>();
  callback.current = onComplete;

  useEffect(() => () => pending.current?.abort(), []);

  useEffect(() => {
    if (!channel) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    async function receive(event: MessageEvent) {
      if (pending.current || !isWalkMessage(event, location.origin, frame.current?.contentWindow, channel)) return;
      const request = new AbortController();
      pending.current = request;
      setLoading(true);
      try {
        const candidate = readPrivateWalk(event.data.walk, 'UTC');
        const photos = candidate.candidates.length ? await placePhotos(candidate.candidates, request.signal) : [];
        if (request.signal.aborted) return;
        callback.current({ ...candidate, photos });
        setChannel('');
      } catch {
        if (!request.signal.aborted) setError(true);
      } finally {
        pending.current = undefined;
        setLoading(false);
      }
    }
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
      pending.current?.abort();
      previousFocus?.focus();
    };
  }, [channel]);

  const params = new URLSearchParams({ embed: 'codoc', channel });
  if (point) {
    params.set('points', `${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`);
    if (address?.trim()) params.set('anchorLabel', address.trim().slice(0, 240));
  }
  const url = '/private-journey/?' + params;
  const sharedLink = new URLSearchParams(location.search).get('walk');
  async function previewLink(encoded: string) {
    if (pending.current) return;
    const request = new AbortController();
    pending.current = request;
    setLoading(true);
    setError(false);
    try {
      const candidate = readPrivateWalk(decodePrivateWalkLink(encoded), 'UTC');
      const photos = candidate.candidates.length ? await placePhotos(candidate.candidates, request.signal) : [];
      if (!request.signal.aborted) onPreview({ ...candidate, photos });
    } catch {
      if (!request.signal.aborted) setError(true);
    } finally {
      pending.current = undefined;
      setLoading(false);
    }
  }
  return <>
    <button className={primary ? 'journey-primary trip-exp-walk-action' : undefined}
      type="button" disabled={loading} onClick={() => { setError(false); setChannel(crypto.randomUUID()); }}>
      {t('Plan walk in Journey')} ↗
    </button>
    {sharedLink && <button type="button" disabled={loading} onClick={() => void previewLink(sharedLink)}>{t('Preview shared walk')}</button>}
    {!channel && loading && <p role="status">{t('Loading…')}</p>}
    {channel && <dialog ref={dialog} className="private-walk-overlay" aria-label={t('Private itineraries')}
      onCancel={(event) => { event.preventDefault(); setChannel(''); }}>
      <header>
        <strong>{address?.trim() || t('Private itineraries')}</strong>
        <button type="button" onClick={() => setChannel('')} aria-label={t('Close')}>×</button>
      </header>
      <iframe ref={frame} src={url} title={t('Private itineraries')} allow="geolocation; clipboard-write" />
      {loading && <p role="status">{t('Loading…')}</p>}
      {error && <p role="alert">{t('Could not import the walking route.')}</p>}
    </dialog>}
    {!channel && error && <p role="alert">{t('Could not import the walking route.')}</p>}
  </>;
}
