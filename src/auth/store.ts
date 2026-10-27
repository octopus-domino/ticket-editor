import { SimpleStore } from '@/shared/store/store';
import type { User } from './types';
import { authApi } from './api';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  booting: boolean;
  error: string | null;
}

const INITIAL: AuthState = {
  user: null,
  accessToken: null,
  booting: true,
  error: null,
};

export class AuthStore extends SimpleStore<AuthState> {
  constructor() {
    super(INITIAL);
  }

  setSession(accessToken: string, user: User): void {
    this.setState({ user, accessToken, booting: false, error: null });
  }

  clear(): void {
    this.setState({ user: null, accessToken: null, booting: false, error: null });
  }

  async bootstrap(): Promise<void> {
    const data = await authApi.refresh();
    if (data) {
      this.setSession(data.accessToken, data.user);
    } else {
      this.clear();
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