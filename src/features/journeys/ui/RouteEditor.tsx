import { lazy, Suspense, useEffect, useImperativeHandle, forwardRef, useRef, useState } from 'react';
import timezone from 'tz-lookup';
import { getLocale, t } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';
import { journeyError } from '../api/errorMessage';
import {
  type RouteStop,
  type RouteLeg,
  type TimelineRow,
} from '../domain/routeTimeline';
import type { PlannedLeg, RouteSnapshot } from '../domain/route';
import { planRoute } from '../api/routePlanner';
import { reorderRoute } from '../domain/reorderRoute';
import { RouteReorderHandle } from './RouteReorderHandle';
import { TimeZoneSelect } from './TimeZoneSelect';
import { RouteAddressInput, type RouteAddress } from './RouteAddressInput';
import type { RouteMapHandle } from './RouteMap';
import './route.css';
import { RoutePlacePanel } from './RoutePlacePanel';
import { routePointCaption } from './routePointCaption';
import { YandexPlaceMap } from '../yandex/YandexPlaceMap';

const RouteMap = lazy(() => import('./RouteMap').then((module) => ({ default: module.RouteMap })));
const emptyStop = (): RouteStop => ({
  id: crypto.randomUUID(),
  label: '',
  latitude: 55.75,
  longitude: 37.62,
  zone: 'Europe/Moscow',
  stayMinutes: 0,
});
const emptyLeg = (): PlannedLeg => ({
  mode: 'car',
  durationSeconds: 0,
  coordinates: [],
  beforeMinutes: 120,
  afterMinutes: 45,
});
export interface RouteEditorHandle { prepare(): Promise<string> }
export const RouteEditor = forwardRef<RouteEditorHandle, { value: string; onChange: (id: string) => void; onBusyChange: (busy: boolean) => void }>(function RouteEditor({
  value,
  onChange,
  onBusyChange,
}, ref) {
  const [stops, setStops] = useState<RouteStop[]>(() => [emptyStop(), emptyStop()]);
  const [legs, setLegs] = useState<PlannedLeg[]>([emptyLeg()]);
  const [start, setStart] = useState('');
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [dirty, setDirty] = useState(false);
  const [pickingStop, setPickingStop] = useState<string | null>(null);
  const [pickedPoint, setPickedPoint] = useState<{ longitude: number; latitude: number } | null>(null);
  const [pointName, setPointName] = useState('');
  const pickPanel = useRef<HTMLDivElement>(null);
  const map = useRef<RouteMapHandle | null>(null);
  const [yandexActive,setYandexActive]=useState(false);
  const yandexCenter=useRef<{longitude:number;latitude:number}|null>(null);
  const loaded = useRef('');
  const running = useRef<Promise<string> | null>(null);
  const busyRef = useRef(false);
  const callbacks = useRef({ onChange, onBusyChange });
  callbacks.current = { onChange, onBusyChange };
  useEffect(() => {
    if (!value || value === loaded.current) return;
    const controller = new AbortController();
    void journeyRequest<RouteSnapshot>(`/api/journeys/routes/${encodeURIComponent(value)}`, {
      signal: controller.signal,
    })
      .then((snapshot) => {
        if (controller.signal.aborted) return;
        loaded.current = value;
        setStops(snapshot.stops);
        setLegs(snapshot.legs);
        setStart(snapshot.startLocal);
        setRows(snapshot.timeline);
        setDirty(false);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError((reason as Error).message);
      });
    return () => controller.abort();
  }, [value]);
  const invalidate = () => {
    setDirty(true);
    setRows([]);
    setError('');
  };
  const address = (index: number, selected: RouteAddress) => {
    setPickingStop(null); setPickedPoint(null);
    invalidate();
    setStops((items) =>
      items.map((stop, i) =>
        i === index
          ? { ...stop, ...selected, walkId: undefined, confirmed: true, zone: timezone(selected.latitude, selected.longitude) }
          : stop,
      ),
    );
    setLegs((items) =>
      items.map((leg, i) =>
        i === index || i === index - 1 ? { ...leg, coordinates: [], durationSeconds: 0 } : leg,
      ),
    );
  };
  const updateLeg = (index: number, patch: Partial<RouteLeg>) => {
    invalidate();
    setLegs((items) =>
      items.map((leg, i) =>
        i === index
          ? { ...leg, ...patch, ...(patch.mode ? { coordinates: [], durationSeconds: 0 } : {}) }
          : leg,
      ),
    );
  };
  const showError = (reason: unknown) => {
    const message = (reason as Error).message;
    const translated = message.startsWith('journey.') ? journeyError(400, message) : message;
    setError(translated); return translated;
  };
  const begin = () => { busyRef.current = true; setBusy(true); callbacks.current.onBusyChange(true); setError(''); };
  const finish = () => { busyRef.current = false; setBusy(false); callbacks.current.onBusyChange(false); setProgress(''); };
  async function calculate(anchor: boolean) {
    if (busyRef.current) return;
    setPickingStop(null); setPickedPoint(null);
    begin();
    try {
      const plan = await planRoute(stops, legs, start, anchor, setProgress);
      setLegs(plan.legs); setRows(plan.rows); setStart(plan.start); setDirty(true);
    } catch (reason) { showError(reason); }
    finally { finish(); }
  }
  function prepare(): Promise<string> {
    if (running.current) return running.current;
    if (!dirty && value) return Promise.resolve(value);
    if (busyRef.current) return Promise.reject(new Error(t('Calculating the route…')));
    const operation = (async () => {
      begin();
      try {
        const anchor = !start && legs.some(leg => leg.mode === 'flight');
        const plan = rows.length ? { legs, rows, start } : await planRoute(stops, legs, start, anchor, setProgress);
        setLegs(plan.legs); setRows(plan.rows); setStart(plan.start);
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        setProgress(t('Loading map…'));
        const deadline = Date.now() + 15000;
        while (!map.current && Date.now() < deadline) await new Promise<void>(resolve => setTimeout(resolve, 100));
        if (!map.current) throw new Error(t('Wait until the map has finished loading.'));
        setProgress(t('Preparing the map for print…'));
        const image = await map.current.capture();
        const asset = await journeyRequest<{ id: string }>('/api/journeys/media', { method: 'POST', body: JSON.stringify({ image }) });
        const saved = await journeyRequest<{ id: string }>('/api/journeys/routes', { method: 'POST', body: JSON.stringify({
          stops: stops.map(stop => ({ ...stop, confirmed: undefined })), legs: plan.legs, startLocal: plan.start, timeline: plan.rows, mapId: asset.id, pointNumbering: 'interior',
        }) });
        loaded.current = saved.id; callbacks.current.onChange(saved.id); setDirty(false);
        return saved.id;
      } catch (reason) { throw new Error(showError(reason)); }
      finally { finish(); }
    })();
    running.current = operation;
    void operation.finally(() => { running.current = null; }).catch(() => {});
    return operation;
  }
  useImperativeHandle(ref, () => ({ prepare }));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= stops.length || from === to || busyRef.current) return;
    const result = reorderRoute(stops, legs, from, to);
    invalidate(); setStops(result.stops); setLegs(result.legs);
  };
  const time = (instant: string, zone: string) =>
    new Intl.DateTimeFormat(getLocale(), {
      timeZone: zone,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(instant));
  const labels: Record<TimelineRow['kind'], string> = {
    stop: t('Stop'),
    car: t('Drive'),
    foot: t('Walk'),
    flight: t('Flight'),
    waiting: t('Waiting'),
    checkin: t('Check-in and security'),
    baggage: t('Baggage and arrival formalities'),
  };
  return (
    <fieldset className="route-editor">
      <legend>{t('Route and travel schedule')}</legend>
      <p>
        {t(
          'Choose addresses, add flights from your tickets and allow time for check-in and transfers.',
        )}
      </p>
      <fieldset disabled={busy} className="route-inputs">
        <ol className="route-stops">
          {stops.map((stop, index) => (
            <li key={stop.id} data-route-stop={index}>
              <div className="route-stop-heading">
                <RouteReorderHandle index={index} onMove={move} disabled={busy} />
                <strong>
                  {routePointCaption(index, stops.length)}
                  {stop.label && <small>{stop.label}</small>}
                </strong>
                {stops.length > 2 && (
                  <button
                    type="button"
                    className="journey-secondary"
                    aria-label={t('Remove stop')}
                    onClick={() => {
                      invalidate();
                      setStops((items) => items.filter((_, i) => i !== index));
                      setLegs((items) =>
                        stops
                          .filter((_, i) => i !== index)
                          .slice(1)
                          .map((_, i) =>
                            i === index - 1
                              ? emptyLeg()
                              : (items[i < index ? i : i + 1] ?? emptyLeg()),
                          ),
                      );
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
              <RouteAddressInput
                value={stop.label}
                onSelect={(selected) => address(index, selected)}
                onEditing={(edited) => {
                  if (stop.confirmed === !edited) return;
                  invalidate(); setStops(items => items.map((item, i) => i === index ? { ...item, confirmed: !edited } : item));
                }}
              />
              <button type="button" className="journey-secondary" onClick={() => {
                setPickingStop(stop.id); setPickedPoint(null); setPointName('');
                requestAnimationFrame(() => {
                  pickPanel.current?.scrollIntoView({ behavior: 'auto', block: 'center' });
                  pickPanel.current?.focus({ preventScroll: true });
                });
              }}>{t('Choose on map')}</button>
              <label>{t('Notes for this stop (optional)')}
                <textarea maxLength={500} rows={2} value={stop.description ?? ''}
                  onChange={event => { invalidate(); setStops(items => items.map((item, i) => i === index ? { ...item, description: event.target.value } : item)); }} />
              </label>
              {index > 0 && stop.label && stop.confirmed !== false && <RoutePlacePanel stop={stop}
                visitDate={start.slice(0, 10)}
                onWalkChange={walkId => {
                  setDirty(true); setStops(items => items.map(item => item.id === stop.id ? { ...item, walkId } : item));
                }}
                onWalkBusy={value => { busyRef.current = value; setBusy(value); callbacks.current.onBusyChange(value); }}
                onNotes={notes => {
                  const combined = [stop.description, notes].filter(Boolean).join('\n');
                  if (combined.length > 500) { setError(t('Stop notes can contain up to 500 characters. Shorten the notes before adding the plan.')); return; }
                  invalidate(); setStops(items => items.map(item => item.id === stop.id ? { ...item, description: combined } : item));
                }}
                onAdd={selected => {
                  if (stops.length >= 12) { setError(t('A route can contain up to 12 stops.')); return; }
                  const added = { ...emptyStop(), label: selected.label, longitude: selected.longitude, latitude: selected.latitude, zone: timezone(selected.latitude, selected.longitude), confirmed: true };
                  const ordered = [...stops]; ordered.splice(index + 1, 0, added);
                  const oldEdges = new Map(legs.map((leg, i) => [`${stops[i].id}:${stops[i + 1].id}`, leg]));
                  invalidate(); setStops(ordered); setLegs(ordered.slice(1).map((item, i) => oldEdges.get(`${ordered[i].id}:${item.id}`) ?? emptyLeg()));
                }} />}
              <div className="route-inline">
                <label>
                  {t('Time zone')}
                  <TimeZoneSelect
                    value={stop.zone}
                    onChange={(zone) => {
                      invalidate();
                      setStops((items) =>
                        items.map((item, i) =>
                          i === index ? { ...item, zone } : item,
                        ),
                      );
                    }}
                  />
                </label>
                <label>
                  {t('Time at this stop, min')}
                  <input
                    type="number"
                    min="0"
                    max="10080"
                    value={stop.stayMinutes}
                    onChange={(event) => {
                      invalidate();
                      setStops((items) =>
                        items.map((item, i) =>
                          i === index ? { ...item, stayMinutes: Number(event.target.value) } : item,
                        ),
                      );
                    }}
                  />
                </label>
              </div>
              {legs[index] && (
                <div className="route-leg">
                  <label>
                    {t('Travel to the next stop')}
                    <select
                      value={legs[index].mode}
                      onChange={(event) =>
                        updateLeg(index, { mode: event.target.value as RouteLeg['mode'] })
                      }
                    >
                      <option value="car">{t('Drive')}</option>
                      <option value="foot">{t('Walk')}</option>
                      <option value="flight">{t('Flight')}</option>
                    </select>
                  </label>
                  {legs[index].mode === 'flight' && (
                    <div className="route-inline">
                      <label>
                        {t('Departure, local time')}
                        <input
                          required
                          type="datetime-local"
                          value={legs[index].departure ?? ''}
                          onChange={(event) => updateLeg(index, { departure: event.target.value })}
                        />
                      </label>
                      <label>
                        {t('Arrival, local time')}
                        <input
                          required
                          type="datetime-local"
                          value={legs[index].arrival ?? ''}
                          onChange={(event) => updateLeg(index, { arrival: event.target.value })}
                        />
                      </label>
                      <label>
                        {t('Before departure, min')}
                        <input
                          type="number"
                          min="0"
                          max="10080"
                          value={legs[index].beforeMinutes ?? 120}
                          onChange={(event) =>
                            updateLeg(index, { beforeMinutes: Number(event.target.value) })
                          }
                        />
                      </label>
                      <label>
                        {t('After arrival, min')}
                        <input
                          type="number"
                          min="0"
                          max="10080"
                          value={legs[index].afterMinutes ?? 45}
                          onChange={(event) =>
                            updateLeg(index, { afterMinutes: Number(event.target.value) })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="journey-secondary"
          disabled={stops.length >= 12}
          onClick={() => {
            invalidate();
            setStops((items) => [...items.slice(0,-1), emptyStop(), items[items.length-1]]);
            // Inserting a visit splits the final transfer; its old geometry cannot describe either new leg.
            setLegs((items) => [...items.slice(0,-1), emptyLeg(), emptyLeg()]);
          }}
        >
          {t('Add stop')}
        </button>
        <label>
          {t('Start, local time')}
          <input
            type="datetime-local"
            value={start}
            onChange={(event) => {
              invalidate();
              setStart(event.target.value);
            }}
          />
        </label>
        <div className="route-actions">
          <button
            type="button"
            className="journey-secondary"
            disabled={!start}
            onClick={() => void calculate(false)}
          >
            {t('Calculate schedule')}
          </button>
          {legs.some((leg) => leg.mode === 'flight') && (
            <button
              type="button"
              className="journey-secondary"
              onClick={() => void calculate(true)}
            >
              {t('Calculate when to leave for the flight')}
            </button>
          )}
        </div>
      </fieldset>
      <div ref={pickPanel} tabIndex={-1} className="route-map-picker">
      {pickingStop && stops.some(stop => stop.id === pickingStop) && (
        <fieldset disabled={busy} className="route-pick-controls">
          <legend>{routePointCaption(stops.findIndex(stop => stop.id === pickingStop), stops.length)}</legend>
          <p>{t('Tap the map, or move it and use its center. No address search is needed.')}</p>
          <label>{t('Point name (optional)')}<input maxLength={180} value={pointName} onChange={event => setPointName(event.target.value)} /></label>
          <div className="route-actions">
            <button type="button" onClick={() => {
              const point = yandexActive ? yandexCenter.current : map.current?.center();
              if (point && Math.abs(point.latitude) <= 85) setPickedPoint(point);
            }}>{t('Use map center')}</button>
            <button type="button" disabled={!pickedPoint} onClick={() => {
              const index = stops.findIndex(stop => stop.id === pickingStop);
              if (index < 0 || !pickedPoint) return;
              address(index, { ...pickedPoint, label: pointName.trim() || `${t('Point on map')} · ${pickedPoint.latitude.toFixed(5)}, ${pickedPoint.longitude.toFixed(5)}` });
              setPickingStop(null); setPickedPoint(null);
            }}>{t('Confirm point')}</button>
            <button type="button" onClick={() => { setPickingStop(null); setPickedPoint(null); }}>{t('Cancel')}</button>
          </div>
          {pickedPoint && <output>{pickedPoint.latitude.toFixed(5)}, {pickedPoint.longitude.toFixed(5)}</output>}
        </fieldset>
      )}
      <YandexPlaceMap center={[stops[0]?.longitude??37.62,stops[0]?.latitude??55.75]} points={[]} stops={stops.filter(stop=>Boolean(stop.label))} legs={legs}
        onSelect={()=>{}} onModeChange={setYandexActive} onCenter={point=>{yandexCenter.current=point;}}
        onPick={pickingStop&&!busy?setPickedPoint:undefined} pickedPoint={pickingStop?pickedPoint:null} />
      <div style={yandexActive?{height:0,overflow:'hidden'}:undefined}>
      <Suspense fallback={<p role="status">{t('Loading map…')}</p>}>
        <RouteMap
          stops={stops.filter((stop) => stop.label)}
          legs={legs}
          onPick={pickingStop && !busy && stops.some(stop => stop.id === pickingStop) ? setPickedPoint : undefined}
          pickedPoint={pickingStop && stops.some(stop => stop.id === pickingStop) ? pickedPoint : null}
          onReady={(handle) => {
            map.current = handle;
          }}
        />
      </Suspense>
      </div>
      </div>
      {rows.length > 0 && (
        <ol className="route-timeline">
          {rows.map((row, index) => (
            <li key={index}>
              <strong>{row.kind === 'stop' ? routePointCaption(rows.slice(0,index).filter(item=>item.kind==='stop').length, stops.length) : labels[row.kind]}</strong>
              <span>{row.label}</span>
              {row.description && <p>{row.description}</p>}
              <time>
                {time(row.start, row.startZone ?? row.zone)}
                {row.end !== row.start ? ` — ${time(row.end, row.zone)}` : ''}
              </time>
              <small>
                {row.startZone && row.startZone !== row.zone
                  ? `${row.startZone} → ${row.zone}`
                  : row.zone}
              </small>
            </li>
          ))}
        </ol>
      )}
      <p className="route-note">
        {t(
          'Road times are estimates without live traffic. Check flight times and airport requirements with your airline.',
        )}
      </p>
      {busy && <p role="status">{progress}</p>}
      {error && <p role="alert">{error}</p>}
      <small role="status">{dirty || !value ? t('The route and map will be prepared when you view the document.') : t('Route saved')}</small>
    </fieldset>
  );
});
