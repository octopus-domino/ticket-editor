import { t } from '@/shared/i18n/core';
import {
  readGuestTables,
  saveGuestTables,
  buildGuestTree,
  importGuestModels,
  removeGuestFolder,
  type GuestModelImportItem,
} from './guestResources';

const reply = (value: unknown, status = 200) => Response.json(value, { status });

/** Resolve session IDs into inline input; the stateless renderer must not load server records. */
export function guestGenerationBody(raw: string) {
  const body = JSON.parse(raw) as Record<string, unknown>;
  const tables = readGuestTables();
  const template = (tables.template ?? []).find((r) => r.id === body.templateId);
  const schema = (tables.schema ?? []).find((r) => r.id === (template?.schemaId ?? body.schemaId));
  return {
    ...body,
    templateId: null,
    schemaId: null,
    inlineSlides: body.inlineSlides ?? template?.slides,
    bindings: body.bindings ?? template?.bindings ?? [],
    fields: schema?.fields ?? [],
    items: (body.items as Record<string, unknown>[]).map((item) => {
      const model = (tables.model ?? []).find((r) => r.id === item.dataModelId);
      return { ...item, dataModelId: null, inlineValues: item.inlineValues ?? model?.values ?? {} };
    }),
  };
}
/** This adapter is the only guest CRUD boundary. No network fallback is permitted. */
export async function guestApi(url: URL, init: RequestInit): Promise<Response> {
  const path = url.pathname;
  const method = init.method ?? 'GET';
  let body: Record<string, unknown> = {};
  try {
    if (init.body) body = JSON.parse(String(init.body)) as Record<string, unknown>;
  } catch {
    return reply({ error: t('Invalid file format') }, 400);
  }
  const tables = readGuestTables();
  const save = () => saveGuestTables(tables);
  const types: Record<string, string> = {
    '/api/templates': 'template',
    '/api/schemas': 'schema',
    '/api/data-models': 'model',
    '/api/workspace/documents': 'document',
    '/api/workspace/folders': 'folder',
  };
  if (path === '/api/workspace/tree') {
    return reply(buildGuestTree(tables));
  }
  if (path.startsWith('/api/history/')) return reply([]);
  const base = Object.keys(types).find((key) => path === key || path.startsWith(key + '/'));
  if (!base)
    return reply(
      {
        error: t(
          'Sign in to use server history, shared libraries, email and integrations. Your guest documents stay in this tab.',
        ),
      },
      403,
    );
  const kind = types[base];
  const rows = tables[kind] ?? (tables[kind] = []);
  const parts = path.slice(base.length).split('/').filter(Boolean);
  const id = parts[0];
  const action = parts[1];
  if (kind === 'model' && id === 'import' && method === 'POST') {
    const items = body.items as GuestModelImportItem[];
    if (!Array.isArray(items) || items.length > 10000)
      return reply({ error: t('Invalid file format') }, 400);
    const result = importGuestModels(rows, items, body.schemaId);
    save();
    return reply(result);
  }
  if (method === 'GET' && !id) {
    const schema = url.searchParams.get('schemaId');
    return reply(schema ? rows.filter((r) => r.schemaId === schema) : rows);
  }
  if (method === 'POST' && !id) {
    const now = new Date().toISOString();
    const record = {
      ...body,
      id: crypto.randomUUID(),
      name: String(body.name ?? ''),
      createdAt: now,
      updatedAt: now,
      ...(kind === 'document' ? { content: '{}' } : {}),
    };
    rows.push(record);
    save();
    return reply(record, 201);
  }
  const record = rows.find((r) => r.id === id);
  if (!record) return reply({ error: t('Document not found') }, 404);
  if (method === 'GET') return reply(record);
  if (method === 'PUT') {
    if (action === 'parent') {
      if (kind === 'folder') record.parentId = body.parentId ?? null;
      else record.folderId = body.parentId ?? null;
    } else Object.assign(record, body);
    record.updatedAt = new Date().toISOString();
    save();
    return reply(record);
  }
  if (method === 'DELETE') {
    if (
      kind === 'schema' &&
      [...(tables.model ?? []), ...(tables.template ?? [])].some((r) => r.schemaId === id)
    )
      return reply(
        {
          error: t(
            'This schema is used by data sets or documents. Detach it or remove the linked records first.',
          ),
        },
        409,
      );
    if (kind === 'folder') {
      removeGuestFolder(tables, id);
    } else {
      tables[kind] = rows.filter((record) => record.id !== id);
    }
    save();
    return new Response(null, { status: 204 });
  }
  return reply({ error: t('Action unavailable') }, 400);
}
