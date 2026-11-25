import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authStore } from '@/auth/store';
import { getLocale, t } from '@/shared/i18n';
import { useStore } from '@/shared/store/store';
import { listAccountTrips, type TripSummary } from '../api/tripDraft';
import { hasTripDraft } from './tripDraftStorage';
import './route.css';

type Result = { owner: string; page: number; trips?: TripSummary[]; hasNext?: boolean };

function tripDates(start: string, end: string) {
  const format = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'medium', timeZone: 'UTC' });
  return format.formatRange(new Date(start), new Date(end));
}

export default function TripListPage() {
  const user = useStore(authStore, state => state.user);
  const booting = useStore(authStore, state => state.booting);
  const owner = user?.id === 'guest' ? undefined : user?.id;
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<Result>();
  const current = result?.owner === owner && result?.page === page ? result : undefined;

  useEffect(() => {
    if (!owner) return;
    const request = new AbortController();
    void listAccountTrips(page, request.signal).then(
      response => {
        if (!request.signal.aborted) setResult({ owner, page, trips: response.items, hasNext: response.hasNext });
      },
      () => {
        if (!request.signal.aborted) setResult({ owner, page });
      },
    );
    return () => request.abort();
  }, [owner, page, retry]);

  return <main className="journey-main journey-main--travel trip-list-page">
    <header className="trip-list-heading">
      <h1>{t('My routes')}</h1>
      <Link className="journey-primary" to="/trip/new">{t('Create route')}</Link>
    </header>
    {hasTripDraft(user?.id) && <p><Link to="/trip/new?resume=1">{t('Continue device draft')}</Link></p>}
    {booting && <p role="status">{t('Loading…')}</p>}
    {!booting && !owner && <p><Link to="/login">{t('Sign in to see saved routes')}</Link></p>}
    {owner && !current && <p role="status">{t('Loading…')}</p>}
    {owner && current && !current.trips && <div role="alert">
      <p>{t('Could not load routes.')}</p>
      <button type="button" onClick={() => { setResult(undefined); setRetry(value => value + 1); }}>{t('Retry')}</button>
    </div>}
    {current?.trips?.length === 0 && <p>{t('No saved routes yet.')}</p>}
    {Boolean(current?.trips?.length) && <ul className="trip-list-items">
      {current?.trips?.map(trip => <li key={trip.id}>
        <Link to={`/trip/${encodeURIComponent(trip.id)}`}>
          <strong>{trip.title?.trim() || t('Untitled route')}</strong>
          {trip.startDate && trip.endDate && <span>{tripDates(trip.startDate, trip.endDate)}</span>}
        </Link>
      </li>)}
    </ul>}
    {(page > 0 || current?.hasNext) && <nav className="trip-list-heading" aria-label={t('My routes')}>
      <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>{t('Previous')}</button>
      <button type="button" disabled={!current?.hasNext} onClick={() => setPage(value => value + 1)}>{t('Next')}</button>
    </nav>}
  </main>;
}
