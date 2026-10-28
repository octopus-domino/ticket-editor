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
      const isHttp404 = /^HTTP 404/.test(msg);

      // Network error ИЛИ 404 от статического хостинга (GH Pages без бэкенда)
      // → бэкенда нет → локальный режим
      if (isNetworkError || isHttp404) {
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