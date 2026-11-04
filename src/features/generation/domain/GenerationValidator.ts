import { t as __tr } from '@/shared/i18n';
import type { DataSchema } from '@/features/schemas/domain/DataSchema';
import type { DataModel } from '@/features/data-models/domain/DataModel';
import { validateModel } from '@/features/data-models/domain/DataModelValidator';
import type { Binding } from '@/features/bindings/domain/Binding';
import { validateBindings } from '@/features/bindings/domain/BindingValidator';

export interface GenerationIssue {
  readonly kind: 'schema' | 'binding' | 'model' | 'format';
  readonly message: string;
}

export interface GenerationInput {
  readonly schema: DataSchema | null;
  readonly bindings: readonly Binding[];
  readonly selectedModels: readonly DataModel[];
  readonly format: string;
  readonly supportedFormats: readonly string[];
  readonly allowEmpty?: boolean;
}

export function validateGeneration(input: GenerationInput): GenerationIssue[] {
  const issues: GenerationIssue[] = [];
  if (input.schema && input.selectedModels.length === 0)
    issues.push({ kind: 'model', message: __tr("Выберите хотя бы один набор данных") });

  if (input.schema) {
    const bindingIssues = validateBindings(input.bindings, input.schema);
    for (const i of bindingIssues) {
      if (i.kind === 'missing' || i.kind === 'invalid-type') {
        issues.push({ kind: 'binding', message: i.message });
      }
    }
  }

  if (input.schema && !input.allowEmpty) {
    for (const m of input.selectedModels) {
      if (m.schemaId !== input.schema.id)
        issues.push({ kind: 'schema', message: __tr("{0}: другая схема", m.name) });
      for (const e of validateModel(m, input.schema)) {
        issues.push({
          kind: 'model',
          message: `${m.name}: ${e.message} (${e.path})`,
        });
      }
    }
  }

  if (!input.supportedFormats.includes(input.format)) {
    issues.push({
      kind: 'format',
      message: __tr("Формат {0} не поддерживается", input.format),
    });
  }

  return issues;
}
