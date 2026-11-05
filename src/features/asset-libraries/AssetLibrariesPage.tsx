import { useEffect,useState } from 'react';
import { authFetch } from '@/shared/api/client';
import { useNavigate } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { captureAssets,installAssets,validateAsset,type Asset } from './assets';
import { newSimpleText } from '@/lib/factories';
import { prepareImage } from '@/features/image-template/api/recognitionClient';
import '../templates/ui/template-journey.css';

interface Library {id:string;name:string;revision:number;role:'owner'|'editor'|'viewer';items:Asset[]}
async function request<T>(url:string,method='GET',body?:unknown):Promise<T>{const r=await authFetch(url,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});if(!r.ok)throw new Error((await r.json().catch(()=>({error:`HTTP ${r.status}`})) as {error:string}).error);const text=await r.text();return text?JSON.parse(text) as T:undefined as T;}
export function AssetLibrariesPage(){
  const [libraries,setLibraries]=useState<Library[]>([]),[library,setLibrary]=useState<Library|null>(null),[items,setItems]=useState<Asset[]>([]);
  const [name,setName]=useState(''),[folder,setFolder]=useState(''),[email,setEmail]=useState(''),[role,setRole]=useState('viewer'),[colors,setColors]=useState('#1a365d,#ffffff');
  const [templates,setTemplates]=useState<{id:string;name:string}[]>([]),[templateId,setTemplateId]=useState('');
  const [brandFont,setBrandFont]=useState('Arial');
  const [busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');const navigate=useNavigate();
  const writable=library&&library.role!=='viewer';
  async function list(){setLibraries(await request<Library[]>('/api/libraries'));}
  useEffect(()=>{void list().catch((e:Error)=>setError(e.message));void request<{id:string;name:string}[]>('/api/templates').then(setTemplates).catch(()=>{});},[]);
  async function run(action:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await action();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  function accept(value:Library){setLibrary(value);setItems(value.items.map(validateAsset));setDirty(false);setFolder('');}
  function add(assets:Asset[]){setItems(old=>[...old,...assets.filter(a=>!old.some(item=>item.id===a.id)).map(a=>({...a,folderId:folder}))]);setDirty(true);}
  return <main className="template-new"><h1>{t('Shared libraries')}</h1><p>{t('Save a library on the server and load it on another device. Local assets are uploaded only when you choose to save.')}</p>
    <label>{t('Library')}<select value={library?.id??''} disabled={busy||dirty} onChange={e=>void run(async()=>accept(await request<Library>(`/api/libraries/${e.target.value}`)))}><option value="">—</option>{libraries.map(l=><option value={l.id} key={l.id}>{l.name} · {l.role}</option>)}</select></label>
    <label>{t('Name')}<input value={name} maxLength={200} onChange={e=>setName(e.target.value)}/></label><button disabled={busy||dirty||!name.trim()} onClick={()=>void run(async()=>{accept(await request<Library>('/api/libraries','POST',{name}));setName('');await list();})}>{t('Create library')}</button>
    {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
    {library&&<><p>{library.name} · {library.role} · v{library.revision}{dirty?' *':''}</p>
      <button disabled={busy} onClick={()=>void run(async()=>accept(await request<Library>(`/api/libraries/${library.id}`)))}>{t('Reload library')}</button>
      <button disabled={busy||!writable||!dirty} onClick={()=>void run(async()=>{const value=await request<Library>(`/api/libraries/${library.id}`,'PUT',{revision:library.revision,items});accept(value);await list();setMessage(t('Saved'));})}>{t('Save library')}</button>
      <p>{t('Reload discards unsaved library changes. A version conflict never overwrites the server copy.')}</p>
      <button disabled={busy||!writable} onClick={()=>void run(async()=>add(captureAssets()))}>{t('Add local stamps, styles and symbols')}</button>
      <button disabled={busy} onClick={()=>void run(async()=>{installAssets(items);setMessage(t('Copies added. Open the editor to use them.'));})}>{t('Install local copies')}</button>
      {writable&&<section className="template-form"><label>{t('Folder')}<select value={folder} onChange={e=>setFolder(e.target.value)}><option value="">—</option>{items.filter(a=>a.kind==='folder').map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>{t('Font')}<select value={brandFont} onChange={e=>setBrandFont(e.target.value)}>{['Arial','Georgia','Times New Roman','Verdana','Courier New'].map(font=><option key={font}>{font}</option>)}</select></label>
        <button disabled={busy||!name.trim()} onClick={()=>{const id=crypto.randomUUID();add([validateAsset({id,kind:'symbol',name,payload:{id,name,prototype:{...newSimpleText(0,0),text:name,fontFamily:brandFont}}})]);setName('');}}>{t('Add brand text')}</button>
        <label>{t('Brand logo')}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||!name.trim()} onChange={e=>{const file=e.target.files?.[0];if(file)void run(async()=>{const src=await prepareImage(file);const bitmap=await createImageBitmap(file);const ratio=bitmap.width/bitmap.height;bitmap.close();const id=crypto.randomUUID();add([validateAsset({id,kind:'symbol',name,payload:{id,name,prototype:{id:crypto.randomUUID(),type:'image',x:0,y:0,width:200,height:200/ratio,rotation:0,src}}})]);setName('');});e.currentTarget.value='';}}/></label>
        <button disabled={!name.trim()} onClick={()=>{add([{id:crypto.randomUUID(),kind:'folder',name}]);setName('');}}>{t('Add folder')}</button>
        <label>{t('Brand colors')}<input value={colors} onChange={e=>setColors(e.target.value)} placeholder="#1a365d,#ffffff"/></label><button disabled={!name.trim()} onClick={()=>void run(async()=>{const palette=colors.split(',').map(c=>c.trim());if(!palette.length||palette.length>20||palette.some(c=>!/^#[a-f\d]{6}$/i.test(c)))throw new Error(t('Use comma-separated HEX colors.'));add(palette.map((color,index)=>{const id=crypto.randomUUID();return validateAsset({id,kind:'brand',name:`${name} ${index+1}`,payload:{id,name:`${name} ${index+1}`,fills:[{id:crypto.randomUUID(),type:'solid',color}],strokes:[]}});}));setName('');})}>{t('Add brand palette')}</button>
        <label>{t('Template')}<select value={templateId} onChange={e=>setTemplateId(e.target.value)}><option value="">—</option>{templates.map(a=><option value={a.id} key={a.id}>{a.name}</option>)}</select></label><button disabled={!templateId||busy} onClick={()=>void run(async()=>{const payload=await request<{name:string}>(`/api/templates/${templateId}`);add([validateAsset({id:`template:${templateId}`,name:payload.name,kind:'template',payload})]);})}>{t('Add template copy')}</button>
      </section>}
      {items.map(item=><article className="template-help" key={item.id}><strong>{item.name}</strong> · {item.kind}{item.folderId&&` · ${items.find(a=>a.id===item.folderId)?.name??''}`}
        {library.role==='owner'&&<label><input type="checkbox" checked={!!item.locked} onChange={e=>{setItems(old=>old.map(a=>a.id===item.id?{...a,locked:e.target.checked}:a));setDirty(true);}}/>{t('Protected')}</label>}
        {writable&&<button disabled={busy||(library.role!=='owner'&&!!item.locked)} onClick={()=>{setItems(old=>old.filter(a=>a.id!==item.id).map(a=>a.folderId===item.id?{...a,folderId:''}:a));setDirty(true);}}>{t('Remove')}</button>}
        {item.kind==='template'&&<button disabled={busy} onClick={()=>void run(async()=>{const copy=await request<{id:string}>('/api/templates','POST',{...(validateAsset(item).payload as object),schemaId:null,folderId:null});navigate(`/app/templates/${copy.id}/edit`);})}>{t('Create template')}</button>}
      </article>)}
      {library.role==='owner'&&<section className="template-form"><h2>{t('Library access')}</h2><p>{t('Grant access to a registered user. Viewers can copy assets; editors can modify unprotected items. Only owners manage protection and access.')}</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><select value={role} onChange={e=>setRole(e.target.value)}><option value="viewer">{t('Viewer')}</option><option value="editor">{t('Editor')}</option><option value="remove">{t('Remove access')}</option></select><button disabled={busy||dirty||!email} onClick={()=>void run(async()=>{await request<void>(`/api/libraries/${library.id}/members`,'POST',{email,role});accept(await request<Library>(`/api/libraries/${library.id}`));setEmail('');setMessage(t('Saved'));})}>{t('Apply access')}</button></section>}
    </>}
  </main>;
}
