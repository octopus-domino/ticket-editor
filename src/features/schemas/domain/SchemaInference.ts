import { t as __tr } from '@/shared/i18n';
import type { DataField, DataRoot } from '@/shared/types';
import type { FieldDef, FieldType } from './DataSchema';

const PH_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/* ============================================================
   Infer fields from slides: {{...}}, PlaceholderElement.fieldPath, image.src
   ============================================================ */

export function inferFieldsFromSlides(slides: unknown[]): FieldDef[] {
  const seen = new Map<string, FieldType>();

  const visit = (el: unknown): void => {
    if (!el || typeof el !== 'object') return;
    const e = el as Record<string, unknown>;

    if (e.type === 'placeholder' && typeof e.fieldPath === 'string' && e.fieldPath) {
      seen.set(e.fieldPath, mapType(e.fieldType as string));
      return;
    }

    for (const key of ['text', 'html', 'src', 'sample'] as const) {
      const v = e[key];
      if (typeof v !== 'string') continue;
      PH_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PH_RE.exec(v)) !== null) {
        if (!seen.has(m[1])) seen.set(m[1], 'string');
      }
    }
  };

  for (const slide of slides) {
    if (!slide || typeof slide !== 'object') continue;
    const arr = (slide as { elements?: unknown[] }).elements;
    if (Array.isArray(arr)) arr.forEach(visit);
  }

  return Array.from(seen.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, type]) => ({ path, type, required: true, label: path }));
}

function mapType(t?: string): FieldType {
  if (!t) return 'string';
  if (
    t === 'number' ||
    t === 'date' ||
    t === 'boolean' ||
    t === 'image' ||
    t === 'object' ||
    t === 'array'
  ) {
    return t;
  }
  return 'string';
}

/* ============================================================
   Flatten hierarchical fields into a flat list (path-dotted)
   ============================================================ */

export function flattenFields(fields: readonly FieldDef[]): FieldDef[] {
  const out: FieldDef[] = [];
  const walk = (arr: readonly FieldDef[], prefix: string): void => {
    for (const f of arr) {
      const full = prefix ? `${prefix}.${f.path}` : f.path;
      out.push({ ...f, path: full });
    }
  };
  walk(fields, '');
  return out;
}

/* ============================================================
   Legacy migration: DataRoot[] → DataSchema + values
   ============================================================ */

/**
 * Из старого `document.data` (DataRoot[]) собирает плоскую схему `FieldDef[]`.
 * Arrays/objects разворачиваются рекурсивно: `event.items.name`, `event.items.price`.
 */
export function schemaFromLegacyData(data: DataRoot[]): {
  name: string;
  fields: FieldDef[];
} {
  const fields: FieldDef[] = [];

  const walk = (prefix: string, fs: readonly DataField[]): void => {
    for (const f of fs) {
      const path = prefix ? `${prefix}.${f.name}` : f.name;
      fields.push({
        path,
        type:
          f.type === 'string' ||
          f.type === 'number' ||
          f.type === 'date' ||
          f.type === 'boolean' ||
          f.type === 'image' ||
          f.type === 'object' ||
          f.type === 'array'
            ? f.type
            : 'string',
        required: false,
        label: f.name,
      });
      if ((f.type === 'array' || f.type === 'object') && f.children && f.children.length > 0) {
        walk(path, f.children);
      }
    }
  };

  for (const root of data) {
    walk(root.name, root.fields);
  }

  return { name: __tr("Импорт из документа"), fields };
}

/**
 * Из старого `document.data` собирает плоский `Record<string, unknown>` —
 * sample-значения для одной модели.
 * Arrays/objects не сериализуются как значения (их некуда положить в плоскую модель),
 * только их дочерние скаляры.
 */
export function modelFromLegacyData(data: DataRoot[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  const walk = (prefix: string, fs: readonly DataField[]): void => {
    for (const f of fs) {
      const path = prefix ? `${prefix}.${f.name}` : f.name;
      if (f.type === 'array' || f.type === 'object') {
        if (f.children) walk(path, f.children);
        continue;
      }
      if (f.sample !== undefined && f.sample !== null) values[path] = f.sample;
    }
  };

  for (const root of data) {
    walk(root.name, root.fields);
  }

  return values;
}
