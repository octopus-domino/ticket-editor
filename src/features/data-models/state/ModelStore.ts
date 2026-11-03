import { SimpleStore } from '@/shared/store/store';
import type { DataModel } from '../domain/DataModel';
import type { DataModelRepository } from '../api/DataModelRepository';
import { httpDataModelRepository } from '../api/HttpDataModelRepository';
import { RevisionSaveQueue } from '@/application/use-cases/RevisionSaveQueue';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ModelState {
  readonly models: DataModel[];
  readonly selectedId: string | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly saveStatus: SaveStatus;
  readonly saveError: string | null;
  readonly lastSavedAt: number | null;
  readonly schemaId: string | null;
}

const INITIAL: ModelState = {
  models: [],
  selectedId: null,
  loading: false,
  error: null,
  saveStatus: 'idle',
  saveError: null,
  lastSavedAt: null,
  schemaId: null,
};

export class ModelStore extends SimpleStore<ModelState> {
  private readonly repo: DataModelRepository;
  private readonly saves: RevisionSaveQueue<DataModel>;
  private loadVersion = 0;
  private sessionVersion = 0;
  private readonly dirtyRevisions = new Map<string, number>();

  constructor(repo: DataModelRepository = httpDataModelRepository) {
    super(INITIAL);
    this.repo = repo;
    this.saves = new RevisionSaveQueue(async (id, model) => {
      const session = this.sessionVersion;
      const revision = this.dirtyRevisions.get(id);
      try {
        const saved = await this.repo.update(id, {
          name: model.name,
          values: model.values,
        });
        if (session !== this.sessionVersion) return;
        if (this.dirtyRevisions.get(id) === revision) this.dirtyRevisions.delete(id);
        this.setState((s) => ({
          ...s,
          models: s.models.map((m) => (m.id === id ? { ...m, updatedAt: saved.updatedAt } : m)),
          saveStatus: this.dirtyRevisions.size ? 'saving' : 'saved',
          saveError: null,
          lastSavedAt: Date.now(),
        }));
      } catch (error) {
        if (session !== this.sessionVersion) throw error;
        this.setState((s) => ({
          ...s,
          saveStatus: 'error',
          saveError: (error as Error).message,
        }));
        throw error;
      }
    });
  }

  async load(schemaId: string): Promise<void> {
    const version = ++this.loadVersion;
    try {
      await this.saves.flush();
      if (version !== this.loadVersion) return;
      this.setState((s) => ({ ...s, loading: true, error: null, schemaId }));
      const models = await this.repo.list(schemaId);
      if (version !== this.loadVersion) return;
      this.setState((s) => ({
        ...s,
        models,
        loading: false,
        selectedId: models.some((m) => m.id === s.selectedId)
          ? s.selectedId
          : (models[0]?.id ?? null),
      }));
    } catch (e) {
      if (version !== this.loadVersion) return;
      this.setState((s) => ({
        ...s,
        loading: false,
        error: (e as Error).message,
      }));
    }
  }

  select(id: string | null): void {
    this.setState((s) => ({ ...s, selectedId: id }));
  }

  async create(
    schemaId: string,
    name: string,
    values: Record<string, unknown> = {},
  ): Promise<DataModel> {
    const session = this.sessionVersion;
    const uniqueName = this.uniqueName(schemaId, name);
    const created = await this.repo.create({
      schemaId,
      name: uniqueName,
      values,
    });
    if (session !== this.sessionVersion) return created;
    this.setState((s) => ({
      ...s,
      models: [created, ...s.models],
      selectedId: created.id,
    }));
    return created;
  }

  /** «Новая модель», «Новая модель (2)», «Новая модель (3)»… */
  private uniqueName(schemaId: string, base: string): string {
    const existing = this.getState().models.filter((m) => m.schemaId === schemaId);
    if (!existing.some((m) => m.name === base)) return base;
    let i = 2;
    while (existing.some((m) => m.name === `${base} (${i})`)) i++;
    return `${base} (${i})`;
  }

  patch(id: string, patch: { name?: string; values?: Record<string, unknown> }): void {
    let updated: DataModel | null = null;
    this.setState((s) => {
      const models = s.models.map((m) => {
        if (m.id !== id) return m;
        updated = {
          ...m,
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.values !== undefined && { values: patch.values }),
        };
        return updated;
      });
      return { ...s, models, saveStatus: 'saving' as SaveStatus };
    });
    if (updated) {
      this.dirtyRevisions.set(id, (this.dirtyRevisions.get(id) ?? 0) + 1);
      this.saves.enqueue(id, updated);
    }
  }

  async remove(id: string): Promise<void> {
    const session = this.sessionVersion;
    await this.saves.flush(id);
    if (session !== this.sessionVersion) return;
    await this.repo.delete(id);
    if (session !== this.sessionVersion) return;
    this.setState((s) => ({
      ...s,
      models: s.models.filter((m) => m.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  }

  async importMany(
    schemaId: string,
    items: { name: string; values: Record<string, unknown> }[],
  ): Promise<void> {
    const session = this.sessionVersion;
    if (this.repo.importMany) {
      const result = await this.repo.importMany(schemaId, items);
      if (session !== this.sessionVersion) return;
      await this.load(schemaId);
      if (result.issues.length)
        throw new Error(
          `${result.imported} imported; ${result.issues.length} failed: ${result.issues[0].message}`,
        );
      return;
    }
    for (const item of items) {
      if (session !== this.sessionVersion) return;
      const uniqueName = this.uniqueName(schemaId, item.name);
      const created = await this.repo.create({
        schemaId,
        name: uniqueName,
        values: item.values,
      });
      if (session !== this.sessionVersion) return;
      this.setState((s) => ({ ...s, models: [created, ...s.models] }));
    }
  }

  flush(): Promise<void> {
    return this.saves.flush();
  }
  reset(): void {
    this.sessionVersion++;
    this.loadVersion++;
    this.saves.clear();
    this.dirtyRevisions.clear();
    this.setState({ ...INITIAL });
  }
}

export const modelStore = new ModelStore();
