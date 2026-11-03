import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Editor, type EditorInitialDoc } from '@/presentation/components/Editor';
import { httpTemplateRepository } from '../api/HttpTemplateRepository';
import type { Template } from '../domain/Template';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { resolveBindings } from '@/features/bindings/domain/BindingResolver';
import { documentDrafts } from '@/presentation/hooks/editor/useDocumentPersistence';
import { authStore } from '@/auth/store';

export function TemplateEditorPage() {
  const { templateId } = useParams();
  const [template, setTemplate] = useState<Template | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setTemplate(null);
    setError(null);
    void httpTemplateRepository
      .get(templateId!)
      .then(async (value) => {
        if (!active) return;
        if (!value) {
          setError('Шаблон не найден');
          return;
        }
        const owner = authStore.getState().user?.id ?? 'local';
        const draft = await documentDrafts.read(`${owner}:template:${value.id}`).catch(() => null);
        if (!active) return;
        if (draft && draft.savedAt > Date.parse(value.updatedAt))
          value = {
            ...value,
            slides: draft.snapshot.slides,
            bindings: draft.snapshot.bindings ?? [],
          };
        if (value.schemaId) schemaStore.setActive(value.schemaId);
        setTemplate(value);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [templateId]);
  const save = useCallback(
    async (document: EditorInitialDoc) => {
      if (!template) return;
      await httpTemplateRepository.update(template.id, {
        ...template,
        slides: document.slides,
        bindings: resolveBindings(document.slides, document.bindings),
      });
    },
    [template],
  );
  if (error) return <p role="alert">{error}</p>;
  if (!template) return <p>Загрузка…</p>;
  return (
    <Editor
      key={template.id}
      documentId={`template:${template.id}`}
      initialDoc={{
        slides: template.slides,
        activeId: template.slides[0].id,
        data: [],
        bindings: template.bindings,
      }}
      onSave={save}
    />
  );
}
