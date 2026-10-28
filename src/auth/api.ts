import { API_BASE, authFetch } from '@/shared/api/client';
import type { AuthResponse, User } from './types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    });
    return json<AuthResponse>(res);
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    return json<AuthResponse>(res);
  },

  async refresh(): Promise<AuthResponse | null> {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.status === 401) return null;   // валидной cookie нет — нормальный сценарий
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as AuthResponse;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      // logout в оффлайне — не ошибка
      console.warn('logout network error (ignored):', e);
    }
  },

  async me(): Promise<User> {
    const res = await authFetch('/api/auth/me');
    return json<User>(res);
  },
};