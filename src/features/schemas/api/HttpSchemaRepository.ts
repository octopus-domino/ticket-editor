import { authFetch } from '@/shared/api/client';
import type { DataSchema, FieldDef } from '../domain/DataSchema';
import type { SchemaRepository } from './SchemaRepository';
import { t } from '@/shared/i18n';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((e as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export class HttpSchemaRepository implements SchemaRepository {
  async list(): Promise<DataSchema[]> {
    return json(await authFetch('/api/schemas'));
  }
  async get(id: string): Promise<DataSchema> {
    return json(await authFetch(`/api/schemas/${encodeURIComponent(id)}`));
  }
  async create(input: { name: string; fields: FieldDef[] }): Promise<DataSchema> {
    return json(await authFetch('/api/schemas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }));
  }
  async update(id: string, input: { name: string; fields: FieldDef[] }): Promise<DataSchema> {
    return json(await authFetch(`/api/schemas/${encodeURIComponent(id)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }));
  }
  async delete(id: string): Promise<void> {
    const res = await authFetch(`/api/schemas/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.status === 409) throw new Error(t('This schema is used by data sets or templates. Remove the dependencies before deleting it.'));
    if (!res.ok && res.status !== 404) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? t('Could not delete the schema. Please try again.'));
    }
  }
}

export const httpSchemaRepository = new HttpSchemaRepository();
