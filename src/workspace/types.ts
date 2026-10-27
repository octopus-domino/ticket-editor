export interface TreeNode {
  id: string;
  type: 'folder' | 'document';
  name: string;
  parentId: string | null;
  updatedAt: string | null;
  children: TreeNode[];
}

export interface DocumentFull {
  id: string;
  name: string;
  folderId: string | null;
  content: string;
  updatedAt: string;
}