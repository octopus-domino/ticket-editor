import { authFetch } from '@/shared/api/client';
import type { TemplateRepository } from './TemplateRepository';
import type {
  SaveTemplateInput,
  Template,
  TemplateSummary,
} from '../domain/Template';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((e as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export class HttpTemplateRepository implements TemplateRepository {

  async list(schemaId?: string): Promise<TemplateSummary[]> {
    const qs = schemaId ? `?schemaId=${encodeURIComponent(schemaId)}` : '';
    return json(await authFetch(`/api/templates${qs}`));
  }

  async get(id: string): Promise<Template | null> {
    const res = await authFetch(`/api/templates/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    return json(res);
  }

  async create(input: SaveTemplateInput): Promise<Template> {
    return json(await authFetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }));
  }

  async update(id: string, input: SaveTemplateInput): Promise<Template> {
    return json(await authFetch(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }));
  }

  async rename(id: string, name: string): Promise<Template> {
    return json(await authFetch(`/api/templates/${encodeURIComponent(id)}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }));
  }

  async delete(id: string): Promise<void> {
    const res = await authFetch(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
  }
}

export const httpTemplateRepository = new HttpTemplateRepository();