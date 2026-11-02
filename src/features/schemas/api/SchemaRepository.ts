import type { DataSchema, FieldDef } from '../domain/DataSchema';

export interface SchemaRepository {
  list(): Promise<DataSchema[]>;
  get(id: string): Promise<DataSchema>;
  create(input: { name: string; fields: FieldDef[] }): Promise<DataSchema>;
  update(id: string, input: { name: string; fields: FieldDef[] }): Promise<DataSchema>;
  delete(id: string): Promise<void>;
}