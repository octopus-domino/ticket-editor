import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import timezone from 'tz-lookup';
import { getLocale, LANGUAGES, t, type Locale } from '@/shared/i18n';
import { journeyApi, journeyRequest, managementUrl, pdfUrl, publicUrl, rememberKey } from '../api/journeys';
import type { CreatedJourney, JourneyDefinition } from '../domain/definitions';
import { JourneyCard } from './JourneyCard';
import { JourneyShare } from './JourneyShare';
import { JourneyConstructorButton } from './JourneyConstructorButton';
import { RouteAddressInput } from './RouteAddressInput';
import type { RouteMapHandle } from './RouteMap';
import './album.css';
import './route.css';
import { JourneyBackgroundPicker } from './JourneyBackgroundPicker';
const RouteMap = lazy(() => import('./RouteMap').then(module => ({ default: module.RouteMap })));
const AGES = [['child', 'Child'], ['teen', 'Teenager'], ['youth', 'Young adult'], ['middle', 'Middle age'], ['older', 'Older adult']] as const;
interface Region { latitude: number; longitude: number; zone: string; label: string }
interface Prepared { id: string; bundle: { language: string; cards: { date: string; author: string; sourceUrl: string }[] }; weatherSource: string; weatherLicense: string }

export default function PoetryWizard({ definition, custom = false, previewOnly = false }: { definition: JourneyDefinition; custom?: boolean; previewOnly?: boolean }) {
  const [language, setLanguage] = useState<Locale>(getLocale), [mood, setMood] = useState('heartfelt'), [audience, setAudience] = useState('middle');
  const [region, setRegion] = useState<Region | null>(null), [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [regionEdited, setRegionEdited] = useState(false);
  const [title, setTitle] = useState(t('Seven days of poetry')), [fields, setFields] = useState<Record<string,string>>({});
  const [prepared, setPrepared] = useState<Prepared | null>(null), [created, setCreated] = useState<CreatedJourney | null>(null);
  const [busy, setBusy] = useState(false), [locating, setLocating] = useState(false), [error, setError] = useState(''), [mapOpen, setMapOpen] = useState(false);
  const running = useRef(false), map = useRef<RouteMapHandle | null>(null), abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const chooseRegion = (point: { latitude: number; longitude: number }, label: string) => {
    setRegion({ latitude: Math.round(point.latitude * 100) / 100, longitude: Math.round(point.longitude * 100) / 100,
      zone: timezone(point.latitude, point.longitude), label });
    setRegionEdited(false);
    setPrepared(null); setCreated(null); setError('');
  };
  const locate = () => {
    setLocating(true); setError('');
    if (!navigator.geolocation) { setError(t('Choose your region manually. Location is unavailable.')); setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(position => {
      chooseRegion(position.coords, t('Your location')); setLocating(false);
    }, () => { setError(t('Choose your region manually. Location is unavailable.')); setLocating(false); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  };
  const prepare = async () => {
    if (running.current || !region || regionEdited) return;
    running.current = true; setBusy(true); setError(''); setPrepared(null); setCreated(null);
    const controller = new AbortController(); abort.current = controller;
    try {
      const result = await journeyRequest<Prepared>('/api/journeys/poetry', { method: 'POST', signal: controller.signal,
        body: JSON.stringify({ latitude: region.latitude, longitude: region.longitude, zone: region.zone, language, mood, audience, seed: crypto.randomUUID() }) });
      if (!controller.signal.aborted) setPrepared(result);
    } catch (reason) { if (!controller.signal.aborted) setError((reason as Error).message); }
    finally { running.current = false; setBusy(false); }
  };
  const data = { ...fields, poetry: prepared?.id ?? '', locale: language, theme: definition.theme, ...(custom ? { site: definition.slug } : {}) };
  const publish = async () => {
    if (running.current || !prepared || previewOnly) return;
    running.current = true; setBusy(true); setError('');
    try {
      const [result] = await journeyApi.create('POETRY', title, data, []);
      rememberKey(result.document.id, result.managementKey);
      if (result.batchId) rememberKey(`batch:${result.batchId}`, result.managementKey);
      setCreated(result);
    } catch (reason) { setError((reason as Error).message); }
    finally { running.current = false; setBusy(false); }
  };
  return <main className="journey-main poetry-wizard">
    <h1>{definition.title}</h1><p>{definition.description}</p>
    {!created && <JourneyBackgroundPicker value={fields} onBusyChange={setBusy} onChange={patch => setFields(value => ({...value,...patch}))} />}
    <form onSubmit={event => { event.preventDefault(); void prepare(); }}>
      <fieldset disabled={busy || Boolean(created)} className="poetry-preferences">
        <label>{t('Poem language')}<select aria-label={t('Poem language')} value={language} onChange={event => { setLanguage(event.target.value as Locale); setPrepared(null); }}>
          {LANGUAGES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select></label>
        <label>{t('Mood')}<select aria-label={t('Mood')} value={mood} onChange={event => { setMood(event.target.value); setPrepared(null); }}>
          <option value="heartfelt">{t('Warm and heartfelt')}</option><option value="funny">{t('Cheerful and funny')}</option>
        </select></label>
        <label>{t('Who are these cards for?')}<select aria-label={t('Who are these cards for?')} value={audience} onChange={event => { setAudience(event.target.value); setPrepared(null); }}>
          {AGES.map(([code, label]) => <option key={code} value={code}>{t(label)}</option>)}
        </select></label>
        <section className="poetry-region">
          <h2>{t('Your region')}</h2>
          <p>{t('We use the local forecast to choose the mood of the poems. The cards are about life, not weather reports.')}</p>
          <button type="button" disabled={locating} onClick={locate}>{t(locating ? 'Finding your location…' : 'Use my location')}</button>
          <RouteAddressInput value={region?.label ?? ''} onSelect={selected => chooseRegion(selected, selected.label)} onEditing={edited => { setRegionEdited(edited); if (edited) setPrepared(null); }} />
          {region && !regionEdited && <p role="status">{region.label}</p>}
          <details onToggle={event => setMapOpen(event.currentTarget.open)}><summary>{t('Choose region on map')}</summary>
            {mapOpen && <Suspense fallback={<p>{t('Loading…')}</p>}>
              <RouteMap stops={[]} legs={[]} onReady={handle => { map.current = handle; }} onPick={setPoint} pickedPoint={point} />
              <div className="route-actions"><button type="button" onClick={() => { const center = map.current?.center(); if (center) setPoint(center); }}>{t('Use map center')}</button>
                <button type="button" disabled={!point} onClick={() => { if (point) chooseRegion(point, t('Selected region')); }}>{t('Confirm region')}</button></div>
            </Suspense>}
          </details>
        </section>
        {custom && definition.fields.map(field => <label key={field.name}>{field.label}
          {field.type === 'textarea' ? <textarea maxLength={4000} required={field.required} value={fields[field.name] ?? ''} onChange={event => setFields({ ...fields, [field.name]: event.target.value })} /> :
            <input type={field.type === 'date' || field.type === 'time' ? field.type : 'text'} required={field.required} maxLength={500} value={fields[field.name] ?? ''} onChange={event => setFields({ ...fields, [field.name]: event.target.value })} />}
        </label>)}
        <button type="submit" disabled={!region || regionEdited || locating}>{t(prepared ? 'Choose another seven poems' : 'Choose poems for seven days')}</button>
      </fieldset>
    </form>
    <details><summary>{t('How the poems are chosen')}</summary><p>{t('Real texts come from Wikisource, with authors and source links. Age affects themes and length; weather helps choose the mood. Preview the cards before sharing.')}</p></details>
    {busy && <div role="status"><p>{t(prepared ? 'Saving cards…' : 'Looking for poems that feel right…')}</p>{!prepared && <button type="button" onClick={() => abort.current?.abort()}>{t('Cancel')}</button>}</div>}
    {error && <p role="alert">{error}</p>}
    {prepared && !created && <section>
      <h2>{t('Your seven cards')}</h2>
      <JourneyCard document={{ kind: 'POETRY', title, data }} />
      <label>{t('Collection title')}<input maxLength={120} value={title} onChange={event => setTitle(event.target.value)} /></label>
      <button type="button" disabled={busy || previewOnly || !title.trim()} onClick={() => void publish()}>{t('Save cards and get PDF')}</button>
      <small><a href={prepared.weatherSource} target="_blank" rel="noopener noreferrer">MET Norway</a> · <a href={prepared.weatherLicense} target="_blank" rel="noopener noreferrer">CC BY 4.0</a></small>
    </section>}
    {created && <section className="journey-results"><h2>{t('Your seven cards')}</h2>
      <a className="journey-primary" href={pdfUrl(created.document.id)}>{t('Download all seven cards (PDF)')}</a>
      <JourneyShare url={publicUrl(created.document.id)} title={title} />
      <JourneyConstructorButton id={created.document.id} />
      <a href={managementUrl(created.document.id, created.managementKey)}>{t('Manage')}</a>
      <Link to={`/d/${created.document.id}`}>{t('Open')}</Link>
      <button type="button" onClick={() => { setCreated(null); setPrepared(null); }}>{t('Create another collection')}</button>
    </section>}
  </main>;
}
