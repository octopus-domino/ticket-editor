import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { downloadFile } from '@/shared/files/download';
import { fetchTripExport, openAccountTrip, tripExportFiles, updateAccountTrip, type AccountTrip, type TripExport } from '../api/tripDraft';
import { TripTemplateAction } from './TripTemplateAction';
import { readTripShare, readTripShareFile, sharedTripJson, shareTripUrl, type SharedTrip } from '../domain/sharedTrip';
import { TripView } from './trip-experience/TripView';
import { TripExperienceLoading } from './trip-experience/TripExperienceShell';
import './route.css';

type PlaceEdits = { trip: AccountTrip; past: AccountTrip[]; future: AccountTrip[] };

export default function AccountTripPage() {
  const { id } = useParams();
  const [loaded, setLoaded] = useState<{ id: string; trip: AccountTrip | null }>();
  const [reload, setReload] = useState(0);
  const [shareLink, setShareLink] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<TripExport>();
  const [edits, setEdits] = useState<PlaceEdits>();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  useEffect(() => {
    if (!id) return;
    const request = new AbortController();
    void openAccountTrip(id, request.signal).then(
      trip => { if (!request.signal.aborted) setLoaded({ id, trip }); },
      () => { if (!request.signal.aborted) setLoaded({ id, trip: null }); },
    );
    return () => request.abort();
  }, [id, reload]);
  if (!loaded || loaded.id !== id) return <TripExperienceLoading />;
  const { trip } = loaded;
  if (!trip) return <div className="trip-exp-message" role="alert">
    <p>{t('Could not open the account trip.')}</p>
    <button type="button" onClick={() => { setLoaded(undefined); setReload(value => value + 1); }}>{t('Retry')}</button>
  </div>;
  const accountTrip = trip;
  const activeEdits = edits?.trip.id === trip.id ? edits : undefined;
  function renamePlace(dayIndex: number, segmentId: string, title: string) {
    setEdits(current => {
      if (!current || current.trip.id !== accountTrip.id) return current;
      const next = {
        ...current.trip,
        days: current.trip.days.map((day, index) => index !== dayIndex ? day : {
          ...day, segments: day.segments.map(segment => segment.id !== segmentId ? segment : { ...segment, title }),
        }),
      };
      return { trip: next, past: [...current.past, current.trip], future: [] };
    });
  }
  function undoPlace() {
    setEdits(current => {
      const before = current?.past.at(-1);
      return current && before ? { trip: before, past: current.past.slice(0, -1), future: [current.trip, ...current.future] } : current;
    });
  }
  function redoPlace() {
    setEdits(current => {
      const after = current?.future[0];
      return current && after ? { trip: after, past: [...current.past, current.trip], future: current.future.slice(1) } : current;
    });
  }
  async function savePlaces() {
    if (!activeEdits || saving) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const latest = await openAccountTrip(accountTrip.id, new AbortController().signal);
      if (JSON.stringify(latest) !== JSON.stringify(accountTrip)) {
        setSaveMessage(t('The account trip changed. Reload before saving.'));
        return;
      }
      const saved = await updateAccountTrip(activeEdits.trip);
      setLoaded({ id: accountTrip.id, trip: saved });
      setEdits(undefined);
      setSaveMessage(t('Trip saved to account.'));
    } catch {
      setSaveMessage(t('Could not save the trip to your account.'));
    } finally {
      setSaving(false);
    }
  }
  async function share() {
    try {
      const url = await shareTripUrl(accountTrip, window.location.origin);
      if (url) setShareLink(url);
      else downloadFile(new Blob([sharedTripJson(accountTrip)], { type: 'application/json' }), 'trip.json');
    } catch {
      setSaveMessage(t('Could not create the trip link.'));
    }
  }
  async function exportTrip(tripId: string, kind: TripExport) {
    setExporting(true);
    setExportError(undefined);
    try {
      downloadFile(await fetchTripExport(tripId, kind), tripExportFiles[kind].filename);
    } catch {
      setExportError(kind);
    } finally {
      setExporting(false);
    }
  }
  return <TripView trip={activeEdits?.trip ?? trip} mode="owner"
    onRenamePlace={activeEdits && !saving ? renamePlace : undefined} actions={<>
    {activeEdits ? <>
      <button type="button" disabled={saving || !activeEdits.past.length} onClick={() => void savePlaces()}>
        {saving ? t('Saving…') : t('Save trip to account')}
      </button>
      <button type="button" disabled={saving || !activeEdits.past.length} onClick={undoPlace}>{t('Undo')}</button>
      <button type="button" disabled={saving || !activeEdits.future.length} onClick={redoPlace}>{t('Redo')}</button>
      <button type="button" disabled={saving} onClick={() => setEdits(undefined)}>{t('Cancel')}</button>
    </> : <>
      {trip.days.some(day => day.segments.some(place => !place.idea && !place.id.startsWith('visit-'))) &&
        <button type="button" onClick={() => {
          setSaveMessage(t('Select a place to rename it.'));
          setEdits({ trip, past: [], future: [] });
        }}>{t('Rename places')}</button>}
      <button type="button" onClick={() => void share()}>{t('Share')}</button>
    </>}
    <details>
      <summary>{t('Export')}</summary>
      <div className="trip-exp-action-menu">
        <TripTemplateAction getTrip={() => trip} />
        <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'calendar')}>{t('Export calendar')}</button>
        <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'json')}>{t('Export JSON')}</button>
        {trip.meta && 'legacyRouteId' in trip.meta && Boolean(trip.meta.legacyRouteId) && <button type="button" disabled={exporting} onClick={() => void exportTrip(trip.id, 'legacy')}>
          {t('Export original route')}
        </button>}
      </div>
    </details>
    {shareLink && <label>{t('Trip link')} <input readOnly value={shareLink} onFocus={event => event.target.select()} /></label>}
    {saveMessage && <p role="status">{saveMessage}</p>}
    {exportError && <p role="alert">{exportError === 'calendar' ? t('Could not export the calendar.')
      : t('Could not export trip JSON.')}</p>}
  </>} details={<>
    {trip.budget?.limit && <details className="trip-exp-panel">
      <summary>{t('Trip budget')}</summary><p>{trip.budget.limit.amount} {trip.budget.limit.currency}</p>
    </details>}
    {trip.documents?.length > 0 && <details className="trip-exp-panel">
      <summary>{t('Documents')}</summary>
      <ul>{trip.documents.map(document => <li key={document.id}>
        {/^https?:\/\//i.test(document.url)
          ? <a href={document.url} target="_blank" rel="noreferrer">{document.title}</a> : document.title}
      </li>)}</ul>
    </details>}
  </>} />;
}

export function SharedTripPage() {
  const [params] = useSearchParams();
  const data = params.get('data') ?? '';
  const [loaded, setLoaded] = useState<{ data: string; trip: SharedTrip | null }>();
  const [openedFile, setOpenedFile] = useState<SharedTrip | null>();
  useEffect(() => {
    if (!data) return;
    let current = true;
    void readTripShare(data).then(
      trip => { if (current) setLoaded({ data, trip }); },
      () => { if (current) setLoaded({ data, trip: null }); },
    );
    return () => { current = false; };
  }, [data]);
  if (!data) return openedFile ? <TripView trip={openedFile} mode="shared" source={t('Open trip file')} /> : <main className="journey-main">
    <label>{t('Open trip file')} <input type="file" accept=".json,application/json" onChange={event => {
      const file = event.currentTarget.files?.[0];
      if (file) void readTripShareFile(file).then(setOpenedFile, () => setOpenedFile(null));
    }} /></label>
    {openedFile === null && <p role="alert">{t('Could not open the trip file.')}</p>}
  </main>;
  if (!loaded || loaded.data !== data) return <TripExperienceLoading />;
  if (!loaded.trip) return <p role="alert">{t('Could not open the trip link.')}</p>;
  return <TripView trip={loaded.trip} mode="shared" />;
}
