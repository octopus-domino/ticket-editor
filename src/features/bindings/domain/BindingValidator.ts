import type { DataSchema } from '@/features/schemas/domain/DataSchema';
import { flattenFields } from '@/features/schemas/domain/SchemaInference';
import type { Binding } from './Binding';

export interface BindingIssue {
  readonly kind: 'missing' | 'unused' | 'required-unbound';
  readonly path: string;
  readonly message: string;
}

export function validateBindings(bindings: readonly Binding[], schema: DataSchema): BindingIssue[] {
  const issues: BindingIssue[] = [];
  const known = new Set(flattenFields(schema.fields).map((f) => f.path));
  const used = new Set<string>();

  for (const b of bindings) {
    if (!known.has(b.schemaPath)) {
      issues.push({ kind: 'missing', path: b.schemaPath, message: `Поле "${b.schemaPath}" отсутствует в схеме` });
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