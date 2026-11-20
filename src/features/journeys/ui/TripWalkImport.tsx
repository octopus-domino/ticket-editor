import { useEffect, useRef, useState } from 'react';
import { t } from '@/shared/i18n';
import { decodePrivateWalkLink, readPrivateWalk } from '../domain/privateWalk';
import './private-walk-picker.css';

export type WalkCandidate = ReturnType<typeof readPrivateWalk>;

export function TripWalkImport({ onPreview }: { onPreview: (walk: WalkCandidate) => void }) {
  const [channel, setChannel] = useState('');
  const [error, setError] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const callback = useRef(onPreview);
  callback.current = onPreview;

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

  const url = '/private-journey/?' + new URLSearchParams({ embed: 'codoc', channel });
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
    <button type="button" onClick={() => { setError(false); setChannel(crypto.randomUUID()); }}>
      {t('Plan walk in Journey')} ↗
    </button>
    {sharedLink && <button type="button" onClick={() => previewLink(sharedLink)}>{t('Preview shared walk')}</button>}
    {channel && <dialog ref={dialog} className="private-walk-overlay" aria-label={t('Private itineraries')}
      onCancel={(event) => { event.preventDefault(); setChannel(''); }}>
      <header>
        <strong>{t('Private itineraries')}</strong>
        <button type="button" onClick={() => setChannel('')} aria-label={t('Close')}>×</button>
      </header>
      <iframe ref={frame} src={url} title={t('Private itineraries')} allow="geolocation; clipboard-write" />
      {error && <p role="alert">{t('Could not build the walking route.')}</p>}
    </dialog>}
    {!channel && error && <p role="alert">{t('Could not build the walking route.')}</p>}
  </>;
}
