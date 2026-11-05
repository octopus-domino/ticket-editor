import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '@/shared/api/client';
import { downloadFile } from '@/shared/files/download';
import { httpGenerationClient } from '@/features/generation/api/HttpGenerationClient';
import { generationStore } from '@/features/generation/state/GenerationStore';
import { t } from '@/shared/i18n';
import '../templates/ui/template-journey.css';

interface Release { jobId:string;status:string;createdAt:string;expiresAt:string;total:number;completed:number;failed:number;format:string;hasSnapshot:boolean }
export function GenerationHistoryPage(){
  const [items,setItems]=useState<Release[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');const navigate=useNavigate();
  async function load(){const r=await authFetch('/api/generate');if(!r.ok)throw new Error(`HTTP ${r.status}`);setItems(await r.json() as Release[]);}
  useEffect(()=>{void load().catch((reason:Error)=>setError(reason.message));},[]);
  async function run(operation:()=>Promise<void>){setBusy(true);setError('');try{await operation();}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}
  async function retry(id:string){await run(async()=>{const r=await authFetch(`/api/generate/${id}/retry`,{method:'POST'});if(!r.ok)throw new Error((await r.json() as {error:string}).error);const job=await r.json() as {jobId:string};void generationStore.resumeJob(job.jobId);navigate('/app/generate');});}
  return <main className="template-new"><h1>{t('Generation history')}</h1><p>{t('Completed files and source snapshots are kept for seven days. Downloads preserve the exact original result.')}</p>
    <button type="button" disabled={busy} onClick={()=>void run(load)}>{t('Refresh')}</button>{error&&<p role="alert">{error}</p>}
    {items.map(item=><article className="template-help" key={item.jobId}>
      <strong>{new Date(item.createdAt).toLocaleString()} · {item.format.toUpperCase()}</strong>
      <p>{t('Status')}: {item.status} · {t('Completed')}: {item.completed}/{item.total} · {t('Errors')}: {item.failed}</p>
      <p>{t('Expires')}: {new Date(item.expiresAt).toLocaleString()} · {t(item.hasSnapshot?'Source snapshot saved':'Legacy release without a source snapshot')}</p>
      {item.status==='done'&&<><button type="button" disabled={busy} onClick={()=>void run(async()=>{const file=await httpGenerationClient.downloadResult(item.jobId);downloadFile(file.blob,file.filename);})}>{t('Download')}</button>
        {item.format!=='svg'&&<button type="button" disabled={busy} onClick={()=>void run(async()=>{await generationStore.resumeJob(item.jobId);navigate('/app/sign');})}>{t('Sign document')}</button>}</>}
      {item.failed>0&&['done','failed'].includes(item.status)&&<button type="button" disabled={busy} onClick={()=>void retry(item.jobId)}>{t('Retry failed items only')}</button>}
      {['queued','running'].includes(item.status)&&<button type="button" disabled={busy} onClick={()=>{void generationStore.resumeJob(item.jobId);navigate('/app/generate');}}>{t('Open progress')}</button>}
    </article>)}
    {!items.length&&<p>{t('No generation history yet.')}</p>}
  </main>;
}
