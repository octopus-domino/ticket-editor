import { t } from '@/shared/i18n';
import type { RecommendedPlace } from './cityVisitPlan';

export interface CityWalkPreset { id:string; title:string; description:string; places:RecommendedPlace[] }
type StopDefinition=[string,string,number,number,string,string];
// Coordinates are checked against Photon/OSM; stories are original summaries, not guide transcripts.
const points:Record<string,StopDefinition>={
  castle:['Mikhailovsky Castle','A palace, a coup and Paul I: separate the recorded events from the ghost story.',30.3385382,59.9403826,'Михайловский_замок','castle'],
  garden:['Summer Garden',"Peter I's garden reveals how court life was staged, right down to its paths.",30.335792,59.9442874,'Летний_сад','garden'],
  mars:['Field of Mars',"A parade ground became a place of revolutionary remembrance. The city's roles keep changing.",30.3314725,59.9435329,'Марсово_поле_(Санкт-Петербург)','mars'],
  savior:['Church of the Savior on Spilled Blood','This church marks the assassination of Alexander II. Look for the political history behind the mosaics.',30.3288281,59.9400972,'Спас_на_Крови','savior'],
  rotunda:['Rotunda on Gorokhovaya','The rotunda inspired stories about secret societies. We look at the house from the street.',30.325556,59.925556,'Дом_Евментьева','rotunda'],
  rasputin:["Rasputin's former apartment","Rasputin's former home invites a discussion of evidence, gossip and the birth of a legend.",30.3309721,59.9232042,'Распутин,_Григорий_Ефимович','rasputin'],
  yusupov:['Yusupov Palace','The palace on the Moika recalls December 1916. The documents are more complicated than the legend.',30.2984788,59.9292592,'Юсуповский_дворец_на_Мойке','yusupov'],
  isaac:["Saint Isaac's Cathedral",'A monumental cathedral, engineering ambition and stories about its architect: a fitting final stop.',30.306142,59.9340785,'Исаакиевский_собор','isaac'],
  sphinx:['Sphinxes on the University Embankment','Ancient Egyptian sphinxes on a northern river: Petersburg has always enjoyed unlikely neighbours.',30.290833,59.937222,'Сфинксы_на_Университетской_набережной','sphinx'],
  pel:["Pel's Pharmacy and the Griffin Tower",'A historic pharmacy and the griffin legend: a good place to distinguish science from urban imagination.',30.2839421,59.9382943,'Аптека_доктора_Пеля','pel'],
  kunstkamera:['Kunstkamera',"Peter I's first museum turned curiosity into public education. Expect a different side of the imperial city.",30.3036769,59.9415277,'Кунсткамера','kunstkamera'],
  spit:['Spit of Vasilievsky Island','Rostral columns and the river panorama reveal how the city presented itself to the world.',30.3072541,59.9442876,'Стрелка_Васильевского_острова','spit'],
};
export function petersburgWalkPresets():CityWalkPreset[]{
  const definitions=[
    ['imperial','Imperial detective','Court intrigue, an imperial garden and the city after the empire.',['castle','garden','mars','savior']],
    ['legends','Legends of Gorokhovaya','Rasputin, secret societies and a palace where rumours became history.',['rotunda','rasputin','yusupov','isaac']],
    ['island','Secrets of Vasilievsky Island','Egyptian sphinxes, a pharmacy legend and the birth of a scientific city.',['sphinx','pel','kunstkamera','spit']],
  ] as const;
  return definitions.map(([id,title,description,keys])=>({id,title:t(title),description:t(description),places:keys.map(key=>{
    const [name,story,longitude,latitude,page,pointId]=points[key];
    return {id:`preset-spb-${pointId}`,label:t(name),description:t(story),longitude,latitude,
      url:`https://ru.wikipedia.org/wiki/${page}`,source:'curated',
      meta:{source:'curated',theme:'cultural',visit_status:'UNKNOWN'}};
  })}));
}
export function offersPetersburgWalks(longitude:number,latitude:number):boolean{
  return longitude>=29.5&&longitude<=30.8&&latitude>=59.7&&latitude<=60.2;
}
