import { getLocale, t } from '@/shared/i18n';
import { wordDocument, type WordParagraph } from '@/shared/files/wordDocument';
import type { AccountTrip } from '../api/tripDraft';

const transports = { CAR: 'Car', TRAIN: 'Train', PLANE: 'Flight', WALK: 'On foot', BUS: 'Bus', FERRY: 'Ferry' };

export function travelDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const unit = (value: number, name: string) => new Intl.NumberFormat(getLocale(), { style: 'unit', unit: name }).format(value);
  const hours = Math.floor(minutes / 60);
  return [hours ? unit(hours, 'hour') : '', !hours || minutes % 60 ? unit(minutes % 60, 'minute') : ''].filter(Boolean).join(' ');
}

export function tripWordDocument(trip: AccountTrip) {
  const paragraphs: WordParagraph[] = [{ text: trip.title, heading: 1 }, { text: `${trip.startDate} — ${trip.endDate}` }];
  const cities = new Map(trip.cities.map(city => [city.id, city.name]));
  const accommodations = new Map(trip.accommodations.map(hotel => [hotel.id, hotel]));
  const add = (text?: string | null) => { if (text) paragraphs.push({ text }); };
  for (const day of trip.days) {
    paragraphs.push({ text: [day.date, cities.get(day.cityId)].filter(Boolean).join(' · '), heading: 2 });
    add(day.note);
    const hotel = day.accommodationId && accommodations.get(day.accommodationId);
    if (hotel) add([hotel.name, hotel.address, `${hotel.checkIn} — ${hotel.checkOut}`].filter(Boolean).join(' · '));
    for (const segment of day.segments) add([segment.title, segment.note].filter(Boolean).join(' · '));
  }
  if (trip.legs.length) {
    paragraphs.push({ text: t('Transfer details'), heading: 2 });
    for (const leg of trip.legs) {
      const duration = leg.durationSeconds != null ? travelDuration(leg.durationSeconds) : '';
      const label = leg.transport === 'PLANE' && !leg.departureAt ? t('Estimated flight time') : '';
      add([cities.get(leg.fromCityId), cities.get(leg.toCityId)].join(' → '));
      add([leg.transport && t(transports[leg.transport]), leg.departureAt, leg.arrivalAt, label, duration].filter(Boolean).join(' · '));
      if (leg.bookingUrl) paragraphs.push({ text: t('Booking link'), link: leg.bookingUrl });
    }
  }
  if (trip.budget?.limit) add(`${t('Trip budget')} · ${trip.budget.limit.amount} ${trip.budget.limit.currency}`);
  if (trip.documents.length) {
    paragraphs.push({ text: t('Documents'), heading: 2 });
    for (const document of trip.documents) paragraphs.push({ text: document.title, link: document.url });
  }
  return wordDocument(paragraphs);
}
