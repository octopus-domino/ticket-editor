import type { DataModel } from '../domain/DataModel';

export interface DataModelRepository {
  list(schemaId?: string): Promise<DataModel[]>;
  get(id: string): Promise<DataModel | null>;
  create(input: {
    schemaId: string;
    name: string;
    values: Record<string, unknown>;
  }): Promise<DataModel>;
  update(id: string, patch: { name: string; values: Record<string, unknown> }): Promise<DataModel>;
  delete(id: string): Promise<void>;
  importMany?(
    schemaId: string,
    items: { name: string; values: Record<string, unknown> }[],
  ): Promise<{
    imported: number;
    issues: { index: number; message: string }[];
  }>;
}

export interface ImportResult {
  ok: boolean;
  models?: { name: string; values: Record<string, unknown> }[];
  issues?: { index: number; message: string }[];
}
