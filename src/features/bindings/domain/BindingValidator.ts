import { t as __tr } from '@/shared/i18n';
import type { DataSchema } from '@/features/schemas/domain/DataSchema';
import { flattenFields } from '@/features/schemas/domain/SchemaInference';
import type { Binding } from './Binding';
import { tableArrayFields } from '@/lib/arrayTable';
import type { Slide, TableElement } from '@/shared/types';

export interface BindingIssue {
  readonly kind: 'missing' | 'unused' | 'required-unbound' | 'invalid-type';
  readonly path: string;
  readonly message: string;
}

export function validateBindings(bindings: readonly Binding[], schema: DataSchema, slides: readonly Slide[] = []): BindingIssue[] {
  const issues: BindingIssue[] = [];
  const known = new Map(flattenFields(schema.fields).map((f) => [f.path, f]));
  const tables = new Map<string, TableElement>();
  for (const slide of slides) for (const element of slide.elements) {
    if (element.type === 'table') tables.set(element.id, element);
  }
  const used = new Set<string>();

  for (const b of bindings) {
    if (b.status === 'ignored') continue;
    if (b.status === 'invalid-type')
      issues.push({
        kind: 'invalid-type',
        path: b.schemaPath,
        message: __tr("Несовместимый тип: {0}", b.schemaPath),
      });
    const path = b.schemaPath.replace(/\[\d+\]/g, '');
    const field = known.get(path);
    if (
      field &&
      b.expectedType &&
      (b.expectedType === 'image' || b.expectedType === 'array'
        ? field.type !== b.expectedType
        : field.type === 'image' || field.type === 'object' || field.type === 'array')
    ) {
      issues.push({
        kind: 'invalid-type',
        path: b.schemaPath,
        message: __tr("Несовместимый тип: {0}", b.schemaPath),
      });
    }
    if (!known.has(path)) {
      issues.push({
        kind: 'missing',
        path: b.schemaPath,
        message: __tr("Поле \"{0}\" отсутствует в схеме", b.schemaPath),
      });
    }
    used.add(path);
    const table = tables.get(b.elementId);
    if (table && b.expectedType === 'array' && field?.type === 'array') {
      for (const relative of tableArrayFields(table, b.placeholder)) {
        const itemPath = `${path}.${relative}`;
        if (known.has(itemPath)) used.add(itemPath);
        else issues.push({
          kind: 'missing',
          path: itemPath,
          message: __tr("Поле \"{0}\" отсутствует в схеме", itemPath),
        });
      }
    }
  }

  for (const f of known.values()) {
    if (f.type === 'object' || f.type === 'array') continue;
    if (!used.has(f.path)) {
      issues.push({
        kind: f.required ? 'required-unbound' : 'unused',
        path: f.path,
        message: f.required
          ? __tr("Обязательное поле \"{0}\" ни к чему не привязано", f.path)
          : __tr("Поле \"{0}\" не используется", f.path),
      });
    }
  }
  return issues;
}
