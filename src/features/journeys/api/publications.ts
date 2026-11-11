import { journeyRequest } from './journeys';
import type { JourneyDocument, JourneyDefinition, JourneyStatus } from '../domain/definitions';

export interface PublicationPage<T> {
  items: T[];
  page: number;
  pages: number;
  total: number;
}
export interface PublishedDocument {
  document: JourneyDocument;
  status: JourneyStatus;
  siteSlug: string | null;
}
export interface PublishedSite {
  site: JourneyDefinition;
  updatedAt: string;
}

/** Attach old resources only through locally held management-key proof. */
export async function restoreLocalPublications() {
  const claims: { type: string; id: string; key: string }[] = [];
  try {
    for (const name of Object.keys(localStorage)) {
      if (!name.startsWith('codoc:journey:')) continue;
      const resource = name.slice('codoc:journey:'.length);
      const site = resource.startsWith('site:');
      const id = site ? resource.slice(5) : resource;
      const key = localStorage.getItem(name) ?? '';
      if (/^[a-zA-Z0-9-]{3,48}$/.test(id) && key.length >= 32 && key.length <= 128)
        claims.push({ type: site ? 'site' : 'document', id, key });
    }
  } catch {
    return;
  }
  for (let offset = 0; offset < claims.length; offset += 100)
    await journeyRequest('/api/publications/claim', {
      method: 'POST',
      body: JSON.stringify(claims.slice(offset, offset + 100)),
    });
}

export const publicationsApi = {
  documents: (page: number, site: string, search: string) =>
    journeyRequest<PublicationPage<PublishedDocument>>(
      `/api/publications?${new URLSearchParams({ page: String(page), site, search })}`,
    ),
  sites: (page: number) =>
    journeyRequest<PublicationPage<PublishedSite>>(`/api/publications/sites?page=${page}`),
};
