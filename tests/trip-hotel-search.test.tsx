import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { t } from '../src/shared/i18n';
import { journeyRequest } from '../src/features/journeys/api/journeys';
import { TripHotelSearch } from '../src/features/journeys/ui/TripHotelSearch';

vi.mock('../src/features/journeys/api/journeys', () => ({ journeyRequest: vi.fn() }));
vi.mock('../src/features/journeys/ui/RouteMap', () => ({ RouteMap: () => null }));

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
