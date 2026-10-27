// src/shared/api/client.ts
// Если VITE_API_BASE не задан — используем относительные пути.
// Vite dev-server проксирует /api на бэкенд → cookie работают как same-origin.

import { useAuthStore } from '@/auth/store';

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
      useAuthStore.getState().setSession(data.accessToken, data.user);
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
  const doFetch = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers, credentials: 'include' });
  };

  const token = useAuthStore.getState().accessToken;
  let res = await doFetch(token);

  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      const newToken = useAuthStore.getState().accessToken;
      res = await doFetch(newToken);
    } else {
      useAuthStore.getState().clear();
    }
  }
  return res;
}

export { API_BASE };