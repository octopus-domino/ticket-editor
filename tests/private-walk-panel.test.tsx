import { forwardRef, useImperativeHandle } from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RoutePlacePanel } from '../src/features/journeys/ui/RoutePlacePanel';
const save = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('../src/features/journeys/ui/RouteWalk', () => ({ RouteWalk: forwardRef(function Walk(_props, ref) {
  useImperativeHandle(ref, () => ({ save })); return null;
}) }));
vi.mock('../src/features/journeys/ui/RouteHotels', () => ({ RouteHotels: () => null }));
const stop = { id: 'city', label: 'Petersburg', latitude: 59.9, longitude: 30.3, zone: 'Europe/Moscow', stayMinutes: 0 };
const walk = { version: 1, title: 'River walk', points: [{ name: 'Start', lat: 59.9, lng: 30.3 }, { name: 'End', lat: 59.91, lng: 30.31 }],
  route: { legs: [{ fromIndex: 0, toIndex: 1, geometry: [[59.9, 30.3], [59.91, 30.31]], distanceMeters: 900, durationSeconds: 600 }] } };
beforeEach(() => { save.mockClear(); HTMLDialogElement.prototype.showModal = vi.fn(); });
afterEach(cleanup);
it('opens the sole walk editor and only accepts a transfer from its iframe and channel', async () => {
  render(<RoutePlacePanel stop={stop} visitDate="2026-11-18" onAdd={vi.fn()} onNotes={vi.fn()} onWalkChange={vi.fn()} onWalkBusy={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { hidden: true }));
  const frame = document.querySelector('iframe')!;
  const url = new URL(frame.src);
  expect(url.pathname).toBe('/private-journey/');
  const data = { type: 'private-walk:complete', channel: url.searchParams.get('channel'), walk };
  await act(async () => window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, origin: 'https://unrelated.example', data })));
  expect(save).not.toHaveBeenCalled();
  await act(async () => window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, origin: location.origin, data })));
  expect(save).toHaveBeenCalledOnce();
  expect(save.mock.calls[0][1][0].coordinates).toEqual([[30.3, 59.9], [30.31, 59.91]]);
  expect(document.querySelector('iframe')).toBeNull();
});
