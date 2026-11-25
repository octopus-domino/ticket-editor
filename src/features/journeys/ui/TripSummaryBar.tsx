import { Fragment } from 'react';
import { getLocale, t } from '@/shared/i18n';
import { pointTransportModes, type PointTransport, type TripLodging, type TripTrain } from '../api/tripDraft';
import { travelDuration } from '../domain/tripDocumentContent';
import type { TripConnection } from './useTripConnections';

const transportButtons = { CAR: ['🚗', 'Car'], TRAIN: ['🚆', 'Train'], PLANE: ['✈️', 'Flight'], WALK: ['🚶', 'On foot'] } as const;

export interface TripSummaryRow {
  id: string;
  place: string;
  lodging?: Pick<TripLodging, 'name' | 'checkIn' | 'checkOut'>;
  connection?: TripConnection;
  onChooseTransport?: (mode: PointTransport) => void;
  onChooseTrain?: (train: TripTrain) => void;
  onSelect?: () => void;
  onFindHotel?: () => void;
}

interface TripSummaryDay {
  number: number;
  date?: string;
  selected: boolean;
  rows: TripSummaryRow[];
  onSelect: () => void;
  onMoveEarlier?: () => void;
  onMoveLater?: () => void;
}

export function TripSummaryBar({ rows = [], days, compact = false }: { rows?: TripSummaryRow[]; days?: TripSummaryDay[]; compact?: boolean }) {
  if (!rows.length && !days?.length) return null;
  const cards = (items: TripSummaryRow[]) => <ol>{items.map(({ id, place, lodging, connection, onChooseTransport, onChooseTrain, onSelect, onFindHotel }) => {
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
          {connection.result?.source === 'rail' && <small>
            {t(connection.result.stale ? 'Train timetable is out of date.' : 'Duration from timetable')}
          </small>}
          {connection.result?.source === 'road' && <small>{t('Road route calculated')}</small>}
          {connection.mode === 'TRAIN' && <details className="trip-connection-timetable">
            <summary title={t('Train timetable')} aria-label={t('Train timetable')}><span aria-hidden="true">🗓</span></summary>
            <div className="trip-connection-timetable-panel">
              {connection.date && <time dateTime={connection.date}>{connection.date}</time>}
              {connection.result?.trains ? <ul>
                {connection.result.trains.map((train, index) => <li key={`${train.number}-${train.departure}-${index}`}>
                  <strong>{train.number} {train.title}</strong>
                  <span>{train.from} <time dateTime={train.departure}>{train.departure.slice(11, 16)}</time>
                    {' → '}{train.to} <time dateTime={train.arrival}>{train.arrival.slice(11, 16)}</time></span>
                  <small>{travelDuration(train.seconds)}</small>
                  {onChooseTrain && <button type="button" disabled={connection.result?.stale}
                    onClick={() => onChooseTrain({
                      number: train.number, title: train.title, from: train.from, to: train.to,
                      fromCity: connection.from.name, toCity: connection.to.name,
                      departure: train.departure, arrival: train.arrival,
                    })}>{t('Select train')}</button>}
                </li>)}
              </ul> : <p>{!connection.date ? t('Select trip dates for trains')
                : connection.result === null ? t('Train timetable unavailable.') : t('Calculating route…')}</p>}
            </div>
          </details>}
        </li>}
        <li className={compact ? 'trip-summary-stay-row' : undefined}>
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
    })}</ol>;
  return <section className="trip-summary" data-compact={compact || undefined} aria-label={t('Trip overview')}>
    <h2>{t('Trip overview')}</h2>
    {days ? <div className="trip-day-timeline">{days.map(day => <section key={day.number} className="trip-day-timeline-item"
      data-selected={day.selected}>
      <header>
        <button type="button" aria-current={day.selected ? 'date' : undefined} onClick={day.onSelect}>
          <span>{t('Trip day')} {day.number}</span>
          {day.date && <time dateTime={day.date}>{new Intl.DateTimeFormat(getLocale(), {
            weekday: 'short', month: 'long', day: 'numeric', timeZone: 'UTC',
          }).format(new Date(day.date))}</time>}
        </button>
        <div>
          <button type="button" aria-label={t('Move day earlier')} title={t('Move day earlier')}
            disabled={!day.onMoveEarlier} onClick={day.onMoveEarlier}>↑</button>
          <button type="button" aria-label={t('Move day later')} title={t('Move day later')}
            disabled={!day.onMoveLater} onClick={day.onMoveLater}>↓</button>
        </div>
      </header>
      {day.rows.length > 0 && cards(day.rows)}
    </section>)}</div> : cards(rows)}
  </section>;
}
