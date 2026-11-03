import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor } from '@/presentation/components/Editor';
import { workspaceApi } from '../api';
import type { DocumentFull } from '../types';
import { createSlide } from '@/domain/slide/operations';
import type { Slide, DataRoot } from '@/shared/types';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { schemaFromLegacyData, modelFromLegacyData } from '@/features/schemas/domain/SchemaInference';

interface HydratedDoc {
  slides: Slide[];
  data: DataRoot[];
  activeId: string;
}

const OFFLINE_KEY = 'ticket-editor:offline-doc';
const SCHEMA_KEY = 'ticket-editor:schemaId';

function parseContent(content: string): HydratedDoc {
  try {
    const parsed = JSON.parse(content || '{}');
    if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      const slide = createSlide(1);
      return { slides: [slide], data: parsed.data || [], activeId: slide.id };
    }
    return {
      slides: parsed.slides,
      data: parsed.data || [],
      activeId: parsed.activeId || parsed.slides[0].id,
    };
  } catch {
    const slide = createSlide(1);
    return { slides: [slide], data: [], activeId: slide.id };
  }
}

export const EditorPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLocal = docId === 'local';
  const migratedRef = useRef(false);

  useEffect(() => {
    if (isLocal) {
      const saved = localStorage.getItem(OFFLINE_KEY);
      const content = saved || JSON.stringify({});
      setDoc({
        id: 'local',
        name: 'Локальный проект',
        folderId: null,
        content,
        updatedAt: new Date().toISOString(),
      });
      setLoading(false);
      return;
    }

    if (!docId) return;
    let cancelled = false;
    setLoading(true);
    workspaceApi
      .getDocument(docId)
      .then((d) => { if (!cancelled) { setDoc(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError((e as Error).message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [docId, isLocal]);

  useEffect(() => {
    if (!doc || migratedRef.current) return;
    migratedRef.current = true;

    const initial = parseContent(doc.content);
    if (initial.data.length === 0) return;
    if (localStorage.getItem(SCHEMA_KEY)) return;

    void (async () => {
      try {
        const { name, fields } = schemaFromLegacyData(initial.data);
        if (fields.length === 0) return;
        const schema = await schemaStore.create({ name, fields });
        const values = modelFromLegacyData(initial.data);
        await modelStore.create(schema.id, 'Импорт из документа', values);
        console.info('[migration] legacy data → schema/model created', schema.id);
      } catch (e) {
        console.warn('[migration] failed (offline?)', e);
      }
    })();
  }, [doc]);

  const handleSave = useCallback(async (state: HydratedDoc) => {
    if (isLocal) {
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(state));
      return;
    }
    if (!docId) return;
    await workspaceApi.saveDocument(docId, JSON.stringify(state));
  }, [docId, isLocal]);

  if (loading) return <div style={{ padding: 40 }}>Загрузка документа…</div>;
  if (error) return <div style={{ padding: 40, color: '#dc2626' }}>{error}</div>;
  if (!doc || !docId) return <div style={{ padding: 40 }}>Документ не найден</div>;

  const initial = parseContent(doc.content);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: 8, borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/app')}
          style={{ border: '1px solid var(--border-strong)', background: 'var(--panel)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}
        >
          ← К списку
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {doc.name} {isLocal && '(Сохранено локально)'}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          key={docId}
          documentId={docId}
          initialDoc={initial}
          onSave={handleSave}
        />
      </div>
    </div>
  );
};