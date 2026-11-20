import { useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { t } from '@/shared/i18n';
import type { TripLodging } from '../api/tripDraft';
import { RouteMap } from './RouteMap';

const ignoreMapHandle = () => undefined;

export function TripLodgingEditor({ date, lodging, onSave }: {
  date: string; lodging?: TripLodging;
  onSave(lodging: TripLodging | undefined): void;
}) {
  const [values, setValues] = useState<TripLodging>(() => lodging ?? {
    name: '', address: '', checkIn: date, checkOut: Temporal.PlainDate.from(date).add({ days: 1 }).toString(),
  });
  const [picking, setPicking] = useState(false);
  const [currency, setCurrency] = useState(lodging?.cost?.currency ?? 'RUB');
  const point = values.latitude != null && values.longitude != null
    ? { latitude: values.latitude, longitude: values.longitude } : undefined;
  function change(field: 'name' | 'address' | 'checkIn' | 'checkOut', value: string) {
    setValues(old => ({ ...old, [field]: value }));
  }
  return <details>
    <summary>{t('Trip lodging')}</summary>
    <label>{t('Hotel name')} <input maxLength={160} value={values.name} onChange={event => change('name', event.target.value)} /></label>
    <label>{t('Address')} <input maxLength={300} value={values.address} onChange={event => change('address', event.target.value)} /></label>
    <label>{t('Check-in date')} <input type="date" value={values.checkIn} onChange={event => change('checkIn', event.target.value)} /></label>
    <label>{t('Check-out date')} <input type="date" value={values.checkOut} onChange={event => change('checkOut', event.target.value)} /></label>
    <label>{t('Lodging cost')} <input type="number" min="0" step="0.01" value={values.cost?.amount ?? ''} onChange={event => {
      const amount = event.target.valueAsNumber;
      setValues(old => ({ ...old, cost: Number.isFinite(amount) && amount >= 0 ? { amount, currency } : undefined }));
    }} /></label>
    {values.cost && <label>{t('Currency')} <input maxLength={3} value={currency}
      onChange={event => setCurrency(event.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} /></label>}
    <button type="button" aria-pressed={picking} onClick={() => setPicking(!picking)}>
      {picking ? t('Cancel') : t('Choose on map')}
    </button>
    {(picking || point) && <RouteMap rasterBasemap stops={point ? [{ ...point, id: 'lodging', label: values.name || t('Trip lodging'),
      zone: 'UTC', stayMinutes: 0 }] : []} legs={[]} cityMap onReady={ignoreMapHandle}
      onPick={picking ? next => { setValues(old => ({ ...old, ...next })); setPicking(false); } : undefined} />}
    {point && <button type="button" onClick={() => setValues(old => ({ ...old, latitude: undefined, longitude: undefined }))}>
      {t('Remove map pin')}
    </button>}
    <button type="button" disabled={!values.name.trim() || !values.checkIn || values.checkIn >= values.checkOut
      || Boolean(values.cost && !/^[A-Z]{3}$/.test(currency))}
      onClick={() => onSave({ ...values, name: values.name.trim(), address: values.address.trim(),
        cost: values.cost ? { ...values.cost, currency } : undefined })}>{t('Save lodging')}</button>
    {lodging && <button type="button" onClick={() => onSave(undefined)}>{t('Remove')}</button>}
  </details>;
}
