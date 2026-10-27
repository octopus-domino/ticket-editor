import { SimpleStore } from '@/shared/store/store';
import { workspaceApi } from './api';
import type { TreeNode } from './types';

export interface WorkspaceState {
  tree: TreeNode[];
  loading: boolean;
  error: string | null;
  activeFolderId: string | null; // Текущая выбранная папка (для создания внутри неё)
}

export class WorkspaceStore extends SimpleStore<WorkspaceState> {
  constructor() {
    super({ tree: [], loading: false, error: null, activeFolderId: null });
  }

  setActiveFolder(id: string | null) {
    this.setState((s) => ({ ...s, activeFolderId: id }));
  }

  async refresh(): Promise<void> {
    this.setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const tree = await workspaceApi.tree();
      this.setState((s) => ({ ...s, tree, loading: false, error: null }));
    } catch (e) {
      this.setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }
}

export const workspaceStore = new WorkspaceStore();