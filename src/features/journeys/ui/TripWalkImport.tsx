import { useEffect, useRef, useState } from 'react';
import type { CityPoint } from '../api/tripDraft';
import { t } from '@/shared/i18n';
import { decodePrivateWalkLink, readPrivateWalk } from '../domain/privateWalk';
import './private-walk-picker.css';

export type WalkCandidate = ReturnType<typeof readPrivateWalk>;

export function TripWalkImport({ onPreview, onComplete = onPreview, point, address, primary }: {
  onPreview: (walk: WalkCandidate) => void;
  onComplete?: (walk: WalkCandidate) => void;
  point?: CityPoint;
  address?: string;
  primary?: boolean;
}) {
  const [channel, setChannel] = useState('');
  const [error, setError] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const callback = useRef(onComplete);
  callback.current = onComplete;

  useEffect(() => {
    if (!channel) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    function receive(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow ||
          event.data?.type !== 'private-walk:complete' || event.data.channel !== channel) return;
      try {
        const candidate = readPrivateWalk(event.data.walk, 'UTC');
        callback.current(candidate);
        setChannel('');
      } catch {
        setError(true);
      }
    }
    window.addEventListener('message', receive);
    return () => {
      window.removeEventListener('message', receive);
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
  function previewLink(encoded: string) {
    setError(false);
    try {
      onPreview(readPrivateWalk(decodePrivateWalkLink(encoded), 'UTC'));
    } catch {
      setError(true);
    }
  }
  return <>
    <button className={primary ? 'journey-primary trip-exp-walk-action' : undefined}
      type="button" onClick={() => { setError(false); setChannel(crypto.randomUUID()); }}>
      {t('Plan walk in Journey')} ↗
    </button>
    {sharedLink && <button type="button" onClick={() => previewLink(sharedLink)}>{t('Preview shared walk')}</button>}
    {channel && <dialog ref={dialog} className="private-walk-overlay" aria-label={t('Private itineraries')}
      onCancel={(event) => { event.preventDefault(); setChannel(''); }}>
      <header>
        <strong>{address?.trim() || t('Private itineraries')}</strong>
        <button type="button" onClick={() => setChannel('')} aria-label={t('Close')}>×</button>
      </header>
      <iframe ref={frame} src={url} title={t('Private itineraries')} allow="geolocation; clipboard-write" />
      {error && <p role="alert">{t('Could not import the walking route.')}</p>}
    </dialog>}
    {!channel && error && <p role="alert">{t('Could not import the walking route.')}</p>}
  </>;
}
