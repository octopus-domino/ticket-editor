import { authFetch } from '@/shared/api/client';
import type { Asset } from './assets';

export interface Library {
  id: string;
  name: string;
  revision: number;
  role: 'owner' | 'editor' | 'viewer';
  items: Asset[];
}
export async function libraryRequest<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await authFetch(url, {
    method,
    ...(body
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
  });
  if (!r.ok)
    throw new Error(
      ((await r.json().catch(() => ({ error: `HTTP ${r.status}` }))) as { error: string }).error,
    );
  const text = await r.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
