import { SimpleStore } from '@/shared/store/store';
import type { DataModel } from '../domain/DataModel';
import type { DataModelRepository } from '../api/DataModelRepository';
import { httpDataModelRepository } from '../api/HttpDataModelRepository';

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
  models: [], selectedId: null, loading: false, error: null,
  saveStatus: 'idle', saveError: null, lastSavedAt: null, schemaId: null,
};

export class ModelStore extends SimpleStore<ModelState> {
  private readonly repo: DataModelRepository;
  private timer: number | null = null;

  constructor(repo: DataModelRepository = httpDataModelRepository) {
    super(INITIAL);
    this.repo = repo;
  }

  async load(schemaId: string): Promise<void> {
    this.setState((s) => ({ ...s, loading: true, error: null, schemaId }));
    try {
      const models = await this.repo.list(schemaId);
      this.setState((s) => ({
        ...s, models, loading: false,
        selectedId: s.selectedId ?? models[0]?.id ?? null,
      }));
    } catch (e) {
      this.setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }

  select(id: string | null): void { this.setState((s) => ({ ...s, selectedId: id })); }

  async create(schemaId: string, name: string, values: Record<string, unknown> = {}): Promise<DataModel> {
    const uniqueName = this.uniqueName(schemaId, name);
    const created = await this.repo.create({ schemaId, name: uniqueName, values });
    this.setState((s) => ({ ...s, models: [created, ...s.models], selectedId: created.id }));
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
    if (updated) this.scheduleSave(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
    this.setState((s) => ({
      ...s,
      models: s.models.filter((m) => m.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  }

  async importMany(schemaId: string, items: { name: string; values: Record<string, unknown> }[]): Promise<void> {
    for (const item of items) {
      const uniqueName = this.uniqueName(schemaId, item.name);
      const created = await this.repo.create({ schemaId, name: uniqueName, values: item.values });
      this.setState((s) => ({ ...s, models: [created, ...s.models] }));
    }
  }

  private scheduleSave(id: string): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(async () => {
      const model = this.getState().models.find((m) => m.id === id);
      if (!model) return;
      try {
        const saved = await this.repo.update(id, { name: model.name, values: { ...model.values } });
        this.setState((s) => ({
          ...s,
          models: s.models.map((m) => (m.id === id ? saved : m)),
          saveStatus: 'saved', saveError: null, lastSavedAt: Date.now(),
        }));
      } catch (e) {
        this.setState((s) => ({ ...s, saveStatus: 'error', saveError: (e as Error).message }));
      }
    }, 2000);
  }
}

export const modelStore = new ModelStore();