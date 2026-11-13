import { useState } from 'react';
import { t } from '@/shared/i18n';
import type { CreatedJourney, JourneyDefinition } from '../domain/definitions';
import { journeyApi, rememberKey, pdfUrl, managementUrl } from '../api/journeys';
import { AlbumPanel } from './AlbumPanel';
import { JourneyBackgroundPicker } from './JourneyBackgroundPicker';
import { JourneyConstructorButton } from './JourneyConstructorButton';

export default function AlbumWizard({ definition, custom = false, previewOnly = false }: {definition:JourneyDefinition;custom?:boolean;previewOnly?:boolean}) {
  const [title,setTitle]=useState(definition.title), [data,setData]=useState<Record<string,string>>({theme:definition.theme,...(custom?{site:definition.slug}:{})});
  const [created,setCreated]=useState<CreatedJourney|null>(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const patch = async (fields:Record<string,string>) => {
    const next={...data,...fields}; setData(next);
    if (!created) return;
    setBusy(true);setError('');
    try { const document=await journeyApi.update({...created.document,data:{...created.document.data,...fields}},created.managementKey);setCreated({...created,document}); }
    catch(reason){setError((reason as Error).message);}
    finally{setBusy(false);}
  };
  return <main className="journey-main">
    <h1>{definition.title}</h1><p>{definition.description}</p>
    {!created && <form onSubmit={async event=>{
      event.preventDefault();if(busy||previewOnly)return;setBusy(true);setError('');
      try{const [result]=await journeyApi.create('ALBUM',title,data,[]);rememberKey(result.document.id,result.managementKey);setCreated(result);}
      catch(reason){setError((reason as Error).message);}finally{setBusy(false);}
    }}>
      <label>{t('Title')}<input value={title} required maxLength={120} onChange={event=>setTitle(event.target.value)}/></label>
      {definition.fields.map(field=><label key={field.name}>{field.label}<textarea required={field.required} maxLength={2000} value={data[field.name]??''} onChange={event=>setData({...data,[field.name]:event.target.value})}/></label>)}
      <button type="submit" disabled={busy||previewOnly}>{t('Create')}</button>
    </form>}
    <JourneyBackgroundPicker value={data} onChange={fields=>void patch(fields)} onBusyChange={setBusy}/>
    {error&&<p role="alert">{error}</p>}
    {created&&<>
      <AlbumPanel id={created.document.id} manage/>
      <a className="journey-primary" href={pdfUrl(created.document.id)}>{t('Скачать PDF ↓')}</a>
      <JourneyConstructorButton id={created.document.id}/>
      <a href={managementUrl(created.document.id,created.managementKey)}>{t('Manage')}</a>
    </>}
  </main>;
}
