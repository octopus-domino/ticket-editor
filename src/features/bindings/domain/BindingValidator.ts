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
        message: `Несовместимый тип: ${b.schemaPath}`,
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
        message: `Несовместимый тип: ${b.schemaPath}`,
      });
    }
    if (!known.has(path)) {
      issues.push({
        kind: 'missing',
        path: b.schemaPath,
        message: `Поле "${b.schemaPath}" отсутствует в схеме`,
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
          ? `Обязательное поле "${f.path}" ни к чему не привязано`
          : `Поле "${f.path}" не используется`,
      });
    }
  }
  return issues;
}
