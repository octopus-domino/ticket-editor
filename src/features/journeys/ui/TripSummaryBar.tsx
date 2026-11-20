import { Fragment } from 'react';
import { t } from '@/shared/i18n';
import { pointTransportModes, type PointTransport, type TripLodging } from '../api/tripDraft';
import { travelDuration } from '../domain/tripWordDocument';
import type { TripConnection } from './useTripConnections';

const transportButtons = { CAR: ['🚗', 'Car'], TRAIN: ['🚆', 'Train'], PLANE: ['✈️', 'Flight'], WALK: ['🚶', 'On foot'] } as const;

export interface TripSummaryRow {
  id: string;
  place: string;
  lodging?: Pick<TripLodging, 'name' | 'checkIn' | 'checkOut'>;
  connection?: TripConnection;
  onChooseTransport?: (mode: PointTransport) => void;
  onSelect?: () => void;
  onFindHotel?: () => void;
}

export function TripSummaryBar({ rows }: { rows: TripSummaryRow[] }) {
  if (!rows.length) return null;
  return <section className="trip-summary" aria-label={t('Trip overview')}>
    <h2>{t('Trip overview')}</h2>
    <ol>{rows.map(({ id, place, lodging, connection, onChooseTransport, onSelect, onFindHotel }) => {
      const nights = lodging && (Date.parse(lodging.checkOut) - Date.parse(lodging.checkIn)) / 86_400_000;
      return <Fragment key={id}>
        {connection && <li className="trip-summary-connection">
          <div role="group" aria-label={`${connection.from.name} → ${connection.to.name}`}>
            {pointTransportModes.map(mode => {
              const [icon, label] = transportButtons[mode];
              return <button key={mode} type="button" title={t(label)} aria-label={t(label)}
                aria-pressed={connection.mode === mode} onClick={() => onChooseTransport?.(mode)}>
                <span aria-hidden="true">{icon}</span>
              </button>;
            })}
          </div>
          <small aria-live="polite">{connection.result
            ? <>{connection.mode === 'PLANE' && `${t('Estimated flight time')}: `}{travelDuration(connection.result.seconds)}</>
            : connection.mode === 'TRAIN' && !connection.date ? t('Select trip dates for trains')
              : connection.result === null ? t('Travel time unavailable') : t('Calculating route…')}</small>
        </li>}
        <li>
          {onSelect ? <button type="button" onClick={onSelect}>{place}</button> : <strong>{place}</strong>}
          {lodging ? <>
            <div>{lodging.name}</div>
            <div><time dateTime={lodging.checkIn}>{lodging.checkIn}</time> {' → '}
              <time dateTime={lodging.checkOut}>{lodging.checkOut}</time></div>
            {nights !== undefined && nights > 0 && <small>{t('Nights')} {nights}</small>}
          </> : <div>{t('Accommodation not selected')}
            {onFindHotel && <button type="button" onClick={onFindHotel}>{t('Find hotels')}</button>}
          </div>}
        </li>
      </Fragment>;
    })}</ol>
  </section>;
}
