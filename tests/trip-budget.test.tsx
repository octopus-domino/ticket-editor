import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { t } from '../src/shared/i18n';
import { journeyRequest } from '../src/features/journeys/api/journeys';
import { TripDetailsEditor } from '../src/features/journeys/ui/TripDetailsEditor';

vi.mock('../src/features/journeys/api/journeys', () => ({ journeyRequest: vi.fn() }));

test('loads dated rates without transmitting the trip budget or expenses', async () => {
  const request = vi.mocked(journeyRequest).mockResolvedValue({ date: '2026-11-20', rates: { EUR: 100, RUB: 1 } });
  render(<TripDetailsEditor budget={{ currency: 'EUR', amount: 150 }} documents={[]}
    costs={[{ currency: 'EUR', amount: 80 }, { currency: 'RUB', amount: 2000 }]} onChange={vi.fn()} />);
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText(t('Trip budget'), { selector: 'summary' }));
  fireEvent.click(screen.getByRole('button', { name: t('Load exchange rates') }));
  expect(await screen.findByText('2026-11-20')).toBeVisible();
  expect(screen.getByText(content => content.includes(t('Planned expenses')))).toHaveTextContent(/10\s?000/);
  expect(request).toHaveBeenCalledWith('/api/journeys/routes/places/rates', { signal: expect.any(AbortSignal) });
});
