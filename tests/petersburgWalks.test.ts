import { describe,it,expect } from 'vitest';
import { offersPetersburgWalks,petersburgWalkPresets } from '../src/features/journeys/domain/petersburgWalks';
import { LANGUAGES,setLocale } from '../src/shared/i18n';

describe('Petersburg walks',()=>{
  it('translates every title and story in the nine application languages',()=>{
    try{
      setLocale('en');const english=petersburgWalkPresets();
      for(const [language] of LANGUAGES){
        if(language==='en')continue;
        setLocale(language);const translated=petersburgWalkPresets();
        translated.forEach((walk,index)=>{
          expect(walk.title).not.toBe(english[index].title);
          expect(walk.description).not.toBe(english[index].description);
          walk.places.forEach((place,stop)=>expect(place.description).not.toBe(english[index].places[stop].description));
        });
      }
    }finally{setLocale('en');}
  });
  it('offers three ordered street walks with distinct, sourced stops inside the city',()=>{
    const walks=petersburgWalkPresets();
    expect(walks).toHaveLength(3);
    expect(new Set(walks.map(walk=>walk.id)).size).toBe(3);
    for(const walk of walks){
      expect(walk.places).toHaveLength(4);
      expect(new Set(walk.places.map(place=>place.id)).size).toBe(4);
      for(const place of walk.places){
        expect(offersPetersburgWalks(place.longitude,place.latitude)).toBe(true);
        expect(place.description!.length).toBeGreaterThan(30);
        expect(place.url).toMatch(/^https:\/\/ru.wikipedia.org\/wiki\//);
        expect(place.meta?.source).toBe('curated');
      }
    }
    expect(walks[1].places.map(place=>place.id)).toEqual(['preset-spb-rotunda','preset-spb-rasputin','preset-spb-yusupov','preset-spb-isaac']);
    expect(offersPetersburgWalks(37.617,55.75)).toBe(false);
  });
});
