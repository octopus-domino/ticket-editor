import { publicFetch } from '../journeys/api/publicFetch';
import { journeyError } from '../journeys/api/errorMessage';
import { authFetch, API_BASE } from '@/shared/api/client';
export interface WorkflowField {
  path: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}
export interface WorkflowStep {
  title: string;
  fields: WorkflowField[];
}
export interface WorkflowDefinition {
  version: 1;
  slug: string;
  title: string;
  description: string;
  templateId: string;
  steps: WorkflowStep[];
  completionMessage: string;
}
export interface ManagedWorkflow {
  definition: WorkflowDefinition;
  revision: number;
  published: boolean;
  shared: boolean;
  administrator: boolean;
}
export interface PublicWorkflow {
  definition: WorkflowDefinition;
  revision: number;
}
async function json<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw Object.assign(new Error(journeyError(response.status, error.error)), {
      status: response.status,
    });
  }
  return response.json() as Promise<T>;
}
export const workflowApi = {
  catalog: () => publicFetch(`${API_BASE}/api/public/workflows`).then(json<PublicWorkflow[]>),
  fields: (templateId: string) =>
    authFetch(`/api/workflows/template-fields?templateId=${encodeURIComponent(templateId)}`).then(
      json<WorkflowField[]>,
    ),
  list: () => authFetch('/api/workflows').then(json<ManagedWorkflow[]>),
  save: (definition: WorkflowDefinition, revision?: number) =>
    authFetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition, revision }),
    }).then(json<ManagedWorkflow>),
  publish: (slug: string, revision: number, shared: boolean) =>
    authFetch(`/api/workflows/${slug}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revision, shared }),
    }).then(json<ManagedWorkflow>),
  unpublish: async (slug: string) => {
    const r = await authFetch(`/api/workflows/${slug}/publication`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Не удалось снять с публикации');
  },
  get: (slug: string) =>
    publicFetch(`${API_BASE}/api/public/workflows/${encodeURIComponent(slug)}`).then(
      json<PublicWorkflow>,
    ),
  pdf: async (slug: string, revision: number, values: Record<string, string | boolean>) => {
    const r = await publicFetch(
      `${API_BASE}/api/public/workflows/${encodeURIComponent(slug)}/pdf`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, values }),
      },
    );
    if (!r.ok) {
      await json(r);
    }
    return r.blob();
  },
};
