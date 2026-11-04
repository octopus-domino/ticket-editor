import { SimpleStore } from '@/shared/store/store';
import type { DataSchema, FieldDef } from '../domain/DataSchema';
import { httpSchemaRepository } from '../api/HttpSchemaRepository';
import { reachGoal } from '@/shared/analytics/metrika';

export interface SchemaState {
  schemas: DataSchema[];
  activeId: string | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const INITIAL: SchemaState = {
  schemas: [],
  activeId: null,
  loading: false,
  loaded: false,
  error: null,
};

const STORAGE_KEY = 'ticket-editor:schemaId';

export class SchemaStore extends SimpleStore<SchemaState> {
  private epoch = 0;
  private loadRevision = 0;
  private selectionRevision = 0;
  reset(): void {
    this.epoch++;
    this.loadRevision++;
    this.setState({ ...INITIAL });
  }

  constructor() {
    super(INITIAL);
  }

  async loadAll(): Promise<void> {
    const revision = ++this.loadRevision;
    const selectionRevision = this.selectionRevision;
    this.setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const schemas = await httpSchemaRepository.list();
      if (revision !== this.loadRevision) return;
      const savedId = this.getSavedId();
      const activeId = selectionRevision !== this.selectionRevision
        ? this.getState().activeId
        : schemas.find((x) => x.id === savedId)?.id ?? schemas[0]?.id ?? null;
      if (activeId) this.setSavedId(activeId);
      this.setState({ schemas, activeId, loading: false, loaded: true, error: null });
    } catch (e) {
      if (revision !== this.loadRevision) return;
      this.setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }

  setActive(id: string | null): void {
    this.selectionRevision++;
    if (id) this.setSavedId(id);
    else this.removeSavedId();
    this.setState((s) => ({ ...s, activeId: id }));
  }

  getActive(): DataSchema | null {
    const s = this.getState();
    return s.schemas.find((x) => x.id === s.activeId) ?? null;
  }

  async refresh(id?: string): Promise<void> {
    const epoch = this.epoch;
    const target = id ?? this.getState().activeId;
    if (!target) {
      await this.loadAll();
      return;
    }
    try {
      const updated = await httpSchemaRepository.get(target);
      if (epoch !== this.epoch) return;
      this.setState((s) => ({
        ...s,
        schemas: s.schemas.map((x) => (x.id === target ? updated : x)),
      }));
    } catch {
      /* ignore */
    }
  }

  async create(input: { name: string; fields: FieldDef[] }): Promise<DataSchema> {
    const epoch = this.epoch;
    const created = await httpSchemaRepository.create(input);
    if (epoch !== this.epoch) return created;
    this.selectionRevision++;
    this.setSavedId(created.id);
    this.setState((s) => ({
      ...s,
      schemas: [created, ...s.schemas],
      activeId: created.id,
    }));
    reachGoal('schema_created', { field_count: String(created.fields.length) });
    return created;
  }

  async update(id: string, input: { name: string; fields: FieldDef[] }): Promise<DataSchema> {
    const epoch = this.epoch;
    const updated = await httpSchemaRepository.update(id, input);
    if (epoch !== this.epoch) return updated;
    this.setState((s) => ({
      ...s,
      schemas: s.schemas.map((x) => (x.id === id ? updated : x)),
    }));
    return updated;
  }

  async delete(id: string): Promise<void> {
    const epoch = this.epoch;
    await httpSchemaRepository.delete(id);
    if (epoch !== this.epoch) return;
    this.setState((s) => {
      const schemas = s.schemas.filter((x) => x.id !== id);
      const activeId = s.activeId === id ? (schemas[0]?.id ?? null) : s.activeId;
      if (activeId) this.setSavedId(activeId);
      else this.removeSavedId();
      return { ...s, schemas, activeId };
    });
  }

  private getSavedId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
  private setSavedId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }
  private removeSavedId(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export const schemaStore = new SchemaStore();
