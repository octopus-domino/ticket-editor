import { validScene, yandexCoordinates, type MapScene } from './protocol';
import { routePointMarker } from '../domain/route';
import './frame.css';

interface Events { add(name:string,callback:(event:{get(name:string):unknown})=>void):void }
interface GeoObject { events:Events }
interface YandexMap {
  geoObjects:{removeAll():void;add(object:GeoObject):void};events:Events;
  setCenter(center:number[],zoom?:number,options?:object):unknown;
  setBounds(bounds:number[][],options?:object):unknown;
  getCenter():number[];
  destroy():void;
}
interface YandexApi {
  ready(callback:()=>void):void;
  Map:new(element:string,state:object,options?:object)=>YandexMap;
  Placemark:new(coordinates:number[],properties:object,options:object)=>GeoObject;
  Polyline:new(coordinates:number[][],properties:object,options:object)=>GeoObject;
}
const channel=new URLSearchParams(location.search).get('channel')??'';
const parentOrigin=location.origin;
const send=(type:string,data?:unknown)=>window.parent.postMessage({channel,type,data},parentOrigin);
const escaped=(value:string)=>value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
let map:YandexMap|undefined,api:YandexApi|undefined,scene:MapScene|undefined,initializing=false,lastFocus='';
function paint(){
  if(!map||!api||!scene)return;
  map.geoObjects.removeAll();
  if(scene.pickedPoint)map.geoObjects.add(new api.Placemark(yandexCoordinates(scene.pickedPoint.longitude,scene.pickedPoint.latitude),
    {hintContent:'Выбранная точка'},{preset:'islands#redDotIcon'}));
  for(const point of scene.points){
    const marker=new api.Placemark(yandexCoordinates(point.longitude,point.latitude),{hintContent:escaped(point.label),iconContent:point.selected?'✓':''},
      {preset:point.selected?'islands#greenCircleIcon':'islands#blueCircleIcon'});
    marker.events.add('click',()=>send('select',{id:point.id}));map.geoObjects.add(marker);
  }
  for(const leg of scene.legs)if(leg.coordinates.length>1)map.geoObjects.add(new api.Polyline(leg.coordinates.map(point=>yandexCoordinates(...point)),{},
    {strokeColor:leg.mode==='flight'?'#af5347':'#225fcb',strokeWidth:5,...(leg.mode==='flight'?{strokeStyle:'dash'}:{})}));
  scene.stops.forEach((point,index)=>{
    const marker=new api!.Placemark(yandexCoordinates(point.longitude,point.latitude),{hintContent:escaped(point.label),iconContent:routePointMarker(index,scene!.stops.length)},
      {preset:'islands#blueStretchyIcon'});
    marker.events.add('click',()=>{
      const match=scene!.points.find(item=>Math.abs(item.longitude-point.longitude)<.00001&&Math.abs(item.latitude-point.latitude)<.00001);
      if(match)send('select',{id:match.id});
    });map!.geoObjects.add(marker);
  });
  const focused=scene.points.find(point=>point.id===scene!.focusedId);
  if(focused&&lastFocus!==focused.id){lastFocus=focused.id;void map.setCenter(yandexCoordinates(focused.longitude,focused.latitude),16);}
}
function initialize(key:string){
  if(initializing||map)return;initializing=true;
  const script=document.createElement('script');
  script.src=`https://api-maps.yandex.ru/2.1/?${new URLSearchParams({apikey:key,lang:'ru_RU'})}`;
  script.referrerPolicy='origin';
  script.onerror=()=>send('error');
  script.onload=()=>{
    api=(window as Window&{ymaps?:YandexApi}).ymaps;
    if(!api){send('error');return;}
    api.ready(()=>{
      if(!scene)return;
      try {
      // Deliberately no SearchControl/geocoder/suggest: all POIs come from existing free sources.
      map=new api!.Map('map',{center:yandexCoordinates(...scene.center),zoom:13,controls:['zoomControl','fullscreenControl']});
      map.events.add('boundschange',()=>{const center=map!.getCenter();send('center',{longitude:center[1],latitude:center[0]});});
      map.events.add('click',event=>{
        const coordinates=event.get('coords');
        if(Array.isArray(coordinates)&&coordinates.length===2&&coordinates.every(Number.isFinite))send('pick',{longitude:coordinates[1],latitude:coordinates[0]});
      });
      paint();send('center',{longitude:scene.center[0],latitude:scene.center[1]});send('loaded');
      } catch {send('error');}
    });
  };
  document.head.append(script);
}
window.addEventListener('message',event=>{
  if(event.source!==window.parent||event.origin!==parentOrigin||!event.data||event.data.channel!==channel)return;
  const message=event.data;
  if(message.type==='scene'&&validScene(message.data)){
    scene=message.data;paint();
    if(!map&&typeof message.key==='string'&&message.key.length>10&&message.key.length<150)initialize(message.key);
  }
  if(message.type==='fit'&&map&&scene){
    const points=[...scene.points,...scene.stops];
    if(points.length){const lat=points.map(point=>point.latitude),lon=points.map(point=>point.longitude);
      void map.setBounds([[Math.min(...lat),Math.min(...lon)],[Math.max(...lat),Math.max(...lon)]],{checkZoomRange:true,zoomMargin:45});}
    else void map.setCenter(yandexCoordinates(...scene.center),13);
  }
});
window.addEventListener('pagehide',()=>map?.destroy(),{once:true});
send('ready');
