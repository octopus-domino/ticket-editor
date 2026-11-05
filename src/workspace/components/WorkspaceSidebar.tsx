import { t as __tr } from '@/shared/i18n';
import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { authStore } from '@/auth/store';
import { workspaceStore } from '../store';
import { workspaceApi } from '../api';
import type { TreeNode } from '../types';
import { templateStore } from '@/features/templates/state/TemplateStore';
import { t } from '@/shared/i18n';
import './workspace-sidebar.css';

function findPathToNode(tree: TreeNode[], targetId: string): string[] | null {
  for (const node of tree) {
    if (node.id === targetId) return [];
    if (node.type === 'folder') {
      const sub = findPathToNode(node.children, targetId);
      if (sub) return [node.id, ...sub];
    }
  }
  return null;
}

const WorkspaceNav: React.FC = () => {
  const { search } = useLocation();
  const mine = new URLSearchParams(search).get('view') === 'mine';
  return (
  <nav className="workspace-nav" style={{ gridTemplateColumns: '1fr 1fr' }}>
    <NavLink to="/app" end className={({ isActive }) => (isActive ? 'active' : '')}>
      ⌂ {t('Workspace')}</NavLink>
    <NavLink to="/app/data" className={({ isActive }) => (isActive ? 'active' : '')}>
      📊 {t('Data')}</NavLink>
    <NavLink to="/app/library?view=mine" className={({ isActive }) => (isActive && mine ? 'active' : '')}>
      🎨 {t('My documents')}
    </NavLink>
    <NavLink to="/app/library" className={({ isActive }) => (isActive && !mine ? 'active' : '')}>▦ {t('Document library')}</NavLink>
    <NavLink to="/app/stamps">◎ {t('Stamps')}</NavLink>
    <NavLink to="/app/learn">? {t('Learning center')}</NavLink>
    <NavLink to="/app/sign">✍ {t('Electronic signature')}</NavLink>
    <NavLink to="/app/profile">◉ {t('Client profile')}</NavLink>
    <NavLink to="/app/api-access">⌘ {t('Client API')}</NavLink>
    <NavLink to="/app/integrations">⇄ {t('Data connections')}</NavLink>
    <NavLink to="/app/libraries">▦ {t('Shared libraries')}</NavLink>
    <NavLink to="/app/history">◷ {t('Generation history')}</NavLink>
    <NavLink to="/app/generate" className={({ isActive }) => (isActive ? 'active' : '')}>
      {__tr("⚡ Генерация")}</NavLink>
  </nav>
  );
};

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

  const handleKeyDown = (e: React.KeyboardEvent): void => {
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
        style={{
          width: '100%', padding: '4px 6px', fontSize: 13,
          border: '1px solid var(--accent)', borderRadius: 4, outline: 'none',
        }}
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
  const [hovered, setHovered] = useState(false);
  const [creatingChild, setCreatingChild] = useState<'folder' | 'document' | null>(null);
  const [renaming, setRenaming] = useState(false);

  const isFolder = node.type === 'folder';
  const isActiveFolder = isFolder && node.id === activeFolderId;
  const isActiveDoc = !isFolder && node.id === currentDocId;

  const open = useStore(workspaceStore, (s) =>
    isFolder && s.expandedFolders.includes(node.id));

  const handleCreateChild = async (type: 'folder' | 'document', name: string): Promise<void> => {
    if (offline) { setCreatingChild(null); return; }
    try {
      if (type === 'folder') {
        await workspaceApi.createFolder(name, node.id);
      } else {
        const doc = await workspaceApi.createDocument(name, node.id);
        await workspaceStore.refresh();
        setCreatingChild(null);
        navigate(`/app/editor/${doc.id}`);
        return;
      }
      await workspaceStore.refresh();
      workspaceStore.expandFolders([node.id]);
    } catch (err) {
      console.error('create child failed:', err);
    } finally {
      setCreatingChild(null);
    }
  };

  const handleRename = async (name: string): Promise<void> => {
    if (offline) { setRenaming(false); return; }
    if (name === node.name) { setRenaming(false); return; }
    try {
      if (isFolder) await workspaceApi.renameFolder(node.id, name);
      else if (node.type === 'template') await templateStore.rename(node.id, name);
      else await workspaceApi.renameDocument(node.id, name);
      await workspaceStore.refresh();
    } catch (err) {
      console.error('rename failed:', err);
    } finally {
      setRenaming(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (offline) return;
    try {
      if (isFolder) await workspaceApi.deleteFolder(node.id);
      else if (node.type === 'template') await templateStore.delete(node.id);
      else await workspaceApi.deleteDocument(node.id);
      await workspaceStore.refresh();
    } catch (err) {
      console.error('delete failed:', err);
    }
  };

  const handleToggleFolder = (): void => {
    workspaceStore.toggleFolder(node.id);
    workspaceStore.setActiveFolder(node.id);
  };

  if (renaming) {
    return (
      <InlineInput
        initialValue={node.name}
        placeholder={__tr("Название")}
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
          display: 'flex', alignItems: 'center', padding: '4px 8px',
          marginLeft: depth * 12, cursor: 'pointer',
          background: isActiveDoc ? 'var(--accent-light)' : isActiveFolder ? '#f8fafc' : 'transparent',
          borderRadius: 4, fontSize: 13,
          fontWeight: isFolder ? 600 : 400,
          color: isActiveDoc ? 'var(--accent-hover)' : 'var(--text)',
        }}
        onClick={() => {
          if (isFolder) handleToggleFolder();
          else {
            workspaceStore.setActiveFolder(node.parentId);
            navigate(node.type === 'template' ? `/app/templates/${node.id}/edit` : `/app/editor/${node.id}`);
          }
        }}
        onDoubleClick={() => { if (!offline) setRenaming(true); }}
      >
        {isFolder ? (
          <span style={{ width: 16, color: '#94a3b8' }}>{open ? '▾' : '▸'}</span>
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
                <button
                  title={__tr("Новый документ")}
                  onClick={() => { setCreatingChild('document'); workspaceStore.expandFolders([node.id]); workspaceStore.setActiveFolder(node.id); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, padding: 2, color: 'inherit' }}
                >📄+</button>
                <button
                  title={__tr("Новая папка")}
                  onClick={() => { setCreatingChild('folder'); workspaceStore.expandFolders([node.id]); workspaceStore.setActiveFolder(node.id); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, padding: 2, color: 'inherit' }}
                >📁+</button>
              </>
            )}
            <button
              title={__tr("Переименовать")}
              onClick={() => setRenaming(true)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, padding: 2, color: 'inherit' }}
            >✏️</button>
            <button
              title={__tr("Удалить")}
              onClick={() => void handleDelete()}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, padding: 2, color: 'inherit' }}
            >🗑️</button>
          </div>
        )}
      </div>
      {isFolder && open && (
        <>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              currentDocId={currentDocId}
              activeFolderId={activeFolderId}
              offline={offline}
            />
          ))}
          {creatingChild && (
            <InlineInput
              placeholder={creatingChild === 'folder' ? __tr("Название папки…") : __tr("Название документа…")}
              onSave={(name) => void handleCreateChild(creatingChild, name)}
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
  const templateItems = useStore(templateStore, (s) => s.items);
  const loading = useStore(workspaceStore, (s) => s.loading);
  const activeFolderId = useStore(workspaceStore, (s) => s.activeFolderId);
  const user = useStore(authStore, (s) => s.user);
  const offline = useStore(authStore, (s) => s.offline);

  const navigate = useNavigate();
  const { docId, templateId } = useParams();
  const currentDocId = docId ?? templateId ?? null;

  const [creatingRoot, setCreatingRoot] = useState<'folder' | 'document' | null>(null);

  useEffect(() => {
    if (!offline) void workspaceStore.refresh();
  }, [offline, templateItems]);

  useEffect(() => {
    if (!currentDocId || tree.length === 0) return;
    const path = findPathToNode(tree, currentDocId);
    if (path && path.length > 0) workspaceStore.expandFolders(path);
  }, [currentDocId, tree]);

  const handleCreateRoot = async (type: 'folder' | 'document', name: string): Promise<void> => {
    if (offline) { setCreatingRoot(null); return; }
    try {
      if (type === 'folder') {
        await workspaceApi.createFolder(name, activeFolderId);
      } else {
        const doc = await workspaceApi.createDocument(name, activeFolderId);
        await workspaceStore.refresh();
        setCreatingRoot(null);
        navigate(`/app/editor/${doc.id}`);
        return;
      }
      await workspaceStore.refresh();
    } catch (err) {
      console.error('create root failed:', err);
    } finally {
      setCreatingRoot(null);
    }
  };

  const logout = async (): Promise<void> => {
    await authStore.logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside style={{ width: 280, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--panel)' }}>
      <div style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a
          href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 4 }}
          title={__tr("На главную")}
        >
          {__tr("← На главную")}</a>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          {user?.name || user?.email || __tr("Гость")}
        </div>
        <WorkspaceNav />
        {!offline && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => { setCreatingRoot('document'); }}
              style={{ flex: 1, padding: '6px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
            >{__tr("+ Документ")}</button>
            <button
              onClick={() => { setCreatingRoot('folder'); }}
              style={{ flex: 1, padding: '6px 0', background: 'var(--panel-alt)', border: '1px solid var(--border-strong)', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: 'var(--text)' }}
            >{__tr("+ Папка")}</button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        <button className="workspace-root" type="button" onClick={() => workspaceStore.setActiveFolder(null)} aria-pressed={activeFolderId === null} title={__tr("Все документы (корневая папка)")}>
          <span aria-hidden="true">⌂</span><span>{t('Documents')}</span>
          <span className="workspace-root-count">{tree.length}</span>
        </button>
        {loading && !offline && <div style={{ fontSize: 12, color: 'var(--text-soft)', padding: 8 }}>{__tr("Загрузка…")}</div>}
        {!offline && creatingRoot && (
          <InlineInput
            placeholder={creatingRoot === 'folder' ? __tr("Название папки…") : __tr("Название документа…")}
            onSave={(name) => void handleCreateRoot(creatingRoot, name)}
            onCancel={() => setCreatingRoot(null)}
            depth={0}
          />
        )}
        {offline && (
          <div style={{ padding: '4px 8px' }}>
            <div
              onClick={() => navigate('/app/editor/local')}
              style={{
                display: 'flex', alignItems: 'center', padding: '4px 8px', cursor: 'pointer',
                background: currentDocId === 'local' ? 'var(--accent-light)' : 'transparent',
                borderRadius: 4, fontSize: 13,
                color: currentDocId === 'local' ? 'var(--accent-hover)' : 'var(--text)',
              }}
            >
              <span style={{ width: 16 }} />
              <span style={{ marginRight: 6 }}>📄</span>
              <span style={{ flex: 1 }}>{__tr("Локальный проект")}</span>
            </div>
          </div>
        )}
        {!offline && !loading && tree.length === 0 && !creatingRoot && (
          <div style={{ fontSize: 12, color: 'var(--text-soft)', padding: 8, textAlign: 'center' }}>
            {__tr("Пусто. Создайте папку или документ.")}</div>
        )}
        {!offline && tree.map((n) => (
          <TreeItem
            key={n.id}
            node={n}
            depth={0}
            currentDocId={currentDocId}
            activeFolderId={activeFolderId}
            offline={offline}
          />
        ))}
      </div>

      <button
        onClick={() => void logout()}
        style={{ padding: 12, border: 'none', borderTop: '1px solid var(--border)', background: 'var(--panel)', cursor: 'pointer', color: '#dc2626', fontSize: 13 }}
      >
        {__tr("Выйти")}</button>
    </aside>
  );
};
