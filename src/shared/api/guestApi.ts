import { guestRead,guestWrite } from '@/shared/session/guest';
import { t } from '@/shared/i18n/core';
type RecordData=Record<string,unknown>&{id:string;name:string;createdAt:string;updatedAt:string};
type Tables=Record<string,RecordData[]>;
const reply=(value:unknown,status=200)=>Response.json(value,{status});
function read():Tables{try{return JSON.parse(guestRead('resources')??'{}') as Tables;}catch{return {};}}
export function guestGenerationBody(raw:string){const body=JSON.parse(raw) as Record<string,unknown>,tables=read(),template=(tables.template??[]).find(r=>r.id===body.templateId);const schema=(tables.schema??[]).find(r=>r.id===(template?.schemaId??body.schemaId));return {...body,templateId:null,schemaId:null,inlineSlides:body.inlineSlides??template?.slides,bindings:body.bindings??template?.bindings??[],fields:schema?.fields??[],items:(body.items as Record<string,unknown>[]).map(item=>{const model=(tables.model??[]).find(r=>r.id===item.dataModelId);return {...item,dataModelId:null,inlineValues:item.inlineValues??model?.values??{}};})};}
/** This adapter is the only guest CRUD boundary. No network fallback is permitted. */
export async function guestApi(url:URL,init:RequestInit):Promise<Response>{
  const path=url.pathname,method=init.method??'GET';let body:Record<string,unknown>={};
  try{if(init.body)body=JSON.parse(String(init.body)) as Record<string,unknown>;}catch{return reply({error:t('Invalid file format')},400);}
  const tables=read(),save=()=>guestWrite('resources',JSON.stringify(tables));
  const types:Record<string,string>={'/api/templates':'template','/api/schemas':'schema','/api/data-models':'model','/api/workspace/documents':'document','/api/workspace/folders':'folder'};
  if(path==='/api/workspace/tree'){
    const nodes=[...(tables.folder??[]).map(r=>({...r,type:'folder',parentId:r.parentId??null})),...(tables.document??[]).map(r=>({...r,type:'document',parentId:r.folderId??null})),...(tables.template??[]).map(r=>({...r,type:'template',parentId:r.folderId??null}))];
    const tree=(parent:unknown,depth=0):unknown[]=>depth>20?[]:nodes.filter(n=>n.parentId===parent).map(n=>({...n,children:n.type==='folder'?tree(n.id,depth+1):[]}));return reply(tree(null));
  }
  if(path.startsWith('/api/history/'))return reply([]);
  const base=Object.keys(types).find(key=>path===key||path.startsWith(key+'/'));
  if(!base)return reply({error:t('Sign in to use server history, shared libraries, email and integrations. Your guest documents stay in this tab.')},403);
  const kind=types[base],rows=tables[kind]??(tables[kind]=[]),parts=path.slice(base.length).split('/').filter(Boolean),id=parts[0],action=parts[1];
  if(kind==='model'&&id==='import'&&method==='POST'){
    const items=body.items as {id?:string;name:string;values:unknown}[];if(!Array.isArray(items)||items.length>10000)return reply({error:t('Invalid file format')},400);
    const issues:{index:number;message:string}[]=[];let imported=0;
    items.forEach((item,index)=>{const existing=item.id?rows.find(r=>r.id===item.id&&r.schemaId===body.schemaId):undefined;if(item.id&&!existing){issues.push({index,message:t('Data set not found')});return;}const now=new Date().toISOString();if(existing)Object.assign(existing,{...item,updatedAt:now});else rows.push({...item,id:crypto.randomUUID(),schemaId:body.schemaId,createdAt:now,updatedAt:now});imported++;});save();return reply({imported,issues});
  }
  if(method==='GET'&&!id){const schema=url.searchParams.get('schemaId');return reply(schema?rows.filter(r=>r.schemaId===schema):rows);}
  if(method==='POST'&&!id){const now=new Date().toISOString();const record={...body,id:crypto.randomUUID(),name:String(body.name??''),createdAt:now,updatedAt:now,...(kind==='document'?{content:'{}'}:{})};rows.push(record);save();return reply(record,201);}
  const record=rows.find(r=>r.id===id);if(!record)return reply({error:t('Document not found')},404);
  if(method==='GET')return reply(record);
  if(method==='PUT'){if(action==='parent'){if(kind==='folder')record.parentId=body.parentId??null;else record.folderId=body.parentId??null;}else Object.assign(record,body);record.updatedAt=new Date().toISOString();save();return reply(record);}
  if(method==='DELETE'){
    if(kind==='schema'&&[...(tables.model??[]),...(tables.template??[])].some(r=>r.schemaId===id))return reply({error:t('This schema is used by data sets or documents. Detach it or remove the linked records first.')},409);
    const remove=new Set([id]);if(kind==='folder'){let changed=true;while(changed){changed=false;for(const row of tables.folder??[])if(remove.has(String(row.parentId))&&!remove.has(row.id)){remove.add(row.id);changed=true;}}for(const key of ['folder','document','template'])tables[key]=(tables[key]??[]).filter(r=>!remove.has(r.id)&&!remove.has(String(r.folderId)));}else tables[kind]=rows.filter(r=>r.id!==id);save();return new Response(null,{status:204});
  }
  return reply({error:t('Action unavailable')},400);
}
