import { describe,it,expect } from 'vitest';
import { validScene,yandexCoordinates } from '../src/features/journeys/yandex/protocol';

describe('Yandex map protocol',()=>{
  const scene={center:[37.6,55.7],points:[{id:'one',label:'Place',longitude:37.6,latitude:55.7}],stops:[],legs:[]};
  it('converts longitude/latitude to the SDK latitude/longitude order',()=>{
    expect(yandexCoordinates(37.6,55.7)).toEqual([55.7,37.6]);
  });
  it('accepts bounded scenes and rejects invalid coordinates and excessive payloads',()=>{
    expect(validScene(scene)).toBe(true);
    expect(validScene({...scene,center:[Infinity,55]})).toBe(false);
    expect(validScene({...scene,points:Array(65).fill(scene.points[0])})).toBe(false);
    expect(validScene({...scene,points:[{...scene.points[0],latitude:95}]})).toBe(false);
    expect(validScene({...scene,legs:[{mode:'foot',coordinates:Array(2501).fill([37,55])}]})).toBe(false);
    expect(validScene({...scene,legs:[null]})).toBe(false);
    expect(validScene({...scene,pickedPoint:{longitude:NaN,latitude:55}})).toBe(false);
  });
});

