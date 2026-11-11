import { afterEach, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { JourneyScanner } from '@/features/journeys/ui/JourneyScanner';

const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (original) Object.defineProperty(navigator, 'mediaDevices', original);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
});

it('releases the camera and animation loop when leaving the registry', async () => {
  const stop = vi.fn();
  const source = { getTracks: () => [{ stop }] };
  const getUserMedia = vi.fn().mockResolvedValue(source);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.stubGlobal(
    'BarcodeDetector',
    class {
      detect = vi.fn().mockResolvedValue([]);
    },
  );
  vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
  const cancel = vi.fn();
  vi.stubGlobal('cancelAnimationFrame', cancel);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  const { unmount } = render(<JourneyScanner onCode={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Сканировать QR камерой' }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledOnce());
  await waitFor(() => expect(requestAnimationFrame).toHaveBeenCalled());
  unmount();
  expect(stop).toHaveBeenCalledOnce();
  expect(cancel).toHaveBeenCalledWith(1);
});

it('keeps manual entry available when native QR detection is unsupported', async () => {
  vi.stubGlobal('BarcodeDetector', undefined);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  render(<JourneyScanner onCode={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Сканировать QR камерой' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('вставьте ссылку'));
  expect(screen.getByRole('button', { name: 'Сканировать QR камерой' })).toBeEnabled();
});
