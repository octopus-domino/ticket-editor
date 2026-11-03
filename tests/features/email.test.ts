import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmailStore } from '@/features/email/state/EmailStore';
import { configureHttpSession } from '@/shared/api/session';
import type { EmailRequest } from '@/features/email/api/EmailClient';

afterEach(() => {
  vi.unstubAllGlobals();
  configureHttpSession({ token: () => null, refresh: async () => false, clear: () => {} });
});

const request: EmailRequest = {
  inlineSlides: [],
  items: [{ to: 'test@example.test', inlineValues: {} }],
};

describe('email sending', () => {
  it('reuses the same request identity after a network failure and prevents concurrent sends', async () => {
    let complete!: (response: Response) => void;
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            complete = resolve;
          }),
      );
    vi.stubGlobal('fetch', fetch);
    const store = new EmailStore();
    await store.send(request);
    expect(store.getState().sendDone).toBe(false);
    expect(store.getState().sendError).toBeTruthy();
    const retry = store.send(request);
    await store.send(request);
    expect(fetch).toHaveBeenCalledTimes(2);
    const first = JSON.parse(fetch.mock.calls[0][1].body);
    const second = JSON.parse(fetch.mock.calls[1][1].body);
    expect(first.requestId).toBe(second.requestId);
    complete(new Response(JSON.stringify({ sent: 1, failed: 0, errors: [] }), { status: 202 }));
    await retry;
    expect(store.getState().sendDone).toBe(true);
  });

  it('reports partial failures and never treats an empty result as success', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sent: 1,
            failed: 1,
            errors: [{ index: 1, to: 'other@example.test', message: 'SMTP rejected' }],
          }),
          { status: 202 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sent: 0, failed: 0, errors: [] }), { status: 202 }),
      );
    vi.stubGlobal('fetch', fetch);
    const store = new EmailStore();
    await store.send({ ...request, items: [...request.items, { to: 'other@example.test' }] });
    expect(store.getState().sendDone).toBe(false);
    expect(store.getState().sendError).toContain('Не отправлено: 1');
    await store.send(request);
    expect(store.getState().sendDone).toBe(false);
    expect(store.getState().sendError).toContain('некорректный результат');
  });
});
