import { getLocale, t } from '@/shared/i18n';
import { useMemo } from 'react';

const zones = Intl.supportedValuesOf('timeZone');
export function TimeZoneSelect({value,onChange}:{value:string;onChange:(zone:string)=>void}) {
  const locale=getLocale();
  const options=useMemo(()=>[...new Set([value,'UTC',...zones])].map(zone=>{
    try {
      const parts=new Intl.DateTimeFormat(locale,{timeZone:zone,timeZoneName:'longGeneric'}).formatToParts();
      const offset=new Intl.DateTimeFormat(locale,{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts().find(part=>part.type==='timeZoneName')?.value;
      const name=parts.find(part=>part.type==='timeZoneName')?.value??zone;
      return {zone,label:`${name} · ${offset} (${zone})`};
    }catch{return {zone,label:zone};}
  }).sort((a,b)=>a.label.localeCompare(b.label,locale)),[value,locale]);
  return <select aria-label={t('Time zone')} value={value} onChange={event=>onChange(event.target.value)} style={{maxWidth:'100%'}}>
    {options.map(option=><option key={option.zone} value={option.zone}>{option.label}</option>)}
  </select>;
}
