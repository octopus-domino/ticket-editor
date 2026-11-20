import { t } from '@/shared/i18n';
import type { TripLodging } from '../api/tripDraft';

export interface TripSummaryRow {
  id: string;
  place: string;
  lodging?: Pick<TripLodging, 'name' | 'checkIn' | 'checkOut'>;
  onSelect?: () => void;
  onFindHotel?: () => void;
}

export function TripSummaryBar({ rows }: { rows: TripSummaryRow[] }) {
  if (!rows.length) return null;
  return <section className="trip-summary" aria-label={t('Trip overview')}>
    <h2>{t('Trip overview')}</h2>
    <ol>{rows.map(({ id, place, lodging, onSelect, onFindHotel }) => {
      const nights = lodging && (Date.parse(lodging.checkOut) - Date.parse(lodging.checkIn)) / 86_400_000;
      return <li key={id}>
        {onSelect ? <button type="button" onClick={onSelect}>{place}</button> : <strong>{place}</strong>}
        {lodging ? <>
          <div>{lodging.name}</div>
          <div><time dateTime={lodging.checkIn}>{lodging.checkIn}</time> {' → '}
            <time dateTime={lodging.checkOut}>{lodging.checkOut}</time></div>
          {nights !== undefined && nights > 0 && <small>{t('Nights')} {nights}</small>}
        </> : <div>{t('Accommodation not selected')}
          {onFindHotel && <button type="button" onClick={onFindHotel}>{t('Find hotels')}</button>}
        </div>}
      </li>;
    })}</ol>
  </section>;
}
