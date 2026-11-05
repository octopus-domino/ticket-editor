import { useEffect, useRef, useState } from 'react';
import { authFetch } from '@/shared/api/client';
import type { GenerationRequest } from '../api/GenerationClient';
import { t } from '@/shared/i18n';

export function GenerationPreview({ request, disabled }: { request: GenerationRequest | null; disabled: boolean }) {
  const [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [pages,setPages]=useState(1),[page,setPage]=useState(0);
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => { current.current?.abort(); setUrl(''); setError(''); setBusy(false);setPages(1);setPage(0); }, [request]);
  async function preview(index=0) {
    if (!request) return;
    const controller = new AbortController(); current.current = controller;
    setBusy(true); setError('');
    try {
      const response = await authFetch(`/api/generate/preview?page=${index}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, items: request.items.slice(0, 1), format: 'svg', packAs: 'single' }), signal: controller.signal });
      if (!response.ok) throw new Error((await response.json() as { error: string }).error);
      const blob = await response.blob();
      if (!controller.signal.aborted) {setUrl(URL.createObjectURL(new Blob([blob], { type: 'image/svg+xml' })));setPage(index);setPages(Number(response.headers.get('X-Preview-Pages')??1));}
    } catch (reason) { if (!controller.signal.aborted) setError((reason as Error).message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="generation-preview">
    <button type="button" className="dp-btn" disabled={disabled || !request || busy} onClick={() => void preview()}>{t(busy ? 'Preparing preview…' : 'Preview the first selected row')}</button>
    {error && <p role="alert">{error}</p>}
    {url&&pages>1&&<div><button type="button" disabled={busy||page===0} onClick={()=>void preview(page-1)}>←</button><span> {page+1} / {pages} </span><button type="button" disabled={busy||page+1>=pages} onClick={()=>void preview(page+1)}>→</button></div>}
    {url && <figure><img src={url} alt={t('Document preview')} style={{ width: '100%', maxHeight: 540, objectFit: 'contain', background: 'white' }} /><figcaption>{t('Preview one document before generating the whole series.')}</figcaption></figure>}
  </section>;
}
