import { guestRead, guestWrite } from '@/shared/session/guest';
import { t } from '@/shared/i18n/core';

export type GuestRecord = Record<string, unknown> & {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type GuestTables = Record<string, GuestRecord[]>;

export interface GuestModelImportItem {
  id?: string;
  name: string;
  values: unknown;
}

export function readGuestTables(): GuestTables {
  try {
    return JSON.parse(guestRead('resources') ?? '{}') as GuestTables;
  } catch {
    return {};
  }
}

export function saveGuestTables(tables: GuestTables): void {
  guestWrite('resources', JSON.stringify(tables));
}

export function buildGuestTree(tables: GuestTables): unknown[] {
  const folders = (tables.folder ?? []).map((record) => ({
    ...record,
    type: 'folder',
    parentId: record.parentId ?? null,
  }));
  const documents = (tables.document ?? []).map((record) => ({
    ...record,
    type: 'document',
    parentId: record.folderId ?? null,
  }));
  const templates = (tables.template ?? []).map((record) => ({
    ...record,
    type: 'template',
    parentId: record.folderId ?? null,
  }));
  const nodes = [...folders, ...documents, ...templates];

  // Treat malformed/deep local trees as truncated; never recurse without a bound.
  function children(parentId: unknown, depth = 0): unknown[] {
    if (depth > 20) return [];
    return nodes
      .filter((node) => node.parentId === parentId)
      .map((node) => ({
        ...node,
        children: node.type === 'folder' ? children(node.id, depth + 1) : [],
      }));
  }

  return children(null);
}

/** Match imports within their schema so a supplied ID cannot update another data set. */
export function importGuestModels(
  rows: GuestRecord[],
  items: GuestModelImportItem[],
  schemaId: unknown,
): { imported: number; issues: { index: number; message: string }[] } {
  const issues: { index: number; message: string }[] = [];
  let imported = 0;

  items.forEach((item, index) => {
    const existing = item.id
      ? rows.find((row) => row.id === item.id && row.schemaId === schemaId)
      : undefined;
    if (item.id && !existing) {
      issues.push({ index, message: t('Data set not found') });
      return;
    }

    const now = new Date().toISOString();
    if (existing) {
      Object.assign(existing, { ...item, updatedAt: now });
    } else {
      rows.push({ ...item, id: crypto.randomUUID(), schemaId, createdAt: now, updatedAt: now });
    }
    imported++;
  });

  return { imported, issues };
}

export function removeGuestFolder(tables: GuestTables, folderId: string): void {
  const removedIds = new Set([folderId]);
  let foundDescendants = true;

  // Collect the whole subtree before deleting records from the three resource tables.
  while (foundDescendants) {
    foundDescendants = false;
    for (const folder of tables.folder ?? []) {
      if (removedIds.has(String(folder.parentId)) && !removedIds.has(folder.id)) {
        removedIds.add(folder.id);
        foundDescendants = true;
      }
    }
  }

  for (const kind of ['folder', 'document', 'template']) {
    tables[kind] = (tables[kind] ?? []).filter(
      (record) => !removedIds.has(record.id) && !removedIds.has(String(record.folderId)),
    );
  }
}
