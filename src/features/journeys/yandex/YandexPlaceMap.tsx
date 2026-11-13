import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';
import type { MapPoint, MapScene } from './protocol';
import type { PlannedLeg } from '../domain/route';
import type { RouteStop } from '../domain/routeTimeline';

/** The browser key enables the basemap only; search stays with the existing POI services. */
export function YandexPlaceMap({ center, points, focusedId, onSelect, stops=[], legs=[], onModeChange,onPick,onCenter,pickedPoint }: {
  center:[number,number]; points:MapPoint[]; focusedId?:string; onSelect:(id:string)=>void; stops?:RouteStop[]; legs?:PlannedLeg[];
  onModeChange?:(enabled:boolean)=>void;onPick?:(point:{longitude:number;latitude:number})=>void;onCenter?:(point:{longitude:number;latitude:number})=>void;
  pickedPoint?:{longitude:number;latitude:number}|null;
}) {
  const locale=useLocale();
  const [key,setKey]=useState(''),[enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[failed,setFailed]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const frame=useRef<HTMLIFrameElement>(null);
  const [channel]=useState(()=>crypto.randomUUID());
  const select=useRef(onSelect);select.current=onSelect;
  const callbacks=useRef({onPick,onCenter,onModeChange});callbacks.current={onPick,onCenter,onModeChange};
  useEffect(()=>{
    if(locale!=='ru'){
      setKey('');setEnabled(false);setReady(false);setLoaded(false);callbacks.current.onModeChange?.(false);return;
    }
    const abort=new AbortController();
    void journeyRequest<{yandexEnabled:boolean;yandexBrowserKey:string}>('/api/journeys/maps/providers',{signal:abort.signal})
      .then(value=>{if(!abort.signal.aborted&&value.yandexEnabled)setKey(value.yandexBrowserKey);}).catch(()=>{});
    return()=>abort.abort();
  },[locale]);
  useEffect(()=>{
    if(!enabled)return;
    const listener=(event:MessageEvent)=>{
      if(event.origin!==location.origin||event.source!==frame.current?.contentWindow||event.data?.channel!==channel)return;
      if(event.data.type==='ready')setReady(true);
      if(event.data.type==='loaded'){setFailed(false);setLoaded(true);frame.current?.contentWindow?.postMessage({channel,type:'fit'},location.origin);}
      if(event.data.type==='error')setFailed(true);
      if(event.data.type==='select'&&typeof event.data.data?.id==='string')select.current(event.data.data.id);
      if(['pick','center'].includes(event.data.type)){
        const point=event.data.data;
        if(point&&Number.isFinite(point.longitude)&&Math.abs(point.longitude)<180&&Number.isFinite(point.latitude)&&Math.abs(point.latitude)<=85){
          if(event.data.type==='pick')callbacks.current.onPick?.(point);else callbacks.current.onCenter?.(point);
        }
      }
    };
    window.addEventListener('message',listener);
    return()=>window.removeEventListener('message',listener);
  },[enabled,channel]);
  useEffect(()=>{
    if(!enabled||loaded)return;
    const timer=setTimeout(()=>setFailed(true),15000);
    return()=>clearTimeout(timer);
  },[enabled,loaded]);
  useEffect(()=>{
    if(!ready||!enabled)return;
    // Downsample only the live preview; the saved route keeps its full geometry.
    const previewLegs=legs.map(leg=>({...leg,coordinates:leg.coordinates.filter((_,index)=>index%Math.max(1,Math.ceil(leg.coordinates.length/2000))===0||index===leg.coordinates.length-1)}));
    const scene:MapScene={center,points:points.slice(0,64),stops,legs:previewLegs,focusedId,pickedPoint};
    frame.current?.contentWindow?.postMessage({channel,type:'scene',data:scene,key},location.origin);
  },[center,points,stops,legs,focusedId,pickedPoint,ready,enabled,channel,key]);
  if(locale!=='ru'||!key)return null;
  return <div className="route-yandex-map">
    <label>Карта <select value={enabled?'yandex':'current'} onChange={event=>{const next=event.target.value==='yandex';setEnabled(next);onModeChange?.(next);setReady(false);setFailed(false);setLoaded(false);}}>
      <option value="current">Как сейчас</option><option value="yandex">Яндекс Карты</option>
    </select></label>
    {enabled&&<>
      <iframe ref={frame} title="Найденные места на Яндекс Картах" src={`${import.meta.env.BASE_URL}map-frame.html?channel=${channel}`}
        allow="camera 'none'; microphone 'none'; geolocation 'none'" style={{width:'100%',height:360,border:0,borderRadius:12}} />
      {failed&&<p role="status">Не удалось открыть карту. Список мест и построение прогулки доступны ниже.</p>}
      <button type="button" onClick={()=>frame.current?.contentWindow?.postMessage({channel,type:'fit'},location.origin)}>Показать все места</button>
    </>}
  </div>;
}
