import { t as __tr } from '@/shared/i18n';
// src/workspace/components/EditorPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Editor } from '@/presentation/components/Editor';
import { workspaceApi } from '../api';
import { workspaceStore } from '../store';
import type { DocumentFull } from '../types';
import { hydrateDocument, type HydratedDocument } from '../hydrateDocument';
import { documentDrafts } from '@/presentation/hooks/editor/useDocumentPersistence';
import { authStore } from '@/auth/store';
import { useStore } from '@/shared/store/store';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { modelStore } from '@/features/data-models/state/ModelStore';
import {
  schemaFromLegacyData,
  modelFromLegacyData,
} from '@/features/schemas/domain/SchemaInference';

const OFFLINE_KEY = 'ticket-editor:offline-doc';

const DocumentEditorSession: React.FC<{ docId?: string }> = ({ docId }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeSchemaId = useStore(schemaStore, (state) => state.activeId);

  const [doc, setDoc] = useState<DocumentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLocal = docId === 'local';
  const urlSchemaId = searchParams.get('schemaId');
  const urlModelId = searchParams.get('modelId');

  /* --- /app/editor/new?schemaId=X&tab=data → создаём документ, сохраняем query --- */
  useEffect(() => {
    if (docId !== 'new' || isLocal) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const search = window.location.search; // сохраняем ?schemaId=...&tab=data
    void workspaceApi
      .createDocument(__tr("Новый документ"), workspaceStore.getState().activeFolderId)
      .then((newDoc) => {
        if (cancelled) return;
        void workspaceStore.refresh();
        navigate(`/app/editor/${newDoc.id}${search}`, { replace: true });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [docId, isLocal, navigate]);

  /* --- Загрузка обычного документа --- */
  useEffect(() => {
    if (!docId || docId === 'new') return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setDoc(null);

    const load = async (): Promise<void> => {
      try {
        const remote: DocumentFull = isLocal
          ? {
              id: 'local',
              name: __tr("Локальный проект"),
              folderId: null,
              content: localStorage.getItem(OFFLINE_KEY) ?? '{}',
              updatedAt: new Date(0).toISOString(),
            }
          : await workspaceApi.getDocument(docId);
        if (cancelled) return;
        if (remote.id !== docId) throw new Error(__tr("Сервер вернул другой документ"));

        let initial: HydratedDocument = hydrateDocument(remote.content);

        // черновик из IndexedDB
        const owner = authStore.getState().user?.id ?? 'local';
        const draft = await documentDrafts.read(`${owner}:${docId}`).catch(() => null);
        if (cancelled) return;
        if (draft && draft.savedAt > Date.parse(remote.updatedAt)) {
          initial = { ...initial, ...draft.snapshot };
        }

        const checkpoint = async (): Promise<void> => {
          if (cancelled) return;
          const content = JSON.stringify({ version: '2.0', ...initial });
          if (isLocal) localStorage.setItem(OFFLINE_KEY, content);
          else await workspaceApi.saveDocument(docId, content);
        };

        // проброс схемы из URL (пришёл по крошке «Шаблон»)
        if (urlSchemaId && initial.schemaId !== urlSchemaId) {
          initial.schemaId = urlSchemaId;
          await checkpoint();
        }

        // проброс модели из URL
        if (urlModelId) {
          await modelStore.load(urlSchemaId ?? initial.schemaId ?? '');
          if (modelStore.getState().models.some((m) => m.id === urlModelId)) {
            modelStore.select(urlModelId);
          }
        }

        // легаси data → schema + model (только для серверных документов)
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

        // активируем схему — панель «Данные» и крошки её подхватят
        if (!cancelled) {
          schemaStore.setActive(initial.schemaId ?? null);
          setDoc({ ...remote, content: JSON.stringify(initial) });
          setLoading(false);
        }
      } catch (reason) {
        if (!cancelled) {
          setError((reason as Error).message);
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [docId, isLocal, urlSchemaId, urlModelId]);

  const handleSave = useCallback(
    async (state: HydratedDocument): Promise<void> => {
      if (!doc || doc.id !== docId || docId === 'new') return;
      const toSave: HydratedDocument = {
        ...state,
        version: '2.0',
        schemaId: activeSchemaId ?? undefined,
        legacyModelId: doc ? hydrateDocument(doc.content).legacyModelId : undefined,
      } as HydratedDocument;

      if (isLocal) {
        localStorage.setItem(OFFLINE_KEY, JSON.stringify(toSave));
        return;
      }
      if (!docId) return;
      await workspaceApi.saveDocument(docId, JSON.stringify(toSave));
    },
    [docId, isLocal, doc, activeSchemaId],
  );

  if (loading || (doc && doc.id !== docId))
    return <div style={{ padding: 40 }}>{__tr("Загрузка документа…")}</div>;
  if (error) return <div style={{ padding: 40, color: '#dc2626' }}>{error}</div>;
  if (!doc || !docId) return <div style={{ padding: 40 }}>{__tr("Документ не найден")}</div>;

  const initial = hydrateDocument(doc.content);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
          {__tr("← К списку")}</button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {doc.name} {isLocal && __tr("(Сохранено локально)")}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor key={docId} documentId={docId} initialDoc={initial} onSave={handleSave} />
      </div>
    </div>
  );
};

/** Route identity owns loading, drafts and save callbacks; no state survives a document switch. */
export const EditorPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  return <DocumentEditorSession key={docId} docId={docId} />;
};
