import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor } from '@/presentation/components/Editor';
import { workspaceApi } from '../api';
import type { DocumentFull } from '../types';
import { createSlide } from '@/domain/slide/operations';
import type { Slide, DataRoot } from '@/shared/types';

interface HydratedDoc {
  slides: Slide[];
  data: DataRoot[];
  activeId: string;
}

const OFFLINE_KEY = 'ticket-editor:offline-doc';

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
      <div style={{ padding: 8, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/')}
          style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}
        >
          ← К списку
        </button>
        <span style={{ fontSize: 13, color: '#64748b' }}>
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