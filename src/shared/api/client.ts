import { getHttpSession } from './session';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      return await getHttpSession().refresh();
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = typeof input === 'string' && input.startsWith('/') ? API_BASE + input : input;

  const doFetch = async (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    try {
      return await fetch(url, {
        ...init,
        headers,
        credentials: 'include',
        signal: init.signal ?? AbortSignal.timeout(30_000),
      });
    } catch {
      throw new Error('Сетевая ошибка. Проверьте подключение.');
    }
  };

  const token = getHttpSession().token();
  let res = await doFetch(token);

  // Если бэкенд вернул 401 (а не 302) — пробуем обновить токен
  if (res.status === 401) {
    const currentToken = getHttpSession().token();
    if (currentToken !== token) return currentToken ? doFetch(currentToken) : res;
    const ok = await tryRefresh();
    if (ok) {
      const newToken = getHttpSession().token();
      res = await doFetch(newToken);
    } else if (getHttpSession().token() === token) {
      getHttpSession().clear();
    }
  }
  return res;
}

export { API_BASE };
