import { SimpleStore } from '@/shared/store/store';
import type { TemplateRepository } from '../api/TemplateRepository';
import { httpTemplateRepository } from '../api/HttpTemplateRepository';
import type { SaveTemplateInput, Template, TemplateSummary } from '../domain/Template';
import { reachGoal } from '@/shared/analytics/metrika';

export interface TemplateState {
  readonly items: TemplateSummary[];
  readonly activeId: string | null;
  readonly active: Template | null;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly error: string | null;
}

const INITIAL: TemplateState = {
  items: [],
  activeId: null,
  active: null,
  loading: false,
  saving: false,
  error: null,
};

export class TemplateStore extends SimpleStore<TemplateState> {
  private revision = 0;
  private sessionRevision = 0;
  private loadRevision = 0;

  private readonly repo: TemplateRepository;

  constructor(repo: TemplateRepository = httpTemplateRepository) {
    super(INITIAL);
    this.repo = repo;
  }

  async loadAll(schemaId?: string): Promise<void> {
    const revision = ++this.loadRevision;
    this.setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const items = await this.repo.list(schemaId);
      if (revision !== this.loadRevision) return;
      const prevActiveId = this.getState().activeId;
      const activeStillExists = prevActiveId !== null && items.some((it) => it.id === prevActiveId);
      const nextActiveId = activeStillExists ? prevActiveId : (items[0]?.id ?? null);

      this.setState((s) => ({
        ...s,
        items,
        loading: false,
        activeId: nextActiveId,
      }));

      if (nextActiveId && nextActiveId !== prevActiveId) {
        await this.select(nextActiveId);
      } else if (nextActiveId === null) {
        this.setState((s) => ({ ...s, active: null }));
      }
    } catch (e) {
      if (revision !== this.loadRevision) return;
      this.setState((s) => ({
        ...s,
        loading: false,
        error: (e as Error).message,
      }));
    }
  }

  async select(id: string | null): Promise<void> {
    const revision = ++this.revision;
    if (id === null) {
      this.setState((s) => ({ ...s, activeId: null, active: null }));
      return;
    }
    this.setState((s) => ({ ...s, activeId: id }));
    try {
      const t = await this.repo.get(id);
      if (revision !== this.revision) return;
      this.setState((s) => ({ ...s, active: t, error: null }));
    } catch (e) {
      if (revision !== this.revision) return;
      this.setState((s) => ({
        ...s,
        active: null,
        error: (e as Error).message,
      }));
    }
  }

  async create(input: SaveTemplateInput): Promise<Template> {
    const session = this.sessionRevision;
    this.setState((s) => ({ ...s, saving: true, error: null }));
    try {
      const created = await this.repo.create(input);
      if (session !== this.sessionRevision) return created;
      const summary: TemplateSummary = {
        id: created.id,
        schemaId: created.schemaId,
        name: created.name,
        slideCount: created.slides.length,
        updatedAt: created.updatedAt,
      };
      this.setState((s) => ({
        ...s,
        items: [summary, ...s.items],
        activeId: created.id,
        active: created,
        saving: false,
      }));
      reachGoal('template_created', {
        slide_count: String(created.slides.length),
        has_schema: String(created.schemaId !== null),
      });
      return created;
    } catch (e) {
      if (session !== this.sessionRevision) throw e;
      this.setState((s) => ({
        ...s,
        saving: false,
        error: (e as Error).message,
      }));
      throw e;
    }
  }

  async update(id: string, input: SaveTemplateInput): Promise<Template> {
    const session = this.sessionRevision;
    this.setState((s) => ({ ...s, saving: true, error: null }));
    try {
      const updated = await this.repo.update(id, input);
      if (session !== this.sessionRevision) return updated;
      const summary: TemplateSummary = {
        id: updated.id,
        schemaId: updated.schemaId,
        name: updated.name,
        slideCount: updated.slides.length,
        updatedAt: updated.updatedAt,
      };
      this.setState((s) => ({
        ...s,
        items: s.items.map((it) => (it.id === id ? summary : it)),
        active: s.activeId === id ? updated : s.active,
        saving: false,
      }));
      return updated;
    } catch (e) {
      if (session !== this.sessionRevision) throw e;
      this.setState((s) => ({
        ...s,
        saving: false,
        error: (e as Error).message,
      }));
      throw e;
    }
  }

  async rename(id: string, name: string): Promise<void> {
    const session = this.sessionRevision;
    const updated = await this.repo.rename(id, name);
    if (session !== this.sessionRevision) return;
    this.setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? { ...it, name: updated.name } : it)),
      active: s.activeId === id ? updated : s.active,
    }));
  }

  async delete(id: string): Promise<void> {
    const session = this.sessionRevision;
    await this.repo.delete(id);
    if (session !== this.sessionRevision) return;
    this.setState((s) => {
      const items = s.items.filter((it) => it.id !== id);
      const wasActive = s.activeId === id;
      return {
        ...s,
        items,
        activeId: wasActive ? (items[0]?.id ?? null) : s.activeId,
        active: wasActive ? null : s.active,
      };
    });
  }
  reset(): void {
    this.sessionRevision++;
    this.revision++;
    this.loadRevision++;
    this.setState({ ...INITIAL });
  }
}

export const templateStore = new TemplateStore();
