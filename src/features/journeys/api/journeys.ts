import { publicFetch } from './publicFetch';
import { journeyError } from './errorMessage';
import { API_BASE, authFetch } from '@/shared/api/client';
import { getHttpSession } from '@/shared/api/session';
import { normalizedProposalData } from '../domain/proposal';
import type {
  CreatedJourney,
  GuestReply,
  JourneyDefinition,
  JourneyDocument,
  JourneyKind,
  JourneyBatch,
  JourneyStatus,
} from '../domain/definitions';
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const authenticated = path.startsWith('/api/publications') || !!getHttpSession().token();
  const response = await (authenticated ? authFetch : publicFetch)(
    authenticated ? path : `${API_BASE}${path}`,
    {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const code = typeof body.details === 'string' && body.details.startsWith('journey.') ? body.details : body.error;
    throw Object.assign(new Error(journeyError(response.status, code)), {
      status: response.status,
    });
  }
  const body = await response.text();
  return body ? (JSON.parse(body) as T) : (undefined as T);
}
export const journeyApi = {
  batchZip: async (id: string, key: string) => {
    const response = await (key ? publicFetch : authFetch)(`${key ? API_BASE : ''}/api/${key ? 'journeys' : 'publications'}/batches/${encodeURIComponent(id)}/zip`, {
      headers: { 'X-Management-Key': key },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})); throw new Error(journeyError(response.status, body.error));
    }
    return response.blob();
  },
  batch: (id: string, key: string) =>
    request<JourneyBatch>(`/api/${key ? 'journeys' : 'publications'}/batches/${encodeURIComponent(id)}`, {
      headers: { 'X-Management-Key': key },
    }),
  status: (id: string) => request<JourneyStatus>(`/api/journeys/${encodeURIComponent(id)}/status`),
  changeStatus: (id: string, key: string, action: 'REVOKE' | 'RESTORE' | 'RESET_USAGE') =>
    request<JourneyStatus>(`/api/${key ? 'journeys' : 'publications'}/${encodeURIComponent(id)}/status`, {
      method: 'POST', headers: { 'X-Management-Key': key }, body: JSON.stringify({ action }),
    }),
  consume: (id: string, key: string) =>
    request<JourneyStatus>(
      `/api/${key ? 'journeys' : 'publications'}/${encodeURIComponent(id)}/consume`,
      {
        method: 'POST',
        headers: { 'X-Management-Key': key },
      },
    ),
  batchPdf: async (id: string, key: string) => {
    const response = await (key ? publicFetch : authFetch)(
      `${key ? API_BASE : ''}/api/${key ? 'journeys' : 'publications'}/batches/${encodeURIComponent(id)}/pdf`,
      {
        headers: { 'X-Management-Key': key },
      },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(journeyError(response.status, body.error));
    }
    return response.blob();
  },
  create: (
    kind: JourneyKind,
    title: string,
    data: Record<string, string>,
    recipients: string[],
    rows?: Record<string, string>[],
  ) =>
    request<CreatedJourney[]>('/api/journeys', {
      method: 'POST',
      body: JSON.stringify({
        kind,
        title,
        data: kind === 'PROPOSAL' ? normalizedProposalData(data) : data,
        recipients,
        rows,
      }),
    }),
  get: (id: string) => request<JourneyDocument>(`/api/journeys/${encodeURIComponent(id)}`),
  manage: (id: string, key: string) =>
    request<JourneyDocument>(
      key
        ? `/api/journeys/${encodeURIComponent(id)}/manage`
        : `/api/publications/${encodeURIComponent(id)}`,
      {
        headers: { 'X-Management-Key': key },
      },
    ),
  update: (document: JourneyDocument, key: string) =>
    request<JourneyDocument>(
      `/api/${key ? 'journeys' : 'publications'}/${encodeURIComponent(document.id)}`,
      {
        method: 'PUT',
        headers: { 'X-Management-Key': key },
        body: JSON.stringify({
          ...document,
          data:
            document.kind === 'PROPOSAL' ? normalizedProposalData(document.data) : document.data,
        }),
      },
    ),
  revoke: (id: string, key: string) =>
    request<void>(`/api/${key ? 'journeys' : 'publications'}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-Management-Key': key },
    }),
  guests: (id: string, key: string) =>
    request<GuestReply[]>(
      `/api/${key ? 'journeys' : 'publications'}/${encodeURIComponent(id)}/responses`,
      {
        headers: { 'X-Management-Key': key },
      },
    ),
  respond: (id: string, name: string, attending: boolean, responseKey: string) =>
    request<void>(`/api/journeys/${encodeURIComponent(id)}/responses`, {
      method: 'POST',
      body: JSON.stringify({ name, attending, responseKey }),
    }),
  site: (slug: string) =>
    request<JourneyDefinition>(`/api/journey-sites/${encodeURIComponent(slug)}`),
  createSite: (site: JourneyDefinition) =>
    request<{ site: JourneyDefinition; managementKey: string }>('/api/journey-sites', {
      method: 'POST',
      body: JSON.stringify(site),
    }),
  updateSite: (site: JourneyDefinition, key: string) =>
    request<JourneyDefinition>(
      key
        ? `/api/journey-sites/${encodeURIComponent(site.slug)}`
        : `/api/publications/sites/${encodeURIComponent(site.slug)}`,
      {
        method: 'PUT',
        headers: { 'X-Management-Key': key },
        body: JSON.stringify(site),
      },
    ),
};
export { request as journeyRequest };
export const pdfUrl = (id: string, archive = false) =>
  `${API_BASE}/api/journeys/${encodeURIComponent(id)}/pdf${archive ? '?archive=true' : ''}`;
const domain = (import.meta.env.VITE_PUBLIC_DOMAIN as string | undefined) ?? 'codoc.site';
const deployed = () =>
  window.location.hostname === domain || window.location.hostname.endsWith(`.${domain}`);
export const publicUrl = (id: string) =>
  deployed()
    ? `https://go.${domain}/${encodeURIComponent(id)}`
    : `${window.location.origin}/d/${encodeURIComponent(id)}`;
export const siteUrl = (slug: string) =>
  deployed()
    ? `https://${slug}.${domain}`
    : `${window.location.origin}/s/${encodeURIComponent(slug)}`;
export const workspaceUrl = (path: string) => (deployed() ? `https://www.${domain}${path}` : path);
export function managementUrl(id: string, key: string) {
  return `${window.location.origin}/manage/${encodeURIComponent(id)}#key=${encodeURIComponent(key)}`;
}
export function rememberKey(id: string, key: string) {
  try {
    localStorage.setItem(`codoc:journey:${id}`, key);
  } catch {
    /* The management link remains available for copying. */
  }
}
export function managementKey(id: string) {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  let key = hash.get('key') ?? '';
  if (!key)
    try {
      key = localStorage.getItem(`codoc:journey:${id}`) ?? '';
    } catch {
      /* Fragment links work without browser storage. */
    }
  if (key) rememberKey(id, key);
  return key;
}
