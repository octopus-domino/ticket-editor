import { afterEach,describe,expect,it,vi } from 'vitest';
import { startGuest,endGuest,guestRead,isGuest } from '@/shared/session/guest';
import { authFetch } from '@/shared/api/client';
import { IndexedDraftRepository } from '@/infrastructure/state/IndexedDraftRepository';
afterEach(()=>{endGuest();vi.unstubAllGlobals();});
describe('guest persistence boundary',()=>{
  it('keeps schema, model, template and document CRUD inside the tab without a server request',async()=>{const fetch=vi.fn();vi.stubGlobal('fetch',fetch);startGuest();const post=(path:string,body:unknown)=>authFetch(path,{method:'POST',body:JSON.stringify(body)});const schema=await (await post('/api/schemas',{name:'People',fields:[]})).json();const template=await (await post('/api/templates',{name:'Guest layout',schemaId:schema.id,slides:[],bindings:[]})).json();expect((await (await authFetch('/api/templates')).json())[0].id).toBe(template.id);expect(fetch).not.toHaveBeenCalled();expect(localStorage.getItem('codoc:guest:resources')).toBeNull();expect(guestRead('resources')).toContain('Guest layout');endGuest();expect(isGuest()).toBe(false);expect(guestRead('resources')).toBeNull();});
  it('never writes a delayed guest draft into account IndexedDB after exiting guest mode',async()=>{const drafts=new IndexedDraftRepository<unknown>();startGuest();endGuest();await drafts.write('guest:doc',{snapshot:{text:'secret'},revision:'r',savedAt:1});expect(await drafts.read('guest:doc')).toBeNull();});
});
