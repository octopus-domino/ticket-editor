import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor } from '@/presentation/components/Editor';
import { workspaceApi } from '../api';
import type { DocumentFull } from '../types';
import { hydrateDocument } from '../hydrateDocument';
import { documentDrafts } from '@/presentation/hooks/editor/useDocumentPersistence';
import { authStore } from '@/auth/store';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { modelStore } from '@/features/data-models/state/ModelStore';
import {
  schemaFromLegacyData,
  modelFromLegacyData,
} from '@/features/schemas/domain/SchemaInference';

const OFFLINE_KEY = 'ticket-editor:offline-doc';

export const EditorPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLocal = docId === 'local';

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDoc(null);
    const load = async () => {
      const remote: DocumentFull = isLocal
        ? {
            id: 'local',
            name: 'Local project',
            folderId: null,
            content: localStorage.getItem(OFFLINE_KEY) ?? '{}',
            updatedAt: new Date(0).toISOString(),
          }
        : await workspaceApi.getDocument(docId);
      let initial = hydrateDocument(remote.content);
      const owner = authStore.getState().user?.id ?? 'local';
      const draft = await documentDrafts.read(`${owner}:${docId}`).catch(() => null);
      if (draft && draft.savedAt > Date.parse(remote.updatedAt))
        initial = { ...initial, ...draft.snapshot };
      const checkpoint = async () => {
        const content = JSON.stringify({ version: '2.0', ...initial });
        if (isLocal) localStorage.setItem(OFFLINE_KEY, content);
        else await workspaceApi.saveDocument(docId, content);
      };
      if (!isLocal && initial.data.length > 0) {
        if (!initial.schemaId) {
          const inferred = schemaFromLegacyData(initial.data);
          const schema = await schemaStore.create(inferred);
          initial.schemaId = schema.id;
          await checkpoint();
        }
        if (!initial.legacyModelId) {
          const model = await modelStore.create(
            initial.schemaId,
            'Imported sample',
            modelFromLegacyData(initial.data),
          );
          initial.legacyModelId = model.id;
          await checkpoint();
        }
      }
      if (initial.schemaId) schemaStore.setActive(initial.schemaId);
      if (!cancelled) {
        setDoc({ ...remote, content: JSON.stringify(initial) });
        setLoading(false);
      }
    };
    void load().catch((reason: Error) => {
      if (!cancelled) {
        setError(reason.message);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [docId, isLocal]);

  const handleSave = useCallback(
    async (state: import('../hydrateDocument').HydratedDocument) => {
      state = {
        ...state,
        version: '2.0',
        schemaId: schemaStore.getState().activeId ?? undefined,
        legacyModelId: doc ? hydrateDocument(doc.content).legacyModelId : undefined,
      } as import('../hydrateDocument').HydratedDocument;
      if (isLocal) {
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(state));
        return;
      }
      if (!docId) return;
      await workspaceApi.saveDocument(docId, JSON.stringify(state));
    },
    [docId, isLocal, doc],
  );

  if (loading) return <div style={{ padding: 40 }}>Загрузка документа…</div>;
  if (error) return <div style={{ padding: 40, color: '#dc2626' }}>{error}</div>;
  if (!doc || !docId) return <div style={{ padding: 40 }}>Документ не найден</div>;

  const initial = hydrateDocument(doc.content);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: 8,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/app')}
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--panel)',
            padding: '4px 10px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 13,
            color: 'var(--text)',
          }}
        >
          ← К списку
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {doc.name} {isLocal && '(Сохранено локально)'}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor key={docId} documentId={docId} initialDoc={initial} onSave={handleSave} />
      </div>
    </div>
  );
};
