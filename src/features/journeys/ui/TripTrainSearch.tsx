import { useEffect, useRef, useState } from 'react';
import { t } from '@/shared/i18n';
import { searchRailPlaces, searchRailSchedule } from '../api/tripRail';
import type { TripTrain } from '../api/tripDraft';

type RailPlace = Awaited<ReturnType<typeof searchRailPlaces>>[number];
type Schedule = Awaited<ReturnType<typeof searchRailSchedule>>;

const code = /^[cs][0-9]{1,12}$/;

function RailInput({ label, input, place, onChange }: {
  label: string; input: string; place?: RailPlace; onChange: (value: string, place?: RailPlace) => void;
}) {
  const [results, setResults] = useState<{ query: string; items: RailPlace[] }>();
  useEffect(() => {
    const query = input.trim();
    if (code.test(query) || query.length < 2) return;
    const request = new AbortController();
    const timeout = window.setTimeout(() => {
      void searchRailPlaces(query, request.signal).then(
        items => { if (!request.signal.aborted) setResults({ query, items }); },
        () => { if (!request.signal.aborted) setResults({ query, items: [] }); },
      );
    }, 500);
    return () => { window.clearTimeout(timeout); request.abort(); };
  }, [input]);
  return <div>
    <label>{label} <input maxLength={100} value={place?.title ?? input}
      onChange={event => onChange(event.target.value)} /></label>
    {results && results.query === input.trim() && results.items.length > 0 && <ul>
      {results.items.map(place => <li key={place.code}>
        <button type="button" onClick={() => onChange(place.code, place)}>
          {place.title}{place.region && ` · ${place.region}`}
        </button>
      </li>)}
    </ul>}
  </div>;
}

export function TripTrainSearch({ date, selected, onSelect }: {
  date: string;
  selected?: TripTrain;
  onSelect: (value?: TripTrain) => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fromPlace, setFromPlace] = useState<RailPlace>();
  const [toPlace, setToPlace] = useState<RailPlace>();
  const [result, setResult] = useState<Schedule>();
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);
  const origin = from.trim().toLowerCase(), destination = to.trim().toLowerCase();
  const valid = code.test(origin) && code.test(destination) && origin !== destination;

  function clear() {
    request.current?.abort();
    request.current = undefined;
    setLoading(false);
    setResult(undefined);
  }

  async function search() {
    if (!valid || !date || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setResult(undefined);
    try {
      const schedule = await searchRailSchedule(origin, destination, date, controller.signal);
      if (!controller.signal.aborted) setResult(schedule);
    } catch {
      if (!controller.signal.aborted) setResult({ available: false, stale: false, trains: [] });
    } finally {
      if (request.current === controller) {
        request.current = undefined;
        setLoading(false);
      }
    }
  }

  return <details>
    <summary>{t('Train timetable')}</summary>
    {selected && <p>
      <strong>{selected.number} {selected.title}</strong>{' '}
      <time dateTime={selected.departure}>{selected.departure.replace('T', ' ')}</time>{' '}
      <button type="button" onClick={() => onSelect()}>{t('Remove')}</button>
    </p>}
    <RailInput label={t('Departure city or station')} input={from} place={fromPlace}
      onChange={(value, place) => { clear(); setFrom(value); setFromPlace(place); }} />
    <RailInput label={t('Arrival city or station')} input={to} place={toPlace}
      onChange={(value, place) => { clear(); setTo(value); setToPlace(place); }} />
    <button type="button" disabled={!date || !valid || loading} onClick={() => void search()}>{t('Search')}</button>
    {loading && <p role="status">{t('Loading…')}</p>}
    {result && <div>
      {!result.available && <p role="status">{t('Train timetable unavailable.')}</p>}
      {result.stale && <p role="status">{t('Showing a saved timetable. Times may have changed.')}</p>}
      {result.available && result.trains.length === 0 && <p role="status">{t('No direct trains found.')}</p>}
      {result.trains.length > 0 && <ul>{result.trains.map((train, index) => (
        <li key={index}><strong>{train.number} {train.title}</strong><p>
          {train.from} <time dateTime={train.departure}>{train.departure.replace('T', ' ')}</time>
          {' → '}{train.to} <time dateTime={train.arrival}>{train.arrival.replace('T', ' ')}</time>
        </p><button type="button" onClick={() => onSelect({
          ...train,
          fromCity: fromPlace?.code.startsWith('c') ? fromPlace.title : fromPlace?.region,
          toCity: toPlace?.code.startsWith('c') ? toPlace.title : toPlace?.region,
        })}>{t('Select')}</button></li>
      ))}</ul>}
      <a href="https://rasp.yandex.ru/" target="_blank" rel="noreferrer">Яндекс Расписания</a>
    </div>}
  </details>;
}
