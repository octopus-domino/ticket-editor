import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import timezone from 'tz-lookup';
import { getLocale, t } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';
import { journeyError } from '../api/errorMessage';
import {
  buildRouteTimeline,
  departureForFlight,
  type RouteStop,
  type RouteLeg,
  type TimelineRow,
} from '../domain/routeTimeline';
import { flightCoordinates, type PlannedLeg, type RouteSnapshot } from '../domain/route';
import { RouteAddressInput, type RouteAddress } from './RouteAddressInput';
import type { RouteMapHandle } from './RouteMap';
import './route.css';

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
export function RouteEditor({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (id: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [stops, setStops] = useState<RouteStop[]>([emptyStop(), emptyStop()]);
  const [legs, setLegs] = useState<PlannedLeg[]>([emptyLeg()]);
  const [start, setStart] = useState('');
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [dirty, setDirty] = useState(false);
  const map = useRef<RouteMapHandle | null>(null);
  const loaded = useRef('');
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
    callbacks.current.onChange('');
  };
  const address = (index: number, selected: RouteAddress) => {
    invalidate();
    setStops((items) =>
      items.map((stop, i) =>
        i === index
          ? { ...stop, ...selected, zone: timezone(selected.latitude, selected.longitude) }
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
  async function calculate(anchor: boolean) {
    setBusy(true);
    callbacks.current.onBusyChange(true);
    setError('');
    try {
      if (stops.some((stop) => !stop.label))
        throw new Error(t('Select an address for every stop.'));
      const planned: PlannedLeg[] = [];
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        setProgress(`${t('Calculating the route…')} ${i + 1}/${legs.length}`);
        if (leg.mode === 'flight')
          planned.push({ ...leg, coordinates: flightCoordinates(stops[i], stops[i + 1]) });
        else if (leg.coordinates.length) planned.push(leg);
        else {
          const road = await journeyRequest<{
            coordinates: [number, number][];
            distanceMeters: number;
            durationSeconds: number;
          }>('/api/journeys/routes/road', {
            method: 'POST',
            body: JSON.stringify({
              start: { longitude: stops[i].longitude, latitude: stops[i].latitude },
              end: { longitude: stops[i + 1].longitude, latitude: stops[i + 1].latitude },
              mode: leg.mode,
            }),
          });
          planned.push({ ...leg, ...road });
        }
      }
      const departure = anchor ? departureForFlight(stops, planned) : start;
      const timeline = buildRouteTimeline(stops, planned, departure);
      setLegs(planned);
      setRows(timeline);
      setStart(departure);
      setProgress('');
      setDirty(true);
    } catch (reason) {
      const message = (reason as Error).message;
      setError(message.startsWith('journey.') ? journeyError(400, message) : message);
    } finally {
      setBusy(false);
      callbacks.current.onBusyChange(false);
    }
  }
  async function save() {
    if (!map.current || !rows.length) return;
    setBusy(true);
    callbacks.current.onBusyChange(true);
    setError('');
    try {
      setProgress(t('Preparing the map for print…'));
      const image = await map.current.capture();
      const asset = await journeyRequest<{ id: string }>('/api/journeys/media', {
        method: 'POST',
        body: JSON.stringify({ image }),
      });
      const saved = await journeyRequest<{ id: string }>('/api/journeys/routes', {
        method: 'POST',
        body: JSON.stringify({ stops, legs, startLocal: start, timeline: rows, mapId: asset.id }),
      });
      loaded.current = saved.id;
      callbacks.current.onChange(saved.id);
      setDirty(false);
      setProgress('');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
      callbacks.current.onBusyChange(false);
    }
  }
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
            <li key={stop.id}>
              <div className="route-stop-heading">
                <strong>
                  {index + 1}. {stop.label || t('New stop')}
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
              />
              <div className="route-inline">
                <label>
                  {t('Time zone')}
                  <input
                    value={stop.zone}
                    onChange={(event) => {
                      invalidate();
                      setStops((items) =>
                        items.map((item, i) =>
                          i === index ? { ...item, zone: event.target.value } : item,
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
            setStops((items) => [...items, emptyStop()]);
            setLegs((items) => [...items, emptyLeg()]);
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
      <Suspense fallback={<p role="status">{t('Loading map…')}</p>}>
        <RouteMap
          stops={stops.filter((stop) => stop.label)}
          legs={legs}
          onReady={(handle) => {
            map.current = handle;
          }}
        />
      </Suspense>
      {rows.length > 0 && (
        <ol className="route-timeline">
          {rows.map((row, index) => (
            <li key={index}>
              <strong>{labels[row.kind]}</strong>
              <span>{row.label}</span>
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
      <button
        type="button"
        className="journey-primary"
        disabled={busy || !rows.length}
        onClick={() => void save()}
      >
        {t('Save route and print map')}
      </button>
      {!dirty && value && <small role="status">{t('Route saved')}</small>}
      {dirty && <small>{t('Save the route before continuing to the document.')}</small>}
    </fieldset>
  );
}
