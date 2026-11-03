import { afterEach, expect, it, vi } from 'vitest';
import { authFetch } from '@/shared/api/client';
import { configureHttpSession } from '@/shared/api/session';

afterEach(() => {
  vi.unstubAllGlobals();
  configureHttpSession({ token: () => null, refresh: async () => false, clear: () => {} });
});
it('does not clear a newer session when an old request returns unauthorized', async () => {
  let token = 'old';
  let respond!: (response: Response) => void;
  const refresh = vi.fn(async () => false),
    clear = vi.fn();
  configureHttpSession({ token: () => token, refresh, clear });
  const fetch = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    )
    .mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const pending = authFetch('/api/templates');
  token = 'new';
  respond(new Response('{}', { status: 401 }));
  expect((await pending).status).toBe(200);
  expect(refresh).not.toHaveBeenCalled();
  expect(clear).not.toHaveBeenCalled();
});
it('shares one refresh across concurrent unauthorized requests and retries with the new token', async () => {
  let token = 'old';
  const refresh = vi.fn(async () => {
    await Promise.resolve();
    token = 'new';
    return true;
  });
  configureHttpSession({ token: () => token, refresh, clear: vi.fn() });
  const fetch = vi.fn(
    async (_input: unknown, init: RequestInit) =>
      new Response('{}', {
        status: new Headers(init.headers).get('Authorization') === 'Bearer new' ? 200 : 401,
      }),
  );
  vi.stubGlobal('fetch', fetch);
  const responses = await Promise.all([authFetch('/api/models'), authFetch('/api/templates')]);
  expect(responses.map((response) => response.status)).toEqual([200, 200]);
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(4);
});
it('clears an expired session without retrying forever', async () => {
  const clear = vi.fn();
  configureHttpSession({ token: () => 'old', refresh: async () => false, clear });
  const fetch = vi.fn(async () => new Response('{}', { status: 401 }));
  vi.stubGlobal('fetch', fetch);
  expect((await authFetch('/api/templates')).status).toBe(401);
  expect(clear).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});
