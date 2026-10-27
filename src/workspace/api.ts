import { authFetch } from '@/shared/api/client';
import type { DocumentFull, TreeNode } from './types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const workspaceApi = {
  async tree(): Promise<TreeNode[]> {
    return json(await authFetch('/api/workspace/tree'));
  },

  async createFolder(name: string, parentId: string | null): Promise<TreeNode> {
    return json(await authFetch('/api/workspace/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId }),
    }));
  },

  async renameFolder(id: string, name: string): Promise<TreeNode> {
    return json(await authFetch(`/api/workspace/folders/${id}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }));
  },

  async moveFolder(id: string, parentId: string | null): Promise<TreeNode> {
    return json(await authFetch(`/api/workspace/folders/${id}/parent`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId }),
    }));
  },

  async deleteFolder(id: string): Promise<void> {
    await authFetch(`/api/workspace/folders/${id}`, { method: 'DELETE' });
  },

  async createDocument(name: string, folderId: string | null): Promise<DocumentFull> {
    return json(await authFetch('/api/workspace/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, folderId }),
    }));
  },

  async getDocument(id: string): Promise<DocumentFull> {
    return json(await authFetch(`/api/workspace/documents/${id}`));
  },

  async saveDocument(id: string, content: string): Promise<DocumentFull> {
    return json(await authFetch(`/api/workspace/documents/${id}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }));
  },

  async renameDocument(id: string, name: string): Promise<DocumentFull> {
    return json(await authFetch(`/api/workspace/documents/${id}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }));
  },

  async moveDocument(id: string, parentId: string | null): Promise<DocumentFull> {
    return json(await authFetch(`/api/workspace/documents/${id}/parent`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId }),
    }));
  },

  async deleteDocument(id: string): Promise<void> {
    await authFetch(`/api/workspace/documents/${id}`, { method: 'DELETE' });
  },
};