import { useEffect, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';
import type { RouteStop } from '../domain/routeTimeline';
import type { PlannedLeg, RoutePhoto } from '../domain/route';
import { cityVisitPlan, nearestPlaces, type CityVisit, type RecommendedPlace } from '../domain/cityVisitPlan';
import { RouteWalk, type RouteWalkHandle } from './RouteWalk';
import { RouteAddressInput, type RouteAddress } from './RouteAddressInput';
import { placePhotos } from '../api/placePhotos';
import { timedCityWalk } from '../domain/timedCityWalk';

export function RoutePlacePanel({ stop, onNotes, onAdd, onWalkChange, onWalkBusy, visitDate }: {
  stop: RouteStop; onNotes: (notes: string) => void; onAdd: (address: RouteAddress) => void;
  onWalkChange: (id?: string) => void; onWalkBusy: (busy: boolean) => void; visitDate: string;
}) {
  const [kind, setKind] = useState<'hotels' | 'attractions'>('attractions');
  const [theme,setTheme]=useState(''),[visitTime,setVisitTime]=useState('09:00');
  const [places, setPlaces] = useState<RecommendedPlace[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [date, setDate] = useState(visitDate);
  const [source, setSource] = useState('OpenStreetMap');
  const [expanded, setExpanded] = useState(false);
  const [visits, setVisits] = useState<CityVisit[]>([]);
  const [skipped, setSkipped] = useState<RecommendedPlace[]>([]);
  const [describing,setDescribing]=useState('');
  const [, setLegs] = useState<PlannedLeg[]>([]);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(false);
  const walkBusyCallback = useRef(onWalkBusy); walkBusyCallback.current = onWalkBusy;
  const walk = useRef<RouteWalkHandle>(null);
  useEffect(() => {
    setBusy(false);
    setPlaces([]); setSelected([]); setAvailable(null); setVisits([]); setLegs([]); setSkipped([]); setError('');
    return () => { controller.current?.abort(); active.current = false; walkBusyCallback.current(false); };
  }, [stop.longitude, stop.latitude]);
  useEffect(() => { if (visitDate) setDate(visitDate); }, [visitDate]);
  const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:stop.zone}).format(new Date());
  const discover = (kind: string, signal: AbortSignal) => {
    const query=new URLSearchParams({longitude:String(stop.longitude),latitude:String(stop.latitude),kind,language:getLocale()});
    if(theme&&kind==='attractions'){
      query.set('theme',theme);query.set('maxStops','7');query.set('visitTime',`${date||visitDate||today()}T${visitTime}`);
    }
    return journeyRequest<{ available: boolean; places: RecommendedPlace[]; source?: string }>(
      `/api/journeys/routes/places${theme&&kind==='attractions'?'/themed':''}?${query}`, { signal });
  };
  const photosFor = (candidates:RecommendedPlace[],stops:RouteStop[],signal:AbortSignal):Promise<RoutePhoto[]> => theme
    ? journeyRequest<RoutePhoto[]>(`/api/journeys/routes/places/themed/enrich?language=${getLocale()}`,{method:'POST',signal,body:JSON.stringify(stops)}).catch(()=>[])
    : placePhotos(candidates.map((place,index)=>({...place,stopId:stops[index].id})),signal);
  const search = async () => {
    setKind('hotels');
    if (active.current) return;
    active.current = true; setBusy(true); onWalkBusy(true); setError(''); setVisits([]); setLegs([]); setSkipped([]); setPlaces([]); setSelected([]);
    const abort = new AbortController(); controller.current = abort;
    try {
      const result = await discover('hotels', abort.signal);
      if (!abort.signal.aborted) { setAvailable(result.available); setPlaces(result.places); setSelected(result.places.slice(0, theme?7:4).map(place => place.id)); setSource(result.source ?? 'OpenStreetMap'); }
    } catch (reason) { if (!abort.signal.aborted) setError((reason as Error).message); }
    finally { if (!abort.signal.aborted) { active.current = false; setBusy(false); onWalkBusy(false); } }
  };
  const descriptions = async (items:RecommendedPlace[],signal:AbortSignal) => Promise.all(items.map(async place=>{
    if(!place.id.startsWith('wikimapia-')||place.description)return place;
    try{const info=await journeyRequest<{description:string}>(`/api/journeys/routes/places/${place.id}?language=${getLocale()}`,{signal});return {...place,description:info.description};}
    catch{return place;}
  }));
  const autoWalk = async (selection?:RecommendedPlace[]) => {
    if (active.current) return;
    active.current = true; setBusy(true); onWalkBusy(true); setError('');
    const abort = new AbortController(); controller.current = abort;
    try {
      const result = selection ? {available:true,places:selection,source} : await discover('attractions', abort.signal);
      if (abort.signal.aborted) return;
      setAvailable(result.available); setPlaces(result.places); setSource(result.source ?? 'OpenStreetMap'); setKind('attractions');
      const candidates = await descriptions(nearestPlaces(stop, result.places).slice(0, theme?10:selection?5:4),abort.signal);
      setSelected(candidates.map(place => place.id));
      if (!candidates.length) { setError(t('No nearby places found.')); return; }
      const added: RouteStop[] = candidates.map(place => ({
        id: crypto.randomUUID(), label: place.label, longitude: place.longitude, latitude: place.latitude,
        zone: stop.zone, confirmed: true, stayMinutes: 60,
        description: [place.description?.slice(0,350),place.url].filter(Boolean).join('\n').slice(0,500),
        ...(place.meta?{meta:place.meta}:{}),
      }));
      added.push({ ...stop, id: crypto.randomUUID(), stayMinutes: 0, description: t('Return to the starting point after the walk.') });
      const roads: PlannedLeg[] = [];
      let current = stop;
      for (const next of added) {
        const road = await journeyRequest<PlannedLeg>('/api/journeys/routes/road', { method: 'POST', signal: abort.signal,
          body: JSON.stringify({ start: { longitude: current.longitude, latitude: current.latitude }, end: { longitude: next.longitude, latitude: next.latitude }, mode: 'foot' }) });
        roads.push({ ...road, mode: 'foot' }); current = next;
      }
      const origin = { ...stop, walkId: undefined, stayMinutes: 0 };
      const photos = await photosFor(candidates,added.slice(0,candidates.length),abort.signal);
      for(const photo of photos){const point=added.find(item=>item.id===photo.stopId);if(point?.meta)point.meta={...point.meta,photo_image_id:photo.imageId};}
      if (!abort.signal.aborted) await walk.current?.save([origin, ...added], roads, `${date || visitDate || today()}T${theme?visitTime:'09:00'}`, abort.signal, photos);
    } catch (reason) { if (!abort.signal.aborted) setError((reason as Error).message); }
    finally { if (!abort.signal.aborted) { active.current = false; setBusy(false); onWalkBusy(false); } }
  };
  const plan = async () => {
    if (active.current || !date) return;
    active.current = true; setBusy(true); onWalkBusy(true); setError(''); setVisits([]); setLegs([]); setSkipped([]);
    const abort = new AbortController(); controller.current = abort;
    try {
      const ordered = await descriptions(nearestPlaces(stop, places.filter(place => selected.includes(place.id))),abort.signal);
      const accepted: CityVisit[] = [], omitted: RecommendedPlace[] = [], roads: PlannedLeg[] = [];
      let current: Pick<RouteStop, 'longitude' | 'latitude'> = stop, clock = 9 * 60;
      for (const place of ordered) {
        const road = await journeyRequest<PlannedLeg>('/api/journeys/routes/road', { method: 'POST', signal: abort.signal,
          body: JSON.stringify({ start: { longitude: current.longitude, latitude: current.latitude }, end: { longitude: place.longitude, latitude: place.latitude }, mode: 'foot' }) });
        const result = cityVisitPlan([place], date, [road.durationSeconds], clock);
        if (!result.visits.length) { omitted.push(place); continue; }
        accepted.push(result.visits[0]); roads.push({ ...road, mode: 'foot' }); current = place;
        const end = result.visits[0].end.slice(11).split(':').map(Number); clock = end[0] * 60 + end[1];
      }
      if (!abort.signal.aborted) {
        setVisits(accepted); setSkipped(omitted);
        if (!accepted.length) return;
        const back = await journeyRequest<PlannedLeg>('/api/journeys/routes/road', { method: 'POST', signal: abort.signal,
          body: JSON.stringify({ start: { longitude: current.longitude, latitude: current.latitude }, end: { longitude: stop.longitude, latitude: stop.latitude }, mode: 'foot' }) });
        roads.push({ ...back, mode: 'foot' });
        const timed = timedCityWalk(stop, accepted, roads, date);
        const photos = await placePhotos(accepted.map((visit, index) => ({ ...visit.place, stopId: timed.stops[index + 1].id })), abort.signal);
        await walk.current?.save(timed.stops, roads, timed.startLocal, abort.signal, photos, timed.timeline);
      }
    } catch (reason) { if (!abort.signal.aborted) setError((reason as Error).message === 'journey.route.walk-too-long' ? t('This walk is too long for one day. Choose fewer or closer places.') : (reason as Error).message); }
    finally { if (!abort.signal.aborted) { active.current = false; setBusy(false); onWalkBusy(false); } }
  };
  return <details className="route-place-panel" onToggle={event => {
    if (event.target !== event.currentTarget) return;
    const opened = event.currentTarget.open; setExpanded(opened);
    if (opened) document.querySelectorAll<HTMLDetailsElement>('.route-place-panel[open]').forEach(panel => { if (panel !== event.currentTarget) panel.open = false; });
    else if (active.current) { controller.current?.abort(); active.current = false; setBusy(false); onWalkBusy(false); }
  }}>
    <summary>{t('Private itineraries')}</summary>
    <p>{t('This walk has a separate map and its own pages in the trip PDF.')}</p>
    <fieldset disabled={busy} className="route-inputs">
      <label>{t('Walk theme')}<select aria-label={t('Walk theme')} value={theme} onChange={event=>{setTheme(event.target.value);setPlaces([]);setSelected([]);setVisits([]);setSkipped([]);setVisitTime(event.target.value==='bars'?'20:00':'09:00');}}>
        <option value="">{t('Any theme')}</option><option value="bars">{t('Bars and pubs')}</option><option value="mystic">{t('Mysteries and legends')}</option>
        <option value="religious">{t('Religious places')}</option><option value="cultural">{t('Culture and art')}</option>
      </select></label>
      {theme&&<><label>{t('Visit date')}<input type="date" value={date} onChange={event=>{setDate(event.target.value);setPlaces([]);setSelected([]);}} /></label>
        <label>{t('Visit time')}<input type="time" value={visitTime} onChange={event=>{setVisitTime(event.target.value);setPlaces([]);setSelected([]);}} /></label>
        <small>{t('Opening hours are a guide. Closed places remain in the results.')}</small></>}
    </fieldset>
    <button type="button" className="journey-primary" disabled={busy || (kind==='attractions' && places.length>0 && selected.length===0)} onClick={() => void autoWalk(kind==='attractions' && places.length>0 ? places.filter(place=>selected.includes(place.id)) : undefined)}>{t('Generate a walking map')}</button>
    <p>{theme?t('Discover quieter places and local stories, then create a separate walking map.'):t('Find up to four nearby sights, connect them by walking roads and return to this point. Allow one hour per visit. Check opening hours before travelling.')}</p>

    <details><summary>{t('Hotels')}</summary>
    <div className="route-actions">
      <a href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(stop.label)}`} target="_blank" rel="noopener noreferrer">Booking.com ↗</a>
      <a href="https://ostrovok.ru/" target="_blank" rel="noopener noreferrer">{t('Ostrovok')} ↗</a>
      <a href={`https://2gis.ru/search/${encodeURIComponent(`${stop.label} достопримечательности`)}`} target="_blank" rel="noopener noreferrer">2GIS ↗</a>
    </div>
    <p>{t('Find a hotel, then select its address below to add it as a stop. Prices and booking remain on the hotel service.')}</p>
    <RouteAddressInput value="" onSelect={onAdd} />
    <button type="button" className="journey-secondary" disabled={busy} onClick={() => void search()}>{t('Find nearby places')}</button>
    </details>
    <fieldset disabled={busy} className="route-inputs">
      {available === false && <p role="status">{t('Nearby recommendations require the administrator to connect 2GIS. You can use the search links above now.')}</p>}
      {available === true && !places.length && <p>{t('No nearby places found.')}</p>}
      <ul className="route-place-results">{places.map(place => <li key={place.id}>
        {kind === 'attractions' && <input type="checkbox" aria-label={place.label} checked={selected.includes(place.id)} disabled={!selected.includes(place.id) && selected.length >= (theme?10:5)}
          onChange={event => { setSelected(ids => event.target.checked ? [...ids, place.id] : ids.filter(id => id !== place.id)); setVisits([]); setLegs([]); setSkipped([]); }} />}
        <a href={place.url} target="_blank" rel="noopener noreferrer">{place.label} ↗</a>
        {place.openingHours && <small>{place.openingHours}</small>}
        {place.source==='wikimapia'&&place.inOsm===false&&<small>{t('Community place')}</small>}
        {place.visitStatus==='CLOSED'&&<small>{t('Closed according to OSM')}</small>}
        {place.visitStatus==='UNKNOWN'&&<small>{t('Opening hours not provided')}</small>}
        {place.description && <details><summary>{t('About this place')}</summary><p>{place.description}</p></details>}
        {kind === 'attractions' && place.id.startsWith('wikimapia-') && !place.description && <button type="button" disabled={describing===place.id} onClick={async()=>{
          setDescribing(place.id);const [detailed]=await descriptions([place],new AbortController().signal);setPlaces(items=>items.map(item=>item.id===place.id?detailed:item));setDescribing('');
        }}>{t('About this place')}</button>}
        {kind === 'hotels' && <button type="button" className="journey-secondary" onClick={() => onAdd(place)}>{t('Add stop')}</button>}
      </li>)}</ul>
      {kind === 'attractions' && selected.length > 0 && <>
        {!theme&&<details><summary>{t('Plan this day')}</summary><label>{t('Visit date')}<input type="date" value={date} onChange={event => { setDate(event.target.value); setVisits([]); setLegs([]); setSkipped([]); }} /></label>
          <p>{t('The day plan uses walking routes and published opening hours, with one hour per visit between 09:00 and 21:00. Places without reliable hours remain outside the timed plan. Check holiday hours before travelling.')}</p>
          <button type="button" className="journey-secondary" disabled={!date} onClick={() => void plan()}>{t('Plan this day')}</button></details>}
      </>}
    </fieldset>
    {visits.length > 0 && <>
      <ol>{visits.map(visit => <li key={visit.place.id}>{visit.start.slice(11)}–{visit.end.slice(11)} · {visit.place.label}</li>)}</ol>
      <button type="button" className="journey-secondary" disabled={busy} onClick={() => onNotes(`${date}\n${visits.map(visit => `${visit.start.slice(11)}–${visit.end.slice(11)} ${visit.place.label}`).join('\n')}`)}>{t('Add day plan to notes')}</button>
    </>}
    {skipped.length > 0 && <p>{t('Not scheduled: missing opening hours or not enough time.')} {skipped.map(place => place.label).join(', ')}</p>}
    {busy && <p role="status">{t('Calculating the route…')}</p>}
    {error && <p role="alert">{error}</p>}
    {expanded && <RouteWalk ref={walk} value={stop.walkId} onChange={onWalkChange} />}
    {places.length > 0 && <small><a href={source==='Wikimapia'?'https://wikimapia.org/':source==='2GIS'?'https://2gis.ru/':'https://www.openstreetmap.org/copyright'} target="_blank" rel="noopener noreferrer">{source}</a></small>}
  </details>;
}
