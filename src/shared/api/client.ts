import { getHttpSession } from './session';
import { t } from '@/shared/i18n/core';
import { isGuest } from '@/shared/session/guest';
import { guestApi,guestGenerationBody } from './guestApi';
import { describeApiFailure } from './businessErrors';

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
  if(isGuest()){
    const guestUrl=new URL(String(input),window.location.origin);
    if(guestUrl.pathname.startsWith('/api/export/')||guestUrl.pathname.startsWith('/api/recognition')||['/api/generate/sync','/api/generate/preview'].includes(guestUrl.pathname)){
      const body=guestUrl.pathname.startsWith('/api/generate/')?JSON.stringify(guestGenerationBody(String(init.body))):init.body;
      return fetch(API_BASE+guestUrl.pathname.replace('/api/','/api/guest/')+guestUrl.search,{...init,body,credentials:'omit',headers:{'Content-Type':'application/json'},signal:init.signal??AbortSignal.timeout(60000)}).then(describeApiFailure);
    }
    return guestApi(guestUrl,init);
  }
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
      throw new Error(t('Network error. Check your connection.'));
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
  return describeApiFailure(res);
}

export { API_BASE };
