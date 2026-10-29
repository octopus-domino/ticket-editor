// src/shared/api/client.ts
import { authStore } from '@/auth/store';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = await res.json() as { accessToken: string; user: any };
      authStore.setSession(data.accessToken, data.user);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' && input.startsWith('/') ? API_BASE + input : input;
  
  const doFetch = async (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    try {
      return await fetch(url, { ...init, headers, credentials: 'include' });
    } catch (e) {
      throw new Error('Сетевая ошибка. Проверьте подключение к интернету.');
    }
  };

  const token = authStore.getState().accessToken;
  let res = await doFetch(token);

  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      const newToken = authStore.getState().accessToken;
      res = await doFetch(newToken);
    } else {
      authStore.clear();
    }
  }
  return res;
}

export { API_BASE };