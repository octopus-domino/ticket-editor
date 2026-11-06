/**
 * Boundary tests for recognizeImage.
 *
 * Two module mocks:
 *  1. `authFetch` — replaces the network.
 *  2. `recognizedSlide` — wrapped so a single test can simulate an unexpected
 *     runtime error and verify the RecognitionError wrapper.
 *
 * The happy-path tests still call the real `recognizedSlide` because the
 * mock factory delegates to `actual.recognizedSlide`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api/client', () => ({
  authFetch: vi.fn(),
  API_BASE: '',
}));

vi.mock('@/features/image-template/domain/recognizedLayout', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/image-template/domain/recognizedLayout')>(
      '@/features/image-template/domain/recognizedLayout',
    );
  return { ...actual, recognizedSlide: vi.fn(actual.recognizedSlide) };
});

import { authFetch } from '@/shared/api/client';
import { recognizedSlide } from '@/features/image-template/domain/recognizedLayout';
import { recognizeImage } from '@/features/image-template/api/recognitionClient';
import { RecognitionError } from '@/features/image-template/domain/RecognitionError';

const mockedFetch = vi.mocked(authFetch);
const mockedRecognized = vi.mocked(recognizedSlide);

function respond(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const validDraft = {
  width: 800,
  height: 600,
  elements: [
    {
      type: 'text',
      x: 10,
      y: 10,
      width: 200,
      height: 40,
      properties: { text: 'Hello', fontSize: 20 },
    },
  ],
  warnings: [],
  engine: 'ocr' as const,
};

beforeEach(() => {
  mockedFetch.mockReset();
  mockedRecognized.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('recognizeImage', () => {
  it('posts to /api/recognition and forwards the abort signal', async () => {
    mockedFetch.mockResolvedValueOnce(respond(validDraft));
    const controller = new AbortController();
    await recognizeImage('data:image/png;base64,x', 'rus+eng', 'ocr', 'Scan', controller.signal);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe('/api/recognition');
    expect(init?.method).toBe('POST');
    expect(init?.signal).toBe(controller.signal);
    expect(JSON.parse(String(init?.body))).toEqual({
      image: 'data:image/png;base64,x',
      language: 'rus+eng',
      engine: 'ocr',
    });
  });

  it('returns the recognised slide on success', async () => {
    mockedFetch.mockResolvedValueOnce(respond(validDraft));
    const controller = new AbortController();
    const result = await recognizeImage(
      'data:image/png;base64,x',
      'rus+eng',
      'ocr',
      'Scan',
      controller.signal,
    );
    expect(result.slide.elements).toHaveLength(1);
    expect(result.slide.elements[0]).toMatchObject({ type: 'text', text: 'Hello' });
    expect(mockedRecognized).toHaveBeenCalledTimes(1);
  });

  it('surfaces the server error verbatim on non-2xx responses', async () => {
    mockedFetch.mockResolvedValueOnce(respond({ error: 'recognition.ocr_unavailable' }, 503));
    const controller = new AbortController();
    await expect(
      recognizeImage('data:image/png;base64,x', 'rus+eng', 'ocr', 'Scan', controller.signal),
    ).rejects.toThrow('recognition.ocr_unavailable');
  });

  it('falls back to "recognition.failed" if the server error body is empty', async () => {
    mockedFetch.mockResolvedValueOnce(respond({}, 500));
    const controller = new AbortController();
    await expect(
      recognizeImage('data:image/png;base64,x', 'rus+eng', 'ocr', 'Scan', controller.signal),
    ).rejects.toThrow('recognition.failed');
  });

  it('rethrows the domain RecognitionError with its cause intact', async () => {
    mockedFetch.mockResolvedValueOnce(respond({ width: 0, height: 0, elements: [] }));
    const controller = new AbortController();
    try {
      await recognizeImage('data:image/png;base64,x', 'rus+eng', 'ocr', 'Scan', controller.signal);
      expect.unreachable('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(RecognitionError);
      const rec = err as RecognitionError;
      expect(rec.code).toBe('recognition.invalid_result');
      expect(typeof rec.detail).toBe('string');
    }
  });

  it('wraps unexpected runtime errors in RecognitionError with a cause', async () => {
    mockedFetch.mockResolvedValueOnce(respond(validDraft));
    const boom = new TypeError('unexpected');
    mockedRecognized.mockImplementationOnce(() => {
      throw boom;
    });
    const controller = new AbortController();
    try {
      await recognizeImage('data:image/png;base64,x', 'rus+eng', 'ocr', 'Scan', controller.signal);
      expect.unreachable('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(RecognitionError);
      const rec = err as RecognitionError;
      expect(rec.code).toBe('recognition.invalid_result');
      expect(rec.cause).toBe(boom);
    }
  });

  it('logs the concrete reason to the developer console', async () => {
    const errorSpy = vi.spyOn(console, 'error');
    mockedFetch.mockResolvedValueOnce(respond({ width: 0, height: 0, elements: [] }));
    const controller = new AbortController();
    await recognizeImage(
      'data:image/png;base64,x',
      'rus+eng',
      'ocr',
      'Scan',
      controller.signal,
    ).catch(() => undefined);
    expect(errorSpy).toHaveBeenCalledWith(
      '[recognition] result rejected',
      expect.objectContaining({ detail: expect.any(String) }),
    );
  });
});