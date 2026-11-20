import { describe, expect, it, vi } from 'vitest';
import { authFetch } from '../src/shared/api/client';
import { saveTripToAccount, tripPayload, type LocalTripDraft } from '../src/features/journeys/api/tripDraft';
import { sharedTripJson } from '../src/features/journeys/domain/sharedTrip';

vi.mock('../src/shared/api/client', () => ({ authFetch: vi.fn() }));

const draft: LocalTripDraft = {
  version: 2, id: 'first-trip', startDate: '2026-12-31', endDate: '2027-01-01',
  budget: { amount: 3000, currency: 'RUB' },
  documents: [{ id: 'reservation', title: 'Reservation', url: 'https://example.org/reservation' }],
  days: {
    2: {
      city: 'Petersburg',
      train: { number: '001', title: 'Express', from: 'Petersburg', to: 'Moscow',
        departure: '2027-01-01T10:00:00+03:00', arrival: '2027-01-01T14:00:00+03:00' },
      lodging: { name: 'Hotel', address: 'Main Street', checkIn: '2027-01-01', checkOut: '2027-01-02',
        longitude: 30.1, latitude: 59.2, cost: { amount: 80, currency: 'EUR' } },
      stops: [
        { id: 'a', label: 'Pier', longitude: 30, latitude: 59, zone: 'UTC', stayMinutes: 0 },
        { id: 'b', label: 'Bridge', longitude: 31, latitude: 60, zone: 'UTC', stayMinutes: 0 },
      ],
      importedWalk: { title: 'River walk', legs: [{
        mode: 'foot', coordinates: [[30, 59], [31, 60]], distanceMeters: 1500, durationSeconds: 900,
      }] },
    },
  },
};

describe('account trip', () => {
  it('exports day ideas independently of the imported walk geometry', () => {
    const idea = { id: 'museum', label: 'Museum', latitude: 59.1, longitude: 30.1 };
    const payload = tripPayload({ ...draft, days: { 2: { ...draft.days[2], ideas: [idea] } } }, 'Winter trip');
    expect(payload.days[0].segments.at(-1)).toMatchObject({ id: 'idea-museum', title: 'Museum', idea: true });
    expect(payload.days[0].walkingSections).toHaveLength(1);
    expect(JSON.parse(sharedTripJson(payload)).days[0].segments.at(-1)).toMatchObject({ idea: true });
  });
  it('keeps the road geometry in the account payload and public copy', () => {
    const road = { geometry: [{ latitude: 59, longitude: 30 }, { latitude: 55, longitude: 37 }],
      distanceMeters: 690_000, durationSeconds: 27_000 };
    const firstDay = { stops: [], transfer: { from: 'Petersburg', to: 'Moscow', transport: 'CAR' as const,
      departure: '2026-12-31T10:00:00+03:00', arrival: '2026-12-31T17:30:00+03:00', road,
      cost: { amount: 1900, currency: 'RUB' }, bookingUrl: 'https://example.org/booking' } };
    const payload = tripPayload({ ...draft, days: { 1: firstDay, ...draft.days } }, 'Winter trip');
    expect(payload.legs[0]).toMatchObject({ ...road, transport: 'CAR', bookingUrl: 'https://example.org/booking' });
    const sharedLeg = JSON.parse(sharedTripJson(payload)).legs[0];
    expect(sharedLeg).toMatchObject({ ...road, cost: { amount: 1900, currency: 'RUB' } });
    expect(sharedLeg).not.toHaveProperty('bookingUrl');
  });
  it('excludes account details from the public file', () => {
    const payload = tripPayload(draft, 'Winter trip');
    const publicCopy = JSON.parse(sharedTripJson({
      ...payload, travelers: [{ name: 'Traveler', email: 'private@example.org' }],
    }));
    expect(publicCopy).toHaveProperty('days');
    expect(publicCopy).not.toHaveProperty('travelers');
    expect(publicCopy).not.toHaveProperty('documents');
    expect(publicCopy).not.toHaveProperty('budget');
  });

  it('preserves the selected day and converts map coordinate tuples to named coordinates', async () => {
    const payload = tripPayload(draft, 'Winter trip');
    expect(payload.days[0]).toMatchObject({
      date: '2027-01-01', note: 'River walk', accommodationId: 'lodging-2', walkingSections: [{
        fromSegmentId: 'a', toSegmentId: 'b', geometry: [{ longitude: 30, latitude: 59 }, { longitude: 31, latitude: 60 }],
        distanceMeters: 1500, durationSeconds: 900,
      }],
    });
    expect(payload.accommodations).toEqual([{
      id: 'lodging-2', cityId: 'city-1', provider: 'MANUAL',
      name: 'Hotel', address: 'Main Street', checkIn: '2027-01-01', checkOut: '2027-01-02',
      longitude: 30.1, latitude: 59.2, cost: { amount: 80, currency: 'EUR' },
    }]);
    expect(payload.legs).toEqual([{
      id: 'train-2', fromCityId: 'city-1', toCityId: 'city-2', transport: 'TRAIN',
      departureAt: '2027-01-01T10:00:00+03:00', arrivalAt: '2027-01-01T14:00:00+03:00', note: '001 Express',
    }]);
    expect(payload.budget?.limit).toEqual(draft.budget);
    expect(payload.documents).toEqual(draft.documents);
    expect(authFetch).not.toHaveBeenCalled();
    vi.mocked(authFetch).mockResolvedValue(new Response(JSON.stringify(payload)));
    await saveTripToAccount(draft, 'Winter trip');
    expect(authFetch).toHaveBeenCalledWith('/api/trips/first-trip', expect.objectContaining({
      body: JSON.stringify(payload), method: 'PUT',
    }));
  });
});
