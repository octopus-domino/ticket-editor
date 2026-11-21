import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { t } from '../src/shared/i18n';
import { journeyRequest } from '../src/features/journeys/api/journeys';
import { TripHotelSearch } from '../src/features/journeys/ui/TripHotelSearch';

vi.mock('../src/features/journeys/api/journeys', () => ({ journeyRequest: vi.fn() }));
vi.mock('../src/features/journeys/ui/RouteMap', () => ({
  RouteMap: ({ stops, focusStopId, onStopSelect }: {
    stops: { id: string; label: string }[]; focusStopId?: string; onStopSelect?: (id: string) => void;
  }) => <div data-testid="hotel-map" data-focused={focusStopId}>{stops.map(stop =>
    <button type="button" key={stop.id} onClick={() => onStopSelect?.(stop.id)}>{`Map: ${stop.label}`}</button>)}</div>,
}));

test('filters available hotels and saves the chosen hotel with its provider and dates', async () => {
  const request = vi.mocked(journeyRequest).mockResolvedValue({
    available: true, provider: 'OSTROVOK_MCP', hotels: [
      { id: '1', name: 'Hotel One', stars: 4, freeCancellation: true, cost: { amount: 3400, currency: 'RUB' } },
      { id: '2', name: 'Hotel Two', stars: 3, cost: { amount: 2500, currency: 'RUB' } },
    ],
  });
  const select = vi.fn();
  render(<TripHotelSearch city="Тверь" checkIn="2027-01-01" checkOut="2027-01-02" onSelect={select} />);
  fireEvent.click(screen.getByText(t('Find hotels')));
  fireEvent.click(screen.getByRole('button', { name: t('Search') }));
  await screen.findByText('Hotel Two');
  fireEvent.click(screen.getByRole('checkbox', { name: t('Free cancellation') }));
  expect(screen.queryByText('Hotel Two')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: t('Add hotel to trip') }));
  expect(select).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hotel One', provider: 'OSTROVOK_MCP',
    checkIn: '2027-01-01', checkOut: '2027-01-02', cost: { amount: 3400, currency: 'RUB' } }));
  expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({
    city: 'Тверь', checkIn: '2027-01-01', checkOut: '2027-01-02', guests: 2,
  });
});

test('synchronizes catalog hotel cards with available coordinates', async () => {
  vi.mocked(journeyRequest).mockResolvedValueOnce({
    available: true, provider: 'OSTROVOK_MCP', catalogOnly: true,
    hotels: [{ id: '1', name: 'Mapped Hotel', latitude: 55.75, longitude: 37.62 }],
  });
  render(<TripHotelSearch city="Moscow" checkIn="2027-01-01" checkOut="2027-01-02" onSelect={vi.fn()} />);
  fireEvent.click(screen.getByText(t('Find hotels')));
  fireEvent.click(screen.getByRole('button', { name: t('Search') }));
  fireEvent.click(await screen.findByRole('button', { name: 'Map: Mapped Hotel' }));
  const card = screen.getByRole('button', { name: 'Mapped Hotel' });
  expect(card).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: t('Hotels on the map') }));
  expect(screen.queryByTestId('hotel-map')).toBeNull();
  fireEvent.click(card);
  expect(screen.getByTestId('hotel-map')).toHaveAttribute('data-focused', '1');
});

test('shows only hotel candidates within 1 km in both the list and the map', async () => {
  vi.mocked(journeyRequest).mockResolvedValueOnce({
    available: true, provider: 'OSTROVOK_MCP', catalogOnly: true,
    hotels: [
      { id: 'near', name: 'Near hotel', latitude: 55.755, longitude: 37.62 },
      { id: 'far', name: 'Far hotel', latitude: 55.77, longitude: 37.62 },
      { id: 'unknown', name: 'No position' },
    ],
  });
  render(<TripHotelSearch city="Moscow" cityPoint={{ latitude: 55.75, longitude: 37.62 }}
    radiusMeters={1000} initiallyOpen checkIn="2027-01-01" checkOut="2027-01-02" onSelect={vi.fn()} />);
  expect(await screen.findByRole('button', { name: 'Map: Near hotel' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Near hotel' })).toBeInTheDocument();
  expect(screen.queryByText('Far hotel')).not.toBeInTheDocument();
  expect(screen.queryByText('Map: Far hotel')).not.toBeInTheDocument();
  expect(screen.queryByText('No position')).not.toBeInTheDocument();
});

test('shows city results and their markers when the provider has no hotels within 1 km', async () => {
  vi.mocked(journeyRequest).mockResolvedValueOnce({
    available: true, provider: 'OSTROVOK_MCP', catalogOnly: true,
    hotels: [{ id: 'far', name: 'City hotel', latitude: 55.78303, longitude: 37.579353 }],
  });
  render(<TripHotelSearch city="Moscow" cityPoint={{ latitude: 55.754, longitude: 37.621 }}
    radiusMeters={1000} initiallyOpen checkIn="2027-01-01" checkOut="2027-01-02" onSelect={vi.fn()} />);
  expect(await screen.findByRole('button', { name: 'Map: City hotel' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'City hotel' })).toBeInTheDocument();
  expect(screen.getByText(t('No hotels found within 1 km. Showing results for the city.'))).toBeInTheDocument();
});
