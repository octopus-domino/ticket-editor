import { SimpleStore } from '@/shared/store/store';
import type { User } from './types';
import { authApi } from './api';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  booting: boolean;
  error: string | null;
  offline: boolean;
}

const INITIAL: AuthState = {
  user: null,
  accessToken: null,
  booting: true,
  error: null,
  offline: false,
};

/**
 * Хосты, на которых заведомо нет бэкенда.
 * На них bootstrap() сразу уходит в offline-режим, не делая запросов к /api.
 */
const STATIC_HOST_PATTERNS: RegExp[] = [
  /\.github\.io$/i,          // GitHub Pages
  /\.gitlab\.io$/i,          // GitLab Pages
  /\.netlify\.app$/i,        // Netlify
  /\.vercel\.app$/i,         // Vercel
  /\.surge\.sh$/i,           // Surge
];

function isStaticHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return STATIC_HOST_PATTERNS.some((re) => re.test(host));
}

export class AuthStore extends SimpleStore<AuthState> {
  constructor() {
    super(INITIAL);
  }

  setSession(accessToken: string, user: User): void {
    this.setState({ user, accessToken, booting: false, error: null, offline: false });
  }

  clear(): void {
    this.setState({ user: null, accessToken: null, booting: false, error: null, offline: false });
  }

  async bootstrap(): Promise<void> {
    // Хостинг статики (GH Pages и т.п.) — бэкенда нет by design.
    // Не стучимся в /api, сразу локальный режим.
    if (isStaticHost()) {
      console.info('[bootstrap] static host detected, skipping API — offline mode');
      this.setState({
        user: { id: 'offline', email: 'offline@local', name: 'Локальный режим' },
        accessToken: null,
        booting: false,
        error: null,
        offline: true,
      });
      return;
    }

    try {
      const data = await authApi.refresh();
      if (data) {
        this.setSession(data.accessToken, data.user);
      } else {
        // 401 — валидной refresh-cookie нет, юзер не залогинен
        this.clear();
      }
    } catch (e) {
      const msg = (e as Error).message || '';
      const isNetworkError = /Failed to fetch|NetworkError|Load failed|fetch failed/i.test(msg);
      // Страховка: если хост всё же динамический, но API отвечает
      // 404/405/501 — значит, за этим URL бэкенда нет
      const isMissingApi = /^HTTP (404|405|501)\b/.test(msg);

      if (isNetworkError || isMissingApi) {
        console.warn('[bootstrap] backend unavailable, switching to offline mode:', e);
        this.setState({
          user: { id: 'offline', email: 'offline@local', name: 'Локальный режим' },
          accessToken: null,
          booting: false,
          error: null,
          offline: true,
        });
      } else {
        // HTTP 500/403/... — бэкенд есть, но сломан → покажем login
        console.error('[bootstrap] backend returned error:', e);
        this.clear();
      }
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const data = await authApi.login(email, password);
      this.setSession(data.accessToken, data.user);
    } catch (e) {
      this.setState((s) => ({ ...s, error: (e as Error).message }));
      throw e;
    }
  }

  async register(email: string, password: string, name?: string): Promise<void> {
    try {
      const data = await authApi.register(email, password, name);
      this.setSession(data.accessToken, data.user);
    } catch (e) {
      this.setState((s) => ({ ...s, error: (e as Error).message }));
      throw e;
    }
  }

  async logout(): Promise<void> {
    await authApi.logout().catch(() => undefined);
    this.clear();
  }
}

export const authStore = new AuthStore();
export const useAuthStore = {
  getState: () => authStore.getState(),
  subscribe: authStore.subscribe,
  store: authStore,
};