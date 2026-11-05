import { authFetch } from '@/shared/api/client';
import type { DataModel } from '../domain/DataModel';
import type { DataModelRepository } from './DataModelRepository';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((e as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export class HttpDataModelRepository implements DataModelRepository {
  async importMany(
    schemaId: string,
    items: { id?: string; name: string; values: Record<string, unknown> }[],
  ): Promise<{
    imported: number;
    issues: { index: number; message: string }[];
  }> {
    return json(
      await authFetch('/api/data-models/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaId, items }),
      }),
    );
  }
  async list(schemaId?: string): Promise<DataModel[]> {
    const qs = schemaId ? `?schemaId=${encodeURIComponent(schemaId)}` : '';
    return json(await authFetch(`/api/data-models${qs}`));
  }
  async get(id: string): Promise<DataModel | null> {
    const res = await authFetch(`/api/data-models/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    return json(res);
  }
  async create(input: {
    schemaId: string;
    name: string;
    values: Record<string, unknown>;
  }): Promise<DataModel> {
    return json(
      await authFetch('/api/data-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
  }
  async update(
    id: string,
    patch: { name: string; values: Record<string, unknown> },
  ): Promise<DataModel> {
    return json(
      await authFetch(`/api/data-models/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }),
    );
  }
  async delete(id: string): Promise<void> {
    const res = await authFetch(`/api/data-models/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  }
}

export const httpDataModelRepository = new HttpDataModelRepository();
