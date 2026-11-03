import { z } from 'zod';
import type { DataModel } from '../domain/DataModel';

const LIMIT_BYTES = 20 * 1024 * 1024;
const Item = z.object({
  id: z.string().optional(),
  schemaId: z.string().optional(),
  name: z.string().default('Model'),
  values: z
    .record(z.string(), z.unknown())
    .refine((values) => Object.keys(values).length <= 500, 'At most 500 fields'),
});
export type ImportedModel = z.infer<typeof Item>;
export interface ImportResult {
  readonly ok: boolean;
  readonly schemaId?: string;
  readonly models?: ImportedModel[];
  readonly issues?: readonly { index: number; message: string }[];
}

function safe(value: unknown, depth = 0): boolean {
  if (depth > 50) return false;
  if (!value || typeof value !== 'object') return true;
  return Object.entries(value).every(
    ([key, child]) =>
      !['__proto__', 'prototype', 'constructor'].includes(key) && safe(child, depth + 1),
  );
}
/** Versioned, bounded model interchange. IDs and schema metadata survive export. */
export class ModelIO {
  parse(text: string): ImportResult {
    try {
      if (new TextEncoder().encode(text).length > LIMIT_BYTES)
        throw new Error('Import exceeds 20 MB');
      const raw: unknown = JSON.parse(text);
      if (!safe(raw)) throw new Error('Unsafe or deeply nested JSON');
      const envelope =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)
          : null;
      if (envelope?.version !== undefined && envelope.version !== '1.0')
        throw new Error('Unsupported model format version');
      const incoming = Array.isArray(raw)
        ? raw
        : Array.isArray(envelope?.items)
          ? envelope.items
          : [raw];
      if (incoming.length > 10000) throw new Error('At most 10000 models');
      const issues: { index: number; message: string }[] = [];
      const models: ImportedModel[] = [];
      incoming.forEach((item: unknown, index: number) => {
        const parsed = Item.safeParse(item);
        if (parsed.success) models.push(parsed.data);
        else
          issues.push({
            index,
            message: parsed.error.issues
              .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
              .join('; '),
          });
      });
      return {
        ok: models.length > 0,
        models,
        issues,
        schemaId: typeof envelope?.schemaId === 'string' ? envelope.schemaId : models[0]?.schemaId,
      };
    } catch (error) {
      return {
        ok: false,
        issues: [{ index: 0, message: (error as Error).message }],
      };
    }
  }
  async fromFile(file: File): Promise<ImportResult> {
    if (file.size > LIMIT_BYTES)
      return {
        ok: false,
        issues: [{ index: 0, message: 'Import exceeds 20 MB' }],
      };
    return this.parse(await file.text());
  }
  export(models: readonly DataModel[]): string {
    const schemaIds = new Set(models.map((model) => model.schemaId));
    if (schemaIds.size > 1) throw new Error('Export models of one schema at a time');
    return JSON.stringify(
      {
        version: '1.0',
        schemaId: models[0]?.schemaId,
        items: models.map(({ id, schemaId, name, values }) => ({
          id,
          schemaId,
          name,
          values,
        })),
      },
      null,
      2,
    );
  }
  download(models: DataModel[], filename = 'data-models.json'): void {
    const url = URL.createObjectURL(new Blob([this.export(models)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
export const modelIO = new ModelIO();
