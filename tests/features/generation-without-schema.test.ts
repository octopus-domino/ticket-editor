import { describe, expect, it } from 'vitest';
import { validateGeneration } from '@/features/generation/domain/GenerationValidator';

describe('generation with optional data schema', () => {
  const input = {
    schema: null,
    bindings: [],
    selectedModels: [],
    format: 'pdf',
    supportedFormats: ['pdf', 'pdfa', 'svg'],
  };
  it('allows the unchanged layout without schemas or data models', () => {
    for (const format of input.supportedFormats)
      expect(validateGeneration({ ...input, format })).toEqual([]);
    expect(validateGeneration({ ...input, format: 'unknown' })).toEqual([
      expect.objectContaining({ kind: 'format' }),
    ]);
  });
  it('still requires data sets and validates their schema and required values for personalization', () => {
    const schema = {
      id: 'S',
      name: 'People',
      fields: [{ path: 'name', type: 'string' as const, required: true }],
      createdAt: '',
      updatedAt: '',
    };
    expect(validateGeneration({ ...input, schema })).toEqual([
      expect.objectContaining({ kind: 'model' }),
    ]);
    const model = {
      id: 'M',
      name: 'Person',
      schemaId: 'OTHER',
      values: {},
      createdAt: '',
      updatedAt: '',
    };
    const issues = validateGeneration({ ...input, schema, selectedModels: [model] });
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'schema' }),
        expect.objectContaining({ kind: 'model' }),
      ]),
    );
  });
});
