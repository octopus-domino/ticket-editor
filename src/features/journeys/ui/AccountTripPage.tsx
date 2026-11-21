import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { downloadFile } from '@/shared/files/download';
import { fetchTripExport, openAccountTrip, tripExportFiles, type AccountTrip, type TripExport } from '../api/tripDraft';
import { TripTemplateAction } from './TripTemplateAction';
import { readTripShare, readTripShareFile, sharedTripJson, shareTripUrl, type SharedTrip } from '../domain/sharedTrip';
import { TripView } from './trip-experience/TripView';
import './route.css';

export default function AccountTripPage() {
  const { id } = useParams();
  const [loaded, setLoaded] = useState<{ id: string; trip: AccountTrip | null }>();
  const [reload, setReload] = useState(0);
  const [shareLink, setShareLink] = useState<string>();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<TripExport>();
  useEffect(() => {
    if (!id) return;
    const request = new AbortController();
    void openAccountTrip(id, request.signal).then(
      trip => { if (!request.signal.aborted) setLoaded({ id, trip }); },
      () => { if (!request.signal.aborted) setLoaded({ id, trip: null }); },
    );
    return () => request.abort();
  }, [id, reload]);
  if (!loaded || loaded.id !== id) return <p className="trip-exp-message" role="status">{t('Loading…')}</p>;
  const { trip } = loaded;
  if (!trip) return <div className="trip-exp-message" role="alert">
    <p>{t('Could not open the account trip.')}</p>
    <button type="button" onClick={() => { setLoaded(undefined); setReload(value => value + 1); }}>{t('Retry')}</button>
  </div>;
  const accountTrip = trip;
  async function share() {
    const url = await shareTripUrl(accountTrip, window.location.origin);
    if (url) setShareLink(url);
    else downloadFile(new Blob([sharedTripJson(accountTrip)], { type: 'application/json' }), 'trip.json');
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
  return <TripView trip={trip} mode="owner" actions={<>
    <button type="button" onClick={() => void share()}>{t('Share')}</button>
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
    {exportError && <p role="alert">{exportError === 'calendar' ? t('Could not export the calendar.')
      : t('Could not export trip JSON.')}</p>}
  </>} details={trip.budget?.limit && <details className="trip-exp-panel">
    <summary>{t('Trip budget')}</summary><p>{trip.budget.limit.amount} {trip.budget.limit.currency}</p>
  </details>} />;
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
  if (!loaded || loaded.data !== data) return <p role="status">{t('Loading…')}</p>;
  if (!loaded.trip) return <p role="alert">{t('Could not open the trip link.')}</p>;
  return <TripView trip={loaded.trip} mode="shared" />;
}
