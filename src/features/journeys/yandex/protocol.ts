import type { PlannedLeg } from '../domain/route';
import type { RouteStop } from '../domain/routeTimeline';

export interface MapPoint { id:string; label:string; longitude:number; latitude:number; selected?:boolean }
export interface MapScene { center:[number,number]; points:MapPoint[]; stops:RouteStop[]; legs:PlannedLeg[]; focusedId?:string; pickedPoint?:{longitude:number;latitude:number}|null }
export function validPoint(value:unknown):value is MapPoint {
  if(!value||typeof value!=='object')return false;
  const point=value as MapPoint;
  return typeof point.id==='string'&&point.id.length<=100&&typeof point.label==='string'&&point.label.length<=350
    &&Number.isFinite(point.longitude)&&Math.abs(point.longitude)<180&&Number.isFinite(point.latitude)&&Math.abs(point.latitude)<=85;
}
export function validScene(value:unknown):value is MapScene {
  if(!value||typeof value!=='object')return false;
  const scene=value as MapScene;
  return Array.isArray(scene.center)&&scene.center.length===2&&scene.center.every(Number.isFinite)
    &&Math.abs(scene.center[0])<180&&Math.abs(scene.center[1])<=85
    &&(scene.pickedPoint==null||validPoint({...scene.pickedPoint,id:'picked',label:''}))
    &&Array.isArray(scene.points)&&scene.points.length<=64&&scene.points.every(validPoint)
    &&Array.isArray(scene.stops)&&scene.stops.length<=12&&scene.stops.every(validPoint)
    &&Array.isArray(scene.legs)&&scene.legs.length<=12&&scene.legs.every(leg=>
      leg!==null&&typeof leg==='object'&&['car','foot','flight'].includes(leg.mode)&&Array.isArray(leg.coordinates)&&leg.coordinates.length<=2500
      &&leg.coordinates.every(point=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&Math.abs(point[0])<=180&&Math.abs(point[1])<=85));
}
export const yandexCoordinates=(longitude:number,latitude:number):[number,number]=>[latitude,longitude];
