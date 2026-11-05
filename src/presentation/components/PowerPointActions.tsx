import { useRef,useState } from 'react';
import { useDocumentStore,useSelectionStore } from '../providers/EditorProvider';
import { useStore } from '@/shared/store/store';
import type { Slide } from '@/shared/types';
import { downloadFile } from '@/shared/files/download';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { t } from '@/shared/i18n';

export function PowerPointActions(){
  const store=useDocumentStore(),selection=useSelectionStore(),slides=useStore(store,s=>s.slides),fileRef=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[imported,setImported]=useState<Slide[]|null>(null);
  async function run(action:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await action();}catch(reason){setError((reason as Error).message);}finally{setBusy(false);}}
  function apply(replace:boolean){if(!imported)return;store.commit(draft=>{draft.slides=replace?imported:[...draft.slides,...imported];draft.activeId=imported[0].id;draft.bindings=resolveBindings(draft.slides,replace?[]:draft.bindings);},'import-powerpoint');selection.clear();setImported(null);setNotice(t('PowerPoint slides imported. You can undo this action.'));}
  return <div className="powerpoint-actions" style={{display:'flex',gap:6,alignItems:'center'}}>
    <button type="button" className="toolbar-btn" disabled={busy} onClick={()=>fileRef.current?.click()}>{t('Import PowerPoint')}</button>
    <button type="button" className="toolbar-btn" disabled={busy||!slides.length} onClick={()=>void run(async()=>{const {exportPptx}=await import('@/lib/powerpoint/exportPptx');const result=await exportPptx(slides);downloadFile(new Blob([result.bytes],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}),'presentation.pptx');setNotice(result.warnings.length?t('PowerPoint exported. Complex objects are images; review the export details.')+' '+result.warnings.map(warning=>t(warning)).join(' '):t('PowerPoint exported.'));})}>{busy?t('Preparing…'):t('Export PowerPoint')}</button>
    <input ref={fileRef} type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" hidden onChange={event=>{const file=event.target.files?.[0];event.currentTarget.value='';if(!file)return;void run(async()=>{if(!/\.pptx$/i.test(file.name)||file.size>30*1024*1024)throw Error(t('Choose a .pptx file up to 30 MB.'));const {importPptx}=await import('@/lib/powerpoint/importPptx');const result=await importPptx(new Uint8Array(await file.arrayBuffer()));setImported(result.slides);setNotice(result.warnings.map(warning=>t(warning)).join(' '));});}}/>
    {(imported||notice||error)&&<section className="powerpoint-message" style={{position:'fixed',top:80,right:16,zIndex:150,maxWidth:'min(520px,calc(100vw - 32px))',maxHeight:'60dvh',overflow:'auto',padding:16,border:'1px solid var(--border)',borderRadius:8,background:'var(--panel)',boxShadow:'var(--shadow-lg)',whiteSpace:'normal'}}>
      {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
      {imported&&<><p>{t('Imported slides')}: {imported.length}</p><button type="button" className="toolbar-btn" onClick={()=>apply(false)}>{t('Add slides')}</button><button type="button" className="toolbar-btn" onClick={()=>apply(true)}>{t('Replace all slides')}</button></>}
      <button type="button" className="toolbar-btn" onClick={()=>{setImported(null);setNotice('');setError('');}}>{t('Close')}</button>
    </section>}
  </div>;
}
