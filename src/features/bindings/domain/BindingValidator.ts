import { t as __tr } from '@/shared/i18n';
import type { DataSchema } from '@/features/schemas/domain/DataSchema';
import { flattenFields } from '@/features/schemas/domain/SchemaInference';
import type { Binding } from './Binding';

export interface BindingIssue {
  readonly kind: 'missing' | 'unused' | 'required-unbound' | 'invalid-type';
  readonly path: string;
  readonly message: string;
}

export function validateBindings(bindings: readonly Binding[], schema: DataSchema): BindingIssue[] {
  const issues: BindingIssue[] = [];
  const known = new Set(flattenFields(schema.fields).map((f) => f.path));
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
    const field = schema.fields.find((item) => item.path === path);
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
    used.add(b.schemaPath);
  }

  for (const f of flattenFields(schema.fields)) {
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
