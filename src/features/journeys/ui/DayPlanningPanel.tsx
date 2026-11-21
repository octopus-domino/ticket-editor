import { useEffect, useRef, useState } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { readDayRoads } from '../api/planner/dayRoadMatrix';
import { optimizeDayRoute, type OptimizationMode } from '../domain/planner/optimizeDayRoute';
import { defaultDayPreferences, type DayPlanPreferences, type PlanningIssue, type PlanningStop, type RoadCost, type RoadMatrix, type StopPriority } from '../domain/planner/plannerTypes';
import { travelDuration } from '../domain/tripDocumentContent';
import type { RouteMapLeg } from './routeMapTypes';
import type { RouteStop } from '../domain/routeTimeline';
import { RouteReorderHandle } from './RouteReorderHandle';
import { RouteAddressInput } from './RouteAddressInput';

const noStops: PlanningStop[] = [];
const issueLabels: Record<PlanningIssue['kind'], string> = {
  closed: 'Visit outside opening hours', too_long: 'Day goes over the time limit', overlap: 'Cannot reach the fixed time',
  unreachable: 'Travel time unavailable', unknown_hours: 'Opening hours unknown', missing_coordinates: 'No map position',
  time_zone: 'Ambiguous local time',
};
const modes: Record<OptimizationMode, string> = {
  balanced: 'Balanced route', shortest: 'Shortest route', interesting: 'More time at stops', relaxed: 'Relaxed pace',
};

export type DayMapPlan = { stops: RouteStop[]; legs: RouteMapLeg[] };

export function DayPlanningPanel({ stops = noStops, preferences = defaultDayPreferences, date, zone, targetDays = [], onChange, onMap, onMoveToDay }: {
  stops?: PlanningStop[]; preferences?: DayPlanPreferences; date?: string; zone: string;
  onChange: (stops: PlanningStop[], preferences: DayPlanPreferences) => void;
  onMap: (plan?: DayMapPlan) => void;
  targetDays?: number[];
  onMoveToDay?: (stopId: string, day: number) => void;
}) {
  const [entry, setEntry] = useState(0);
  const [mode, setMode] = useState<OptimizationMode>('balanced');
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<ReturnType<typeof optimizeDayRoute>>();
  const [showReorder, setShowReorder] = useState(false);
  const [loadedMatrix, setLoadedMatrix] = useState<RoadMatrix>();
  const inflight = useRef<AbortController>();
  const roads = useRef(new Map<string, RoadCost>());
  useEffect(() => () => inflight.current?.abort(), []);
  useEffect(() => {
    inflight.current?.abort();
    setBusy(false);
    setProposal(undefined);
    setLoadedMatrix(undefined);
  }, [stops, preferences, date, zone]);

  function update(next: PlanningStop[], nextPreferences = preferences) {
    onMap();
    onChange(next, nextPreferences);
  }

  function add(title: string, point?: { latitude: number; longitude: number }) {
    if (stops.length >= 12) return;
    update([...stops, { id: crypto.randomUUID(), title, ...point, visitMinutes: 30, priority: 'must', locked: false }]);
    setEntry(entry + 1);
  }

  function moveTo(from: number, to: number) {
    if (from === to || !stops[to] || stops.slice(Math.min(from, to), Math.max(from, to) + 1)
      .some(stop => stop.locked || stop.fixedStartLocal)) return;
    const next = [...stops];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    update(next);
  }

  function showPlan(order: PlanningStop[], matrix: NonNullable<typeof loadedMatrix>) {
    const routeStops = order.flatMap(stop => stop.latitude == null || stop.longitude == null ? [] : [
      { id: stop.id, label: stop.title, latitude: stop.latitude, longitude: stop.longitude, zone, stayMinutes: stop.visitMinutes },
    ]);
    const legs: RouteMapLeg[] = [];
    const route = preferences.returnToStart && order.length > 1 ? [...order, order[0]] : order;
    route.slice(1).forEach((to, index) => {
      const cost = matrix(route[index], to);
      if (cost?.coordinates?.length) legs.push({ mode: 'foot', durationSeconds: cost.seconds, coordinates: cost.coordinates });
    });
    onMap({ stops: routeStops, legs });
  }

  async function calculate(optimize: boolean) {
    if (!date || busy || !stops.length) return;
    const controller = new AbortController();
    inflight.current = controller;
    setBusy(true);
    setShowReorder(optimize);
    try {
      const matrix = await readDayRoads(stops, roads.current, preferences.returnToStart, optimize, controller.signal);
      if (controller.signal.aborted) return;
      setLoadedMatrix(() => matrix);
      setProposal(optimizeDayRoute(stops, matrix, date, zone, preferences, mode));
      showPlan(stops, matrix);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const time = (value?: number) => value === undefined ? '—' : new Intl.DateTimeFormat(getLocale(), {
    hour: '2-digit', minute: '2-digit', timeZone: zone,
  }).format(value);
  const result = proposal?.before;
  return <details className="trip-day-program">
    <summary>{t('Plan the day')}</summary>
    {stops.length < 12 && <RouteAddressInput key={entry} value="" confirmLabel={t('Add place')}
      onSelect={address => add(address.label, address)} onConfirmText={add} />}
    <div className="trip-day-program-hours">
      <label>{t('Departure')} <input type="time" value={preferences.startLocal}
        onChange={event => update(stops, { ...preferences, startLocal: event.target.value })} /></label>
      <label>{t('Arrival')} <input type="time" value={preferences.finishLocal}
        onChange={event => update(stops, { ...preferences, finishLocal: event.target.value })} /></label>
      <label><input type="checkbox" checked={preferences.returnToStart}
        onChange={event => update(stops, { ...preferences, returnToStart: event.target.checked })} />{t('Return to start')}</label>
      <label>{t('On foot')} <select value={preferences.walkingPace} onChange={event =>
        update(stops, { ...preferences, walkingPace: event.target.value as DayPlanPreferences['walkingPace'] })}>
        <option value="normal">{t('Normal')}</option>
        <option value="relaxed">{t('Relaxed pace')}</option>
        <option value="fast">{t('Fast pace')}</option>
      </select></label>
      <label><input type="checkbox" checked={preferences.includeBreaks} onChange={event =>
        update(stops, { ...preferences, includeBreaks: event.target.checked })} />{t('Include breaks')}</label>
    </div>
    <ol>{stops.map((stop, index) => <li key={stop.id} data-route-stop={index}>
      <RouteReorderHandle index={index} disabled={stops.length < 2 || stop.locked || Boolean(stop.fixedStartLocal)}
        onMove={moveTo} />
      <strong>{stop.title}</strong>
      {result && <p>{time(result.rows[index]?.arrival)} → {time(result.rows[index]?.start)} → {time(result.rows[index]?.end)}</p>}
      <label>{t('Visit priority')} <select value={stop.priority} onChange={event =>
        update(stops.map((item, i) => i === index ? { ...item, priority: event.target.value as StopPriority } : item))}>
        <option value="must">{t('Required stop')}</option>
        <option value="preferred">{t('Preferred stop')}</option>
        <option value="optional">{t('Optional stop')}</option>
      </select></label>
      <label>{t('Visit minutes')} <input type="number" min={0} max={720} value={stop.visitMinutes} onChange={event => {
        const value = event.target.valueAsNumber;
        if (Number.isFinite(value) && value >= 0 && value <= 720) update(stops.map((item, i) => i === index ? { ...item, visitMinutes: value } : item));
      }} /></label>
      <label>{t('Fixed visit time')} <input type="time" value={stop.fixedStartLocal ?? ''} onChange={event =>
        update(stops.map((item, i) => i === index ? { ...item, fixedStartLocal: event.target.value || undefined } : item))} /></label>
      <details>
        <summary>{t('Opening hours')}</summary>
        {(['from', 'to'] as const).map(key => <label key={key}>{t(key === 'from' ? 'Departure' : 'Arrival')}
          <input type="time" value={stop.openingHours?.[key] ?? ''} onChange={event => {
            const hours = { from: stop.openingHours?.from ?? '', to: stop.openingHours?.to ?? '',
              confidence: 'estimated' as const, [key]: event.target.value };
            update(stops.map((item, i) => i === index ? { ...item, openingHours: hours } : item));
          }} />
        </label>)}
      </details>
      <label><input type="checkbox" checked={stop.locked} onChange={event =>
        update(stops.map((item, i) => i === index ? { ...item, locked: event.target.checked } : item))} />{t('Keep position')}</label>
      <button type="button" aria-label={t('Move day earlier')} disabled={index === 0 || stop.locked || stops[index - 1]?.locked}
        onClick={() => moveTo(index, index - 1)}>↑</button>
      <button type="button" aria-label={t('Move day later')} disabled={index === stops.length - 1 || stop.locked || stops[index + 1]?.locked}
        onClick={() => moveTo(index, index + 1)}>↓</button>
      {targetDays.length > 0 && <label>{t('Move to day')} <select value="" disabled={stop.locked}
        onChange={event => onMoveToDay?.(stop.id, Number(event.target.value))}>
        <option value="">{t('Move to day')}</option>
        {targetDays.map(day => <option key={day} value={day}>{t('Trip day')} {day}</option>)}
      </select></label>}
      <button type="button" onClick={() => update(stops.filter(item => item.id !== stop.id))}>{t('Remove')}</button>
      {result?.issues.filter(issue => issue.stopId === stop.id).map(issue => <small key={issue.kind}>{t(issueLabels[issue.kind])}</small>)}
    </li>)}</ol>
    <button type="button" disabled={!date || busy || !stops.length} onClick={() => void calculate(false)}>{t('Check the day')}</button>
    <label>{t('Balanced route')} <select value={mode} onChange={event => setMode(event.target.value as OptimizationMode)}>
      {Object.entries(modes).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}
    </select></label>
    <button type="button" disabled={!date || busy || stops.length < 4} onClick={() => void calculate(true)}>{t('Improve the order')}</button>
    {busy && <p role="status">{t('Calculating route…')}</p>}
    {result && <section aria-live="polite">
      <p>{result.issues.some(issue => issue.kind === 'unreachable') ? t('Travel time unavailable')
        : <>{t('On foot')} · {travelDuration(result.walking)} · {Math.round(result.distance)} m</>}</p>
      {result.issues.filter(issue => !issue.stopId).map(issue => <p key={issue.kind}>{t(issueLabels[issue.kind])}</p>)}
      {showReorder && !proposal?.changed && <p>{t('No verified improvement found.')}</p>}
      {showReorder && proposal?.changed && loadedMatrix && <>
        <p>{stops.map(stop => stop.title).join(' → ')}</p>
        <p>{proposal.order.map(stop => stop.title).join(' → ')}</p>
        <p>{travelDuration(result.walking)} → {travelDuration(proposal.after.walking)} ·
          {' '}{Math.round(result.distance)} m → {Math.round(proposal.after.distance)} m</p>
        {proposal.removed.length > 0 && <p>{t('Suggested skips')} · {proposal.removed.map(stop => stop.title).join(', ')}</p>}
        <button type="button" onClick={() => { onChange(proposal.order, preferences); showPlan(proposal.order, loadedMatrix); }}>{t('Apply')}</button>
        <button type="button" onClick={() => setShowReorder(false)}>{t('Cancel')}</button>
      </>}
    </section>}
  </details>;
}
