import { useEffect,useState } from 'react';
import { authFetch } from '@/shared/api/client';
import { authStore } from '@/auth/store';
import { t } from '@/shared/i18n';
import '../templates/ui/template-journey.css';
interface Profile {id:string;name:string;email:string;organization:string;position:string;phone:string;avatar:string}
export function ProfilePage(){
  const [profile,setProfile]=useState<Profile|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  useEffect(()=>{void authFetch('/api/profile').then(async response=>{const payload=await response.json() as Profile&{error?:string};if(!response.ok)throw Error(payload.error);setProfile(payload);}).catch((e:Error)=>setError(e.message));},[]);
  function patch(update:Partial<Profile>){setProfile(old=>old?{...old,...update}:old);setSaved(false);}
  async function save(){if(!profile)return;setBusy(true);setError('');try{const response=await authFetch('/api/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile)}),payload=await response.json() as Profile&{error?:string};if(!response.ok)throw Error(payload.error);setProfile(payload);authStore.setState(state=>({...state,user:state.user?{...state.user,name:payload.name}:null}));setSaved(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function image(file:File){setBusy(true);setError('');try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw Error(t('Choose a PNG, JPEG or WebP image up to 8 MB.'));const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>30000000){bitmap.close();throw Error(t('The image is too large.'));}const canvas=document.createElement('canvas'),scale=Math.min(1,256/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d')!;context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();patch({avatar:canvas.toDataURL('image/jpeg',.9)});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <main className="template-new"><h1>{t('Client profile')}</h1>{error&&<p role="alert">{error}</p>}{saved&&<p role="status">{t('Profile saved')}</p>}{profile&&<form className="template-form" onSubmit={e=>{e.preventDefault();void save();}}>
    {profile.avatar&&<img src={profile.avatar} width={96} height={96} style={{objectFit:'cover',borderRadius:'50%'}} alt={t('Profile picture')}/>}
    <label>{t('Profile picture')}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.currentTarget.value='';if(file)void image(file);}}/></label><button type="button" disabled={busy||!profile.avatar} onClick={()=>patch({avatar:''})}>{t('Remove image')}</button>
    <label>{t('Name')}<input required maxLength={100} value={profile.name} onChange={e=>patch({name:e.target.value})}/></label>
    <label>Email<input type="email" value={profile.email} readOnly/></label>
    <label>{t('Organization')}<input maxLength={200} value={profile.organization} onChange={e=>patch({organization:e.target.value})}/></label>
    <label>{t('Position')}<input maxLength={100} value={profile.position} onChange={e=>patch({position:e.target.value})}/></label>
    <label>{t('Phone')}<input type="tel" maxLength={50} value={profile.phone} onChange={e=>patch({phone:e.target.value})}/></label>
    <button type="submit" disabled={busy||!profile.name.trim()}>{t('Save profile')}</button>
  </form>}</main>;
}
