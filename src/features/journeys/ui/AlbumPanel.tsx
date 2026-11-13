import { useEffect, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { API_BASE } from '@/shared/api/client';
import { PointerReorderHandle } from '@/presentation/components/PointerReorderHandle';
import { journeyRequest, managementKey } from '../api/journeys';
import { prepareJourneyImage } from '../api/media';
import './album.css';

interface AlbumPhoto { id: string; caption: string; contributor: string }
interface AlbumState { revision: number; photos: AlbumPhoto[]; canManage: boolean }
const handwriting = (text: string) => /\p{Script=Han}/u.test(text) ? 'Zhi Mang Xing' : 'Marck Script';

/** Collaboration uses scoped invite/edit keys; the public album never receives them in its response. */
export function AlbumPanel({ id, manage }: { id: string; manage: boolean }) {
  const [album, setAlbum] = useState<AlbumState | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState(''), [contributionKey, setContributionKey] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('contribute') ?? '');
  const [name, setName] = useState(''), [caption, setCaption] = useState('');
  const [editing, setEditing] = useState<AlbumPhoto | null>(null), [editKeys, setEditKeys] = useState<Record<string,string>>({});
  const working = useRef(false), state = useRef(album); state.current = album;
  const path = `/api/journeys/${encodeURIComponent(id)}/album`;
  const key = manage ? managementKey(id) : '';
  const headers = { 'X-Management-Key': key };
  useEffect(() => {
    try { setEditKeys(JSON.parse(localStorage.getItem(`codoc:album:${id}:edits`) ?? '{}')); } catch { setEditKeys({}); }
    let active = true; const abort = new AbortController();
    const load = async () => {
      if (working.current || document.hidden || document.querySelector('[data-dragging]')) return;
      try {
        const result = await journeyRequest<AlbumState>(path, { headers: { 'X-Management-Key': key }, signal: abort.signal });
        if (active && !working.current && !document.querySelector('[data-dragging]')) setAlbum(result);
      } catch (reason) { if (active && !abort.signal.aborted) setError((reason as Error).message); }
    };
    void load(); const timer = setInterval(() => void load(), 15000);
    return () => { active = false; abort.abort(); clearInterval(timer); };
  }, [id, path, key]);
  const run = async (action: () => Promise<void>) => {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (reason) { setError((reason as Error).message); }
    finally { working.current = false; setBusy(false); }
  };
  const inviteGuests = (rotate = false) => run(async () => {
    const result = await journeyRequest<{key:string}>(`${path}/invitation?rotate=${rotate}`, { method: 'POST', headers });
    setContributionKey(result.key); setInvite(`${window.location.origin}/d/${encodeURIComponent(id)}#contribute=${encodeURIComponent(result.key)}`);
  });
  const move = (from: number, to: number) => {
    const current = state.current;
    if (!current || from === to || to < 0 || to >= current.photos.length) return;
    const ids = current.photos.map(photo => photo.id); const [moved] = ids.splice(from, 1); ids.splice(to, 0, moved);
    void run(async () => {
      try { setAlbum(await journeyRequest<AlbumState>(`${path}/order`, { method: 'PUT', headers, body: JSON.stringify({ revision: current.revision, ids }) })); }
      catch (reason) { setAlbum(await journeyRequest<AlbumState>(path, { headers })); throw reason; }
    });
  };
  return <section className="album-panel">
    <style>{`@font-face{font-family:'Marck Script';src:url(${JSON.stringify(`${API_BASE}/api/journeys/fonts/handwriting`)}) format('truetype');font-display:swap}@font-face{font-family:'Zhi Mang Xing';src:url(${JSON.stringify(`${API_BASE}/api/journeys/fonts/handwriting-zh`)}) format('truetype');font-display:swap}`}</style>
    <h2>{t('Our shared album')}</h2>
    <button type="button" disabled={busy} onClick={() => void run(async () => { setAlbum(await journeyRequest<AlbumState>(path, { headers })); })}>{t('Refresh album')}</button>
    {album?.canManage && <details><summary>{t('Invite contributors')}</summary>
      <button type="button" disabled={busy} onClick={() => void inviteGuests()}>{t('Get the contributor link')}</button>
      {invite && <label>{t('Link for adding photos')}<input readOnly value={invite} onFocus={event => event.target.select()} /></label>}
      <details><summary>{t('Link access')}</summary><p>{t('A new link disables the old contributor link. Existing photos stay in the album.')}</p>
        <button type="button" disabled={busy} onClick={() => void inviteGuests(true)}>{t('Replace the contributor link')}</button></details>
    </details>}
    {contributionKey && <fieldset disabled={busy}>
      <legend>{t('Add your memories')}</legend>
      <label>{t('Your name (optional)')}<input maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>{t('Photo caption')}<textarea maxLength={300} rows={3} style={{ fontFamily: handwriting(caption) }} value={caption} onChange={event => setCaption(event.target.value)} /></label>
      <label>{t('Add photos')}<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={event => {
        const files = Array.from(event.target.files ?? []); event.target.value = '';
        if (!files.length) return;
        void run(async () => {
          if (files.length + (state.current?.photos.length ?? 0) > 40) throw new Error(t('An album can contain up to 40 photos.'));
          for (const file of files) {
            const image = await prepareJourneyImage(file, false, 1200, 420000);
            const result = await journeyRequest<{ album: AlbumState; photoId: string; editKey: string }>(`${path}/photos`, {
              method: 'POST', headers: { 'X-Contribution-Key': contributionKey }, body: JSON.stringify({ image, caption, contributor: name }),
            });
            setAlbum({ ...result.album, canManage: state.current?.canManage ?? false });
            setEditKeys(current => { const keys = { ...current, [result.photoId]: result.editKey }; try { localStorage.setItem(`codoc:album:${id}:edits`, JSON.stringify(keys)); } catch { /* Organisers can still edit the shared album. */ } return keys; });
          }
          setCaption('');
        });
      }} /></label>
      <small>{t('Choose photos from your device, including files saved or exported from your social accounts.')}</small>
    </fieldset>}
    {album && !album.photos.length && <p>{t('The album is waiting for its first photo.')}</p>}
    <ol className="album-photos">{album?.photos.map((photo, index) => <li key={photo.id} data-album-photo={index} data-photo-id={photo.id}>
      <img loading="lazy" src={`${API_BASE}${path}/photos/${encodeURIComponent(photo.id)}`} alt={photo.caption || t('Photo {0}', index + 1)} />
      <p className="album-caption" style={{ fontFamily: handwriting(photo.caption) }}>{photo.caption}</p>
      {photo.contributor && <small>{photo.contributor}</small>}
      <div className="album-photo-actions">
        {album.canManage && <>
          <PointerReorderHandle index={index} disabled={busy} onMove={move} itemAttribute="data-album-photo" className="album-reorder-handle"
            label={t('Move photo {0}. Drag or use the up and down arrow keys.', index + 1)} />
          <button type="button" disabled={busy || !index} onClick={() => move(index, index - 1)} aria-label={t('Move photo earlier')}>↑</button>
          <button type="button" disabled={busy || index === album.photos.length - 1} onClick={() => move(index, index + 1)} aria-label={t('Move photo later')}>↓</button>
        </>}
        {(album.canManage || editKeys[photo.id]) && <button type="button" disabled={busy} onClick={() => setEditing({ ...photo })}>{t('Edit caption')}</button>}
      </div>
      {editing?.id === photo.id && <fieldset disabled={busy}>
        <label>{t('Photo caption')}<textarea aria-label={t('Photo caption')} maxLength={300} rows={3} value={editing.caption} style={{ fontFamily: handwriting(editing.caption) }} onChange={event => setEditing({ ...editing, caption: event.target.value })} /></label>
        <label>{t('Your name (optional)')}<input maxLength={100} value={editing.contributor} onChange={event => setEditing({ ...editing, contributor: event.target.value })} /></label>
        <button type="button" onClick={() => void run(async () => { setAlbum(await journeyRequest<AlbumState>(`${path}/photos/${photo.id}`, {
          method: 'PUT', headers: { ...headers, 'X-Photo-Edit-Key': editKeys[photo.id] ?? '' }, body: JSON.stringify(editing),
        })); setEditing(null); })}>{t('Save caption')}</button>
        <button type="button" onClick={() => setEditing(null)}>{t('Cancel')}</button>
        <details><summary>{t('Remove photo')}</summary><button type="button" onClick={() => void run(async () => {
          setAlbum(await journeyRequest<AlbumState>(`${path}/photos/${photo.id}`, { method: 'DELETE', headers: { ...headers, 'X-Photo-Edit-Key': editKeys[photo.id] ?? '' } })); setEditing(null);
        })}>{t('Confirm removal')}</button></details>
      </fieldset>}
    </li>)}</ol>
    {!!album?.photos.length && <p>{t('Photos: {0}', new Intl.NumberFormat(getLocale()).format(album.photos.length))}</p>}
    {busy && <p role="status">{t('Saving album…')}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
