import { SimpleStore } from '@/shared/store/store';
import { workspaceApi } from './api';
import type { TreeNode } from './types';

const EXPANDED_KEY = 'ticket-editor:expanded-folders';

export interface WorkspaceState {
  tree: TreeNode[];
  loading: boolean;
  error: string | null;
  /** Текущая выбранная папка (для создания внутри неё). */
  activeFolderId: string | null;
  /** id раскрытых папок. Персистится в localStorage. */
  expandedFolders: string[];
}

function readExpanded(): string[] {
  try {
    const raw = localStorage.getItem(EXPANDED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeExpanded(ids: string[]): void {
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export class WorkspaceStore extends SimpleStore<WorkspaceState> {
  private revision = 0;
  reset(): void {
    this.revision++;
    this.setState({
      tree: [],
      activeFolderId: null,
      expandedFolders: [],
      loading: false,
      error: null,
    });
  }

  constructor() {
    super({
      tree: [],
      loading: false,
      error: null,
      activeFolderId: null,
      expandedFolders: readExpanded(),
    });
  }

  setActiveFolder(id: string | null) {
    this.setState((s) => ({ ...s, activeFolderId: id }));
  }

  /**
   * Переключает папку: раскрывает если свёрнута, сворачивает если раскрыта.
   * Персистит результат в localStorage.
   */
  toggleFolder(id: string) {
    this.setState((s) => {
      const has = s.expandedFolders.includes(id);
      const next = has ? s.expandedFolders.filter((x) => x !== id) : [...s.expandedFolders, id];
      writeExpanded(next);
      return { ...s, expandedFolders: next };
    });
  }

  /**
   * Раскрывает набор папок (например, всю цепочку предков активного
   * документа). Идемпотентно.
   */
  expandFolders(ids: string[]) {
    if (!ids.length) return;
    this.setState((s) => {
      const set = new Set(s.expandedFolders);
      let changed = false;
      for (const id of ids) {
        if (!set.has(id)) {
          set.add(id);
          changed = true;
        }
      }
      if (!changed) return s;
      const next = Array.from(set);
      writeExpanded(next);
      return { ...s, expandedFolders: next };
    });
  }

  async refresh(): Promise<void> {
    const revision = ++this.revision;
    this.setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const tree = await workspaceApi.tree();
      if (revision !== this.revision) return;
      this.setState((s) => ({ ...s, tree, loading: false, error: null }));
    } catch (e) {
      if (revision !== this.revision) return;
      this.setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }
}

export const workspaceStore = new WorkspaceStore();
