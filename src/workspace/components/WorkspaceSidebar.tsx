import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';
import { workspaceStore } from '../store';
import { workspaceApi } from '../api';
import type { TreeNode } from '../types';

const InlineInput: React.FC<{
  initialValue?: string;
  placeholder: string;
  onSave: (val: string) => void;
  onCancel: () => void;
  depth: number;
}> = ({ initialValue = '', placeholder, onSave, onCancel, depth }) => {
  const [val, setVal] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialValue) inputRef.current?.select();
  }, [initialValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (val.trim()) onSave(val.trim());
      else onCancel();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div style={{ marginLeft: depth * 12 + 24, padding: '4px 8px' }}>
      <input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (val.trim()) onSave(val.trim()); else onCancel(); }}
        placeholder={placeholder}
        style={{ width: '100%', padding: '4px 6px', fontSize: 13, border: '1px solid #6366f1', borderRadius: 4, outline: 'none' }}
      />
    </div>
  );
};

const TreeItem: React.FC<{
  node: TreeNode;
  depth: number;
  currentDocId: string | null;
  activeFolderId: string | null;
  offline: boolean;
}> = ({ node, depth, currentDocId, activeFolderId, offline }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(depth === 0);
  const [hovered, setHovered] = useState(false);
  const [creatingChild, setCreatingChild] = useState<'folder' | 'document' | null>(null);
  const [renaming, setRenaming] = useState(false);

  const isFolder = node.type === 'folder';
  const isActiveFolder = isFolder && node.id === activeFolderId;
  const isActiveDoc = !isFolder && node.id === currentDocId;

  const handleCreateChild = async (type: 'folder' | 'document', name: string) => {
    if (offline) { setCreatingChild(null); return; }
    if (type === 'folder') {
      await workspaceApi.createFolder(name, node.id);
    } else {
      const doc = await workspaceApi.createDocument(name, node.id);
      await workspaceStore.refresh();
      setCreatingChild(null);
      navigate(`/editor/${doc.id}`);
      return;
    }
    await workspaceStore.refresh();
    setCreatingChild(null);
  };

  const handleRename = async (name: string) => {
    if (offline) { setRenaming(false); return; }
    if (name === node.name) { setRenaming(false); return; }
    if (isFolder) await workspaceApi.renameFolder(node.id, name);
    else await workspaceApi.renameDocument(node.id, name);
    await workspaceStore.refresh();
    setRenaming(false);
  };

  const handleDelete = async () => {
    if (offline) return;
    if (!confirm(`Удалить «${node.name}»?`)) return;
    if (isFolder) await workspaceApi.deleteFolder(node.id);
    else await workspaceApi.deleteDocument(node.id);
    await workspaceStore.refresh();
  };

  if (renaming) {
    return (
      <InlineInput
        initialValue={node.name}
        placeholder="Название"
        onSave={handleRename}
        onCancel={() => setRenaming(false)}
        depth={depth}
      />
    );
  }

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          marginLeft: depth * 12,
          cursor: 'pointer',
          background: isActiveDoc ? '#eef2ff' : isActiveFolder ? '#f8fafc' : 'transparent',
          borderRadius: 4,
          fontSize: 13,
          fontWeight: isFolder ? 600 : 400,
          color: isActiveDoc ? '#4f46e5' : '#0f172a',
        }}
        onClick={() => {
          if (isFolder) {
            setOpen(!open);
            workspaceStore.setActiveFolder(node.id);
          } else {
            navigate(`/editor/${node.id}`);
          }
        }}
        onDoubleClick={() => { if (!offline) setRenaming(true); }}
      >
        {isFolder ? (
          <span style={{ width: 16, color: '#94a3b8' }}>{open ? '▼' : '▶'}</span>
        ) : (
          <span style={{ width: 16 }} />
        )}

        <span style={{ marginRight: 6 }}>{isFolder ? '📁' : '📄'}</span>

        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>

        {hovered && !offline && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }} onClick={(e) => e.stopPropagation()}>
            {isFolder && (
              <>
                <button title="Новый документ" onClick={() => { setCreatingChild('document'); setOpen(true); workspaceStore.setActiveFolder(node.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, padding: 2 }}>📄+</button>
                <button title="Новая папка" onClick={() => { setCreatingChild('folder'); setOpen(true); workspaceStore.setActiveFolder(node.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, padding: 2 }}>📁+</button>
              </>
            )}
            <button title="Переименовать" onClick={() => setRenaming(true)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, padding: 2 }}>✏️</button>
            <button title="Удалить" onClick={handleDelete} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, padding: 2 }}>🗑️</button>
          </div>
        )}
      </div>

      {isFolder && open && (
        <>
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} currentDocId={currentDocId} activeFolderId={activeFolderId} offline={offline} />
          ))}
          {creatingChild && (
            <InlineInput
              placeholder={creatingChild === 'folder' ? 'Название папки...' : 'Название документа...'}
              onSave={(name) => handleCreateChild(creatingChild, name)}
              onCancel={() => setCreatingChild(null)}
              depth={depth + 1}
            />
          )}
        </>
      )}
    </div>
  );
};

export const WorkspaceSidebar: React.FC = () => {
  const tree = useStore(workspaceStore, (s) => s.tree);
  const loading = useStore(workspaceStore, (s) => s.loading);
  const activeFolderId = useStore(workspaceStore, (s) => s.activeFolderId);
  const user = useStore(authStore, (s) => s.user);
  const offline = useStore(authStore, (s) => s.offline);
  
  const navigate = useNavigate();
  const { docId } = useParams();
  const currentDocId = docId ?? null;

  const [creatingRoot, setCreatingRoot] = useState<'folder' | 'document' | null>(null);

  useEffect(() => {
    if (!offline) {
      workspaceStore.refresh();
    }
  }, [offline]);

  const handleCreateRoot = async (type: 'folder' | 'document', name: string) => {
    if (offline) { setCreatingRoot(null); return; }
    if (type === 'folder') {
      await workspaceApi.createFolder(name, activeFolderId);
    } else {
      const doc = await workspaceApi.createDocument(name, activeFolderId);
      await workspaceStore.refresh();
      setCreatingRoot(null);
      navigate(`/editor/${doc.id}`);
      return;
    }
    await workspaceStore.refresh();
    setCreatingRoot(null);
  };

  const logout = async () => {
    await authStore.logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside style={{ width: 280, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 4 }}>
          {user?.name || user?.email}
        </div>
        
        {!offline && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button 
              onClick={() => { setCreatingRoot('document'); workspaceStore.setActiveFolder(null); }} 
              style={{ flex: 1, padding: '6px 0', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
            >
              + Документ
            </button>
            <button 
              onClick={() => { setCreatingRoot('folder'); workspaceStore.setActiveFolder(null); }} 
              style={{ flex: 1, padding: '6px 0', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
            >
              + Папка
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {loading && !offline && <div style={{ fontSize: 12, color: '#94a3b8', padding: 8 }}>Загрузка...</div>}
        
        {!offline && creatingRoot && (
          <InlineInput
            placeholder={creatingRoot === 'folder' ? 'Название папки...' : 'Название документа...'}
            onSave={(name) => handleCreateRoot(creatingRoot, name)}
            onCancel={() => setCreatingRoot(null)}
            depth={0}
          />
        )}

        {offline && (
          <div style={{ padding: '4px 8px' }}>
            <div
              onClick={() => navigate('/editor/local')}
              style={{
                display: 'flex', alignItems: 'center', padding: '4px 8px',
                cursor: 'pointer', background: currentDocId === 'local' ? '#eef2ff' : 'transparent',
                borderRadius: 4, fontSize: 13, color: currentDocId === 'local' ? '#4f46e5' : '#0f172a',
              }}
            >
              <span style={{ width: 16 }} />
              <span style={{ marginRight: 6 }}>📄</span>
              <span style={{ flex: 1 }}>Локальный проект</span>
            </div>
          </div>
        )}

        {!offline && !loading && tree.length === 0 && !creatingRoot && (
          <div style={{ fontSize: 12, color: '#94a3b8', padding: 8, textAlign: 'center' }}>
            Пусто. Создайте папку или документ.
          </div>
        )}

        {!offline && tree.map((n) => (
          <TreeItem key={n.id} node={n} depth={0} currentDocId={currentDocId} activeFolderId={activeFolderId} offline={offline} />
        ))}
      </div>

      <button onClick={logout} style={{ padding: 12, border: 'none', borderTop: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#dc2626', fontSize: 13 }}>
        {offline ? 'Выйти' : 'Выйти'}
      </button>
    </aside>
  );
};