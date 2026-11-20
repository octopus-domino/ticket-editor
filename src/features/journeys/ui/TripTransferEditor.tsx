import { useEffect, useRef, useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { getLocale, t } from '@/shared/i18n';
import { transferModes, type CityPoint, type TripTransfer } from '../api/tripDraft';
import { requestRoad, requestRoadVia } from '../api/routePlanner';
import { RouteMap } from './RouteMap';
import { TimeZoneSelect } from './TimeZoneSelect';

const modeLabels = {
  PLANE: 'Flight', TRAIN: 'Train', BUS: 'Bus', CAR: 'Car', FERRY: 'Ferry',
} as const;

const ignoreMapHandle = () => undefined;
const timeOptions = { disambiguation: 'reject' } as const;

export function TripTransferEditor({ date, city, destination: destinationName, pins = [], onSave }: {
  date: string; city?: string; destination?: string; pins?: { name: string; point: CityPoint }[]; onSave: (transfer: TripTransfer) => void;
}) {
  const [from, setFrom] = useState(city ?? '');
  const [to, setTo] = useState(destinationName ?? '');
  const [transport, setTransport] = useState<TripTransfer['transport']>('PLANE');
  const [departure, setDeparture] = useState('10:00');
  const [arrival, setArrival] = useState(`${date}T12:00`);
  const [fromZone, setFromZone] = useState('Europe/Moscow');
  const [toZone, setToZone] = useState('Europe/Moscow');
  const [error, setError] = useState(false);
  const [cost, setCost] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [road, setRoad] = useState<TripTransfer['road']>();
  const [via, setVia] = useState<CityPoint[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [roadError, setRoadError] = useState(false);
  const request = useRef<AbortController>();
  useEffect(() => () => request.current?.abort(), []);
  const origin = pins.find(pin => pin.name.trim().toLowerCase() === from.trim().toLowerCase())?.point;
  const destination = pins.find(pin => pin.name.trim().toLowerCase() === to.trim().toLowerCase())?.point;
  function estimateArrival() {
    if (!road) return;
    try {
      return Temporal.PlainDateTime.from(`${date}T${departure}`).toZonedDateTime(fromZone, timeOptions)
        .add({ seconds: Math.ceil(road.durationSeconds) }).withTimeZone(toZone);
    } catch {
      return undefined;
    }
  }
  const estimated = estimateArrival();
  const validBooking = !bookingUrl.trim() || (URL.canParse(bookingUrl.trim()) && /^https?:\/\//i.test(bookingUrl.trim()));
  const validCost = !cost || (Number.isFinite(Number(cost)) && Number(cost) >= 0);

  function resetRoad() {
    request.current?.abort();
    request.current = undefined;
    setBusy(false);
    setRoad(undefined);
    setRoadError(false);
  }

  async function calculateRoad() {
    if (!origin || !destination || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setRoadError(false);
    try {
      const result = via.length ? await requestRoadVia(origin, destination, via, controller.signal)
        : await requestRoad(origin, destination, 'car', controller.signal);
      if (controller.signal.aborted) return;
      setRoad({ distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds, via: via.length ? via : undefined,
        geometry: result.coordinates.map(([longitude, latitude]) => ({ longitude, latitude })) });
      setDrawing(false);
    } catch {
      if (!controller.signal.aborted) setRoadError(true);
    } finally {
      if (request.current === controller) {
        request.current = undefined;
        setBusy(false);
      }
    }
  }
  function save() {
    try {
      const start = Temporal.PlainDateTime.from(`${date}T${departure}`).toZonedDateTime(fromZone, timeOptions);
      const end = road ? estimated : Temporal.PlainDateTime.from(arrival).toZonedDateTime(toZone, timeOptions);
      if (!end || Temporal.ZonedDateTime.compare(start, end) >= 0) { setError(true); return; }
      onSave({ from: from.trim(), to: to.trim(), transport,
        departure: start.toString({ timeZoneName: 'never' }), arrival: end.toString({ timeZoneName: 'never' }),
        arrivalZone: toZone, road,
        cost: cost ? { amount: Number(cost), currency: 'RUB' } : undefined, bookingUrl: bookingUrl.trim() || undefined });
      setError(false);
    } catch {
      setError(true);
    }
  }
  return <>
    <div className="trip-transport-options" role="group" aria-label={t('Transport type')}>
      {transferModes.map(mode => <button key={mode} type="button" aria-pressed={transport === mode}
        onClick={() => { resetRoad(); setVia([]); setDrawing(false); setTransport(mode); }}>
        {t(modeLabels[mode])}
      </button>)}
    </div>
    <fieldset>
      <legend>{t('Departure')}</legend>
      <label>{t('City')} <input maxLength={180} value={from} onChange={event => { resetRoad(); setFrom(event.target.value); }} /></label>
      <input type="time" aria-label={t('Departure')} value={departure} onChange={event => setDeparture(event.target.value)} />
      <TimeZoneSelect value={fromZone} onChange={setFromZone} />
    </fieldset>
    <fieldset>
      <legend>{t('Arrival')}</legend>
      <label>{t('City')} <input maxLength={180} value={to} onChange={event => { resetRoad(); setTo(event.target.value); }} /></label>
      <input type="datetime-local" aria-label={t('Arrival')}
        value={road ? estimated?.toPlainDateTime().toString({ smallestUnit: 'second' }) ?? '' : arrival}
        disabled={!!road} onChange={event => setArrival(event.target.value)} />
      <TimeZoneSelect value={toZone} onChange={setToZone} />
    </fieldset>
    {transport === 'CAR' && origin && destination && <button type="button" disabled={busy}
      onClick={() => void calculateRoad()}>{t('Road distance')}</button>}
    {transport === 'CAR' && origin && destination && <>
      <button type="button" aria-pressed={drawing} disabled={busy} onClick={() => setDrawing(!drawing)}>
        {t('Add intermediate points')}
      </button>
      {via.length > 0 && <button type="button" onClick={() => { resetRoad(); setVia(via.slice(0, -1)); }}>{t('Undo')}</button>}
    </>}
    {transport === 'CAR' && pins.length >= 2 && <>
      <p>{t('Select departure and arrival cities on the map.')}</p>
      <RouteMap stops={pins.map(({ point, name }, index) => ({ ...point, id: String(index), label: name,
        zone: 'UTC', stayMinutes: 0 }))}
        legs={road ? [{ mode: 'car', durationSeconds: road.durationSeconds,
          coordinates: road.geometry.map(point => [point.longitude, point.latitude]) }]
          : origin && destination && via.length ? [{ mode: 'transfer',
            coordinates: [origin, ...via, destination].map(point => [point.longitude, point.latitude]) }] : []}
        fit={!drawing}
        onPick={drawing && via.length < 5 ? point => { resetRoad(); setVia([...via, point]); } : undefined}
        onStopSelect={id => {
          const name = pins[Number(id)].name;
          resetRoad();
          if (!from || to || name === from) { setFrom(name); setTo(''); setVia([]); setDrawing(false); }
          else setTo(name);
        }} onReady={ignoreMapHandle} cityMap />
    </>}
    {road && <>
      <p>{t('Road distance')} · {new Intl.NumberFormat(getLocale(), { style: 'unit', unit: 'kilometer',
        maximumFractionDigits: 1 }).format(road.distanceMeters / 1000)} · {
        new Intl.NumberFormat(getLocale(), { style: 'unit', unit: 'minute',
          maximumFractionDigits: 0 }).format(road.durationSeconds / 60)}</p>
    </>}
    {roadError && <p role="alert">{t('The road route could not be calculated. Try closer stops or retry later.')}</p>}
    <label>{t('Transfer cost')} <input type="number" min="0" step="0.01" value={cost}
      onChange={event => setCost(event.target.value)} /> RUB</label>
    <label>{t('Booking link')} <input type="url" maxLength={2048} value={bookingUrl}
      onChange={event => setBookingUrl(event.target.value)} /></label>
    <button type="button" disabled={busy || !from.trim() || !to.trim() || !departure || (!road && (!arrival || via.length > 0))
      || !validBooking || !validCost || from.trim().toLowerCase() === to.trim().toLowerCase()} onClick={save}>{t('Save transfer')}</button>
    {error && <p role="alert">{t('Check transfer dates, times and time zones.')}</p>}
  </>;
}
