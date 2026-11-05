import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '@/shared/api/client';
import { workspaceStore } from '@/workspace/store';
import { t } from '@/shared/i18n';

interface Version { id: string; createdAt: string; contentHash: string; payloadBytes: number }
export function ResourceHistoryPanel({ kind, id }: { kind: 'template'|'document'; id: string }) {
  const [versions,setVersions]=useState<Version[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const navigate=useNavigate();
  async function load(){setBusy(true);setError('');try{const r=await authFetch(`/api/history/${kind}/${encodeURIComponent(id)}`);if(!r.ok)throw new Error(`HTTP ${r.status}`);setVersions(await r.json() as Version[]);}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}
  async function copy(version:string){setBusy(true);setError('');try{
    const r=await authFetch(`/api/history/${kind}/${encodeURIComponent(id)}/${encodeURIComponent(version)}/copy`,{method:'POST'});
    if(!r.ok)throw new Error((await r.json() as {error:string}).error);const value=await r.json() as {id:string;kind:string};
    await workspaceStore.refresh();navigate(value.kind==='template'?`/app/templates/${value.id}/edit`:`/app/editor/${value.id}`);
  }catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}
  return <details className="resource-history" onToggle={event=>{if(event.currentTarget.open)void load();}}>
    <summary>{t('Saved versions')}</summary>
    <div style={{maxHeight:240,overflow:'auto',padding:12,background:'var(--panel)',border:'1px solid var(--border)',minWidth:240}}>
      <p>{t('Restore creates a separate copy. Your current document is preserved.')}</p>
      <p>{t('Up to 20 versions per document, 30 days and 50 MB per account.')}</p>
      {error&&<p role="alert">{error}</p>}
      {versions.map(version=><div key={version.id} style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}><time>{new Date(version.createdAt).toLocaleString()}</time><code>{version.contentHash.slice(0,8)}</code><button type="button" disabled={busy} onClick={()=>void copy(version.id)}>{t('Restore as a copy')}</button></div>)}
      {!busy&&!versions.length&&<p>{t('No saved versions yet.')}</p>}
    </div>
  </details>;
}
