import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { t } from '../src/shared/i18n';
import TripPlannerDraft from '../src/features/journeys/ui/TripPlannerDraft';
import * as routes from '../src/features/journeys/api/routePlanner';
import * as journeys from '../src/features/journeys/api/journeys';

vi.mock('../src/features/journeys/ui/RouteMap', () => ({
  RouteMap: ({ onPick, legs, stops, onStopSelect, onStopMove, onLegSelect }: { onPick?: unknown;
    legs: { id?: string }[]; stops: { id: string; label: string }[]; onStopSelect?: (id: string) => void;
    onStopMove?: (id: string, point: { latitude: number; longitude: number }) => void;
    onLegSelect?: (id: string) => void }) => <>
    <span data-editable={Boolean(onPick)}>Legs: {legs.length}</span>
    {onStopSelect && stops.map(stop => <button key={stop.id} onClick={() => onStopSelect(stop.id)}>
      {stop.label} marker
    </button>)}
    {onStopMove && stops.map(stop => <button key={stop.id} onClick={() =>
      onStopMove(stop.id, { longitude: 37.7, latitude: 55.8 })}>Move {stop.label}</button>)}
    {onLegSelect && legs.map(leg => leg.id && <button key={leg.id} onClick={() =>
      onLegSelect(leg.id!)}>Route line</button>)}
  </>,
}));

beforeEach(() => localStorage.clear());

test('builds and saves an intercity road transfer from map markers', async () => {
  localStorage.setItem('codoc/trip-planner/draft/v2', JSON.stringify({
    id: 'trip-road', version: 2, startDate: '2026-12-31', endDate: '2027-01-01', days: {
      1: { city: 'Moscow', stops: [], cityPoint: { longitude: 37.6, latitude: 55.7 } },
      2: { city: 'Tver', stops: [], cityPoint: { longitude: 35.9, latitude: 56.8 } },
    },
  }));
  const request = vi.spyOn(routes, 'requestRoad').mockResolvedValue({
    coordinates: [[37.6, 55.7], [35.9, 56.8]], durationSeconds: 7200, distanceMeters: 180_000,
  });
  try {
    render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: t('Enter transfer manually') }));
    fireEvent.click(within(screen.getByRole('group', { name: t('Transport type') })).getByRole('button', { name: t('Car') }));
    fireEvent.click(screen.getByRole('button', { name: 'Moscow marker' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tver marker' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: t('Road distance') })));
    expect(request).toHaveBeenCalledWith({ longitude: 37.6, latitude: 55.7 },
      { longitude: 35.9, latitude: 56.8 }, 'car', expect.any(AbortSignal));
    fireEvent.change(screen.getByLabelText(`${t('Transfer cost')} RUB`), { target: { value: '1900' } });
    fireEvent.change(screen.getByLabelText(t('Booking link')), { target: { value: 'https://example.org/booking' } });
    fireEvent.click(screen.getByRole('button', { name: t('Save transfer') }));
    const stored = JSON.parse(localStorage.getItem('codoc/trip-planner/draft/v2')!);
    expect(stored.days[1].transfer).toMatchObject({
      from: 'Moscow', to: 'Tver', arrival: '2026-12-31T12:00:00+03:00',
      road: { durationSeconds: 7200, distanceMeters: 180_000,
        geometry: [{ longitude: 37.6, latitude: 55.7 }, { longitude: 35.9, latitude: 56.8 }] },
    });
    expect(screen.getByRole('button', { name: t('Trip map') })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getAllByRole('button', { name: 'Route line' }).at(-1)!);
    expect(within(screen.getByRole('region', { name: t('Transfer details') }))
      .getByRole('link', { name: t('Booking link') })).toHaveAttribute('href', 'https://example.org/booking');
    request.mockResolvedValueOnce({ coordinates: [[37.7, 55.8], [35.9, 56.8]],
      durationSeconds: 5400, distanceMeters: 140_000 });
    fireEvent.click(within(screen.getByRole('group', { name: t('Trip day') }))
      .getByRole('button', { name: t('Choose on map') }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Move Moscow' })));
    const moved = JSON.parse(localStorage.getItem('codoc/trip-planner/draft/v2')!);
    expect(moved.days[1].cityPoint).toEqual({ longitude: 37.7, latitude: 55.8 });
    expect(moved.days[1].transfer).toMatchObject({ arrival: '2026-12-31T11:30:00+03:00',
      road: { durationSeconds: 5400, distanceMeters: 140_000 } });
    fireEvent.click(screen.getByRole('button', { name: t('Undo') }));
    expect(JSON.parse(localStorage.getItem('codoc/trip-planner/draft/v2')!).days[1]).toEqual(stored.days[1]);
    fireEvent.click(screen.getByRole('button', { name: t('Redo') }));
    expect(JSON.parse(localStorage.getItem('codoc/trip-planner/draft/v2')!).days[1]).toEqual(moved.days[1]);
  } finally {
    request.mockRestore();
  }
});

test('persists a manual transfer with different departure and arrival offsets', () => {
  render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(t('Start date')), { target: { value: '2026-12-31' } });
  fireEvent.change(screen.getByLabelText(t('End date')), { target: { value: '2027-01-01' } });
  fireEvent.change(screen.getByLabelText(t('City')), { target: { value: 'Moscow' } });
  fireEvent.keyDown(screen.getByLabelText(t('City')), { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: t('Enter transfer manually') }));
  const departure = within(screen.getByRole('group', { name: t('Departure') }));
  const arrival = within(screen.getByRole('group', { name: t('Arrival') }));
  fireEvent.change(departure.getByLabelText(t('City')), { target: { value: 'Moscow' } });
  fireEvent.change(arrival.getByLabelText(t('City')), { target: { value: 'Yekaterinburg' } });
  fireEvent.change(arrival.getByLabelText(t('Time zone')), { target: { value: 'Asia/Yekaterinburg' } });
  fireEvent.change(arrival.getByLabelText(t('Arrival')), { target: { value: '2026-12-31T15:00' } });
  fireEvent.click(screen.getByRole('button', { name: t('Save transfer') }));
  const stored = JSON.parse(localStorage.getItem('codoc/trip-planner/draft/v2') ?? 'null');
  expect(stored.days[1].transfer).toMatchObject({
    transport: 'PLANE', from: 'Moscow', to: 'Yekaterinburg',
    departure: '2026-12-31T10:00:00+03:00', arrival: '2026-12-31T15:00:00+05:00',
  });
});

test('validates dates and saves a multi-day draft locally', () => {
  const { unmount } = render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(t('Start date')), { target: { value: '2026-12-31' } });
  fireEvent.change(screen.getByLabelText(t('End date')), { target: { value: '2026-12-31' } });
  fireEvent.click(screen.getByRole('button', { name: t('Save') }));
  expect(screen.getByRole('status').textContent).toBe(t('Choose at least two days for the trip.'));
  fireEvent.change(screen.getByLabelText(t('End date')), { target: { value: '2027-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: t('Save') }));
  expect(screen.getByRole('status').textContent).toBe(t('Trip saved on this device.'));
  unmount();
  render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
  expect((screen.getByLabelText(t('End date')) as HTMLInputElement).value).toBe('2027-01-01');
});

test('previews an authenticated iframe transfer and imports geometry only on confirmation', async () => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  const { unmount } = render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(t('Start date')), { target: { value: '2026-12-31' } });
  fireEvent.change(screen.getByLabelText(t('End date')), { target: { value: '2027-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: t('Next day') }));
  fireEvent.click(screen.getByRole('button', { name: /↗/ }));
  const frame = document.querySelector('iframe')!;
  const walk = {
    version: 1, title: 'River walk',
    points: [{ name: 'Pier', lat: 59, lng: 30 }, { name: 'Bridge', lat: 60, lng: 31 }],
    route: { legs: [{ fromIndex: 0, toIndex: 1, geometry: [[59, 30], [60, 31]],
      distanceMeters: 900, durationSeconds: 600 }] },
  };
  const data = { type: 'private-walk:complete', channel: new URL(frame.src).searchParams.get('channel'), walk };
  await act(async () => window.dispatchEvent(new MessageEvent('message', { source: window, origin: location.origin, data })));
  expect(screen.queryByText('River walk')).toBeNull();
  await act(async () => window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, origin: location.origin, data })));
  expect(screen.getByText('River walk')).toBeTruthy();
  expect(screen.getByText('Legs: 1')).toBeTruthy();
  expect(screen.queryByText('Pier')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: t('Use this walk') }));
  expect(screen.getByText('Pier')).toBeTruthy();
  expect(screen.getByText('Legs: 1').getAttribute('data-editable')).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: t('Undo') }));
  expect(screen.queryByText('Pier')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: t('Redo') }));
  expect(screen.getByText('Pier')).toBeTruthy();
  unmount();
  render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
  expect(screen.queryByText('Pier')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: t('Next day') }));
  expect(screen.getByText('Pier')).toBeTruthy();
  expect(screen.getByText('Legs: 1')).toBeTruthy();
  expect(screen.queryByRole('button', { name: t('Build walking route') })).toBeNull();
});

test('offers a preview for a valid shared walk URL without altering the URL', () => {
  const previousUrl = location.href;
  const walk = {
    version: 1, title: 'Shared walk',
    points: [{ lat: 59, lng: 30 }, { lat: 60, lng: 31 }],
    route: { legs: [{ fromIndex: 0, toIndex: 1, geometry: [[59, 30], [60, 31]],
      distanceMeters: 900, durationSeconds: 600 }] },
  };
  const encoded = btoa(JSON.stringify(walk)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = new URL(previousUrl);
  url.searchParams.set('walk', encoded);
  history.replaceState(null, '', url);
  try {
    render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: t('Preview shared walk') }));
    expect(screen.getByText('Shared walk')).toBeTruthy();
    expect(screen.getByText('Legs: 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t('Cancel') }));
    expect(screen.queryByText('Legs: 1')).toBeNull();
    expect(location.href).toBe(url.href);
  } finally {
    history.replaceState(null, '', previousUrl);
  }
});

test('keeps plans per day and preserves an older draft on day one', () => {
  localStorage.setItem('codoc/trip-planner/draft/v2', JSON.stringify({
    version: 2, startDate: '2026-12-30', endDate: '2027-01-01',
    stops: [{ id: 'old', label: 'Old stop', longitude: 30, latitude: 60, zone: 'UTC', stayMinutes: 0 }],
    importedWalk: undefined,
  }));
  const { unmount } = render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
  expect(screen.getByText('Old stop')).toBeTruthy();
  fireEvent.change(screen.getByLabelText(t('City')), { target: { value: 'Petersburg' } });
  fireEvent.keyDown(screen.getByLabelText(t('City')), { key: 'Enter' });
  const next = screen.getByRole('button', { name: t('Next day') });
  fireEvent.click(next);
  fireEvent.click(next);
  expect(screen.queryByText('Old stop')).toBeNull();
  fireEvent.change(screen.getByLabelText(t('City')), { target: { value: 'Moscow' } });
  fireEvent.keyDown(screen.getByLabelText(t('City')), { key: 'Enter' });
  fireEvent.change(screen.getByLabelText(t('End date')), { target: { value: '2026-12-31' } });
  fireEvent.click(screen.getByRole('button', { name: t('Save') }));
  expect(screen.getByRole('status').textContent).toBe(t('Some planned days are outside the trip dates.'));
  fireEvent.change(screen.getByLabelText(t('End date')), { target: { value: '2027-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: t('Save') }));
  unmount();
  render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
  expect(screen.getByText('Old stop')).toBeTruthy();
  expect(screen.getByDisplayValue('Petersburg')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: t('Next day') }));
  fireEvent.click(screen.getByRole('button', { name: t('Next day') }));
  expect(screen.getByDisplayValue('Moscow')).toBeTruthy();
});

test('opens the existing hotel search from the day summary', () => {
  localStorage.setItem('codoc/trip-planner/draft/v2', JSON.stringify({
    id: 'trip-hotel', version: 2, startDate: '2026-12-31', endDate: '2027-01-01',
    days: { 2: { city: 'Tver', cityPoint: { latitude: 56.86, longitude: 35.91 }, stops: [] } },
  }));
  render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
  const overview = screen.getByRole('region', { name: t('Trip overview') });
  fireEvent.click(within(overview).getByRole('button', { name: t('Find hotels') }));
  expect(screen.getByRole('heading', {name:'Tver'})).toBeVisible();
  const search = screen.getByLabelText(t('Guests')).closest('details')!;
  expect(search.open).toBe(true);
  expect(screen.queryByRole('button', { name: t('Trip map') })).toBeNull();
  expect(screen.getByText(t('Hotels within 1 km of this point'))).toBeVisible();
});

test('adds cities with address suggestions before choosing dates', async () => {
  const suggest = vi.spyOn(journeys, 'journeyRequest')
    .mockResolvedValueOnce([{ label: 'Moscow', latitude: 55.75, longitude: 37.62 }])
    .mockResolvedValueOnce([{ label: 'Tver', latitude: 56.86, longitude: 35.91 }]);
  try {
    render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
    fireEvent.change(screen.getByRole('combobox', { name: t('City') }), { target: { value: 'Mos' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Moscow' }, { timeout: 2000 }));
    fireEvent.click(screen.getByRole('button', { name: t('Add city') }));
    fireEvent.change(screen.getByRole('combobox', { name: t('City') }), { target: { value: 'Tve' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Tver' }, { timeout: 2000 }));
    const stored = JSON.parse(localStorage.getItem('codoc/trip-planner/draft/v2')!);
    expect(stored.days[1]).toMatchObject({ city: 'Moscow', cityPoint: { latitude: 55.75, longitude: 37.62 } });
    expect(stored.days[2]).toMatchObject({ city: 'Tver', cityPoint: { latitude: 56.86, longitude: 35.91 } });
    expect(screen.getByLabelText(t('Start date'))).toHaveValue('');
  } finally {
    suggest.mockRestore();
  }
});

test('uses a separate picture selector per connection and restores the chosen mode', async () => {
  const key = 'codoc/trip-planner/draft/v2';
  localStorage.setItem(key, JSON.stringify({ id: 'modes', version: 2, startDate: '', endDate: '', days: {
    1: { city: 'First', cityPoint: { latitude: 55, longitude: 37 }, stops: [] },
    2: { city: 'Second', cityPoint: { latitude: 55.01, longitude: 37 }, stops: [] },
    3: { city: 'Third', cityPoint: { latitude: 55.02, longitude: 37 }, stops: [] },
  } }));
  const request = vi.spyOn(routes, 'requestRoad').mockResolvedValue({
    coordinates: [[37, 55], [37, 55.01]], durationSeconds: 1200, distanceMeters: 1200,
  });
  try {
    const view = render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>);
    const first = () => within(screen.getByRole('group', { name: 'First → Second' }));
    expect(first().getByRole('button', { name: t('Car') })).toHaveAttribute('aria-pressed', 'true');
    await act(async () => fireEvent.click(first().getByRole('button', { name: t('On foot') })));
    expect(request).toHaveBeenCalledWith({ latitude: 55, longitude: 37 }, { latitude: 55.01, longitude: 37 },
      'foot', expect.any(AbortSignal));
    expect(within(screen.getByRole('group', { name: 'Second → Third' }))
      .getByRole('button', { name: t('Car') })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem(key)!).days[2].incomingMode).toBe('WALK');
    view.unmount();
    await act(async () => { render(<MemoryRouter><TripPlannerDraft /></MemoryRouter>); });
    expect(first().getByRole('button', { name: t('On foot') })).toHaveAttribute('aria-pressed', 'true');
  } finally {
    request.mockRestore();
  }
});
