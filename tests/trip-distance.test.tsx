import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { t } from '../src/shared/i18n';
import { journeyRequest } from '../src/features/journeys/api/journeys';
import { requestRoadVia } from '../src/features/journeys/api/routePlanner';
import { TripDistanceTool } from '../src/features/journeys/ui/TripDistanceTool';

vi.mock('../src/features/journeys/api/journeys', () => ({ journeyRequest: vi.fn() }));
vi.mock('../src/features/journeys/ui/RouteMap', () => ({
  RouteMap: ({ onPick }: { onPick: (point: { latitude: number; longitude: number }) => void }) => <>
    <button onClick={() => onPick({ latitude: 0, longitude: 179 })}>A</button>
    <button onClick={() => onPick({ latitude: 0, longitude: -179 })}>B</button>
  </>,
}));

test('measures across the date line and discards a road request when points change', async () => {
  const request = vi.mocked(journeyRequest);
  request.mockImplementationOnce(() => new Promise(() => undefined));
  request.mockResolvedValueOnce({ coordinates: [[179, 0], [-179, 0]], distanceMeters: 230_000, durationSeconds: 9000 });
  render(<TripDistanceTool />);
  fireEvent.click(screen.getByRole('button', { name: 'A' }));
  fireEvent.click(screen.getByRole('button', { name: 'B' }));
  expect(screen.getByText(text => text.includes(t('Straight-line distance')))).toHaveTextContent(/222/);
  fireEvent.click(screen.getByRole('button', { name: t('Road distance') }));
  const signal = request.mock.calls[0][1]?.signal;
  fireEvent.click(screen.getByRole('button', { name: t('Undo') }));
  expect(signal?.aborted).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'B' }));
  fireEvent.click(screen.getByRole('button', { name: t('Road distance') }));
  await waitFor(() => expect(screen.getByText(text => text.includes(t('Road distance')) && text.includes('230'))).toBeVisible());
  expect(localStorage.getItem('codoc/trip-planner/draft/v2')).toBeNull();
});

test('routes through the intermediate point and includes its geometry only once', async () => {
  const request = vi.mocked(journeyRequest);
  request.mockReset();
  request.mockResolvedValueOnce({ coordinates: [[30, 59], [35, 57]], distanceMeters: 450_000, durationSeconds: 18_000 });
  request.mockResolvedValueOnce({ coordinates: [[35, 57], [37, 55]], distanceMeters: 290_000, durationSeconds: 11_000 });
  const start = { longitude: 30, latitude: 59 };
  const via = { longitude: 35, latitude: 57 };
  const end = { longitude: 37, latitude: 55 };
  const result = await requestRoadVia(start, end, [via], new AbortController().signal);
  expect(request.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
    { start, end: via, mode: 'car' }, { start: via, end, mode: 'car' },
  ]);
  expect(result).toEqual({
    coordinates: [[30, 59], [35, 57], [37, 55]], distanceMeters: 740_000, durationSeconds: 29_000,
  });
});
