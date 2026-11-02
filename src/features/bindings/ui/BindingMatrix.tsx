import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/shared/store/store';
import { useDocumentStore } from '@/presentation/providers/EditorProvider';
import type { Binding } from '../domain/Binding';
import { resolveBindings } from '../domain/BindingResolver';
import { validateBindings } from '../domain/BindingValidator';
import { flattenFields } from '@/features/schemas/domain/SchemaInference';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { getPath } from '@/features/data-models/domain/DataModelValidator';
import type { CanvasElement } from '@/shared/types';

export const BindingMatrix: React.FC = () => {
  const docStore = useDocumentStore();
  const slides = useStore(docStore, (s) => s.slides);
  const activeId = useStore(docStore, (s) => s.activeId);
  const { activeSchema } = useSchemas();

  const activeModelId = useStore(modelStore, (s) => s.selectedId);
  const models = useStore(modelStore, (s) => s.models);
  const activeModel = models.find((m) => m.id === activeModelId);

  const [uiError, setUiError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSchema && models.length === 0) {
      void modelStore.load(activeSchema.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchema?.id]);

  const activeSlide = slides.find((s) => s.id === activeId) ?? null;

  const elementsById = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    for (const el of activeSlide?.elements ?? []) map.set(el.id, el);
    return map;
  }, [activeSlide]);

  const bindings = useMemo(() => resolveBindings(slides), [slides]);

  const issues = useMemo(
    () => (activeSchema ? validateBindings(bindings, activeSchema) : []),
    [bindings, activeSchema],
  );

  const changeBinding = (b: Binding, newPath: string): void => {
    if (!newPath) return;
    setUiError(null);
    try {
      docStore.commit((draft) => {
        const slide = draft.slides.find((s) => s.id === draft.activeId);
        if (!slide) return;
        const el = slide.elements.find((e) => e.id === b.elementId);
        if (!el) return;

        const newValue = activeModel ? getPath(activeModel.values, newPath) : undefined;
        const newSample = newValue !== undefined && newValue !== null ? String(newValue) : '';

        if (el.type === 'placeholder') {
          el.fieldPath = newPath;
          el.label = newPath;
          el.sample = newSample;
          return;
        }

        if (el.type === 'image') {
          if (el.src) el.src = el.src.split(b.placeholder).join(`{{${newPath}}}`);
          return;
        }

        if (el.type === 'table') {
          // b.schemaPath — базовый путь массива (catalog.items).
          // Меняем только базу: {{catalog.items[0].name}} → {{newBase[0].name}}.
          const oldPrefix = `{{${b.schemaPath}`;
          const newPrefix = `{{${newPath}`;
          el.data = (el.data ?? []).map((row) =>
            row.map((cell) =>
              typeof cell === 'string' ? cell.split(oldPrefix).join(newPrefix) : cell,
            ),
          );
          return;
        }

        if (el.type === 'text' || el.type === 'shape' || el.type === 'footer') {
          const newToken = `{{${newPath}}}`;
          if (el.text) el.text = el.text.split(b.placeholder).join(newToken);
          if ('html' in el && typeof (el as { html?: string }).html === 'string') {
            const html = (el as { html?: string }).html;
            if (html) (el as { html?: string }).html = html.split(b.placeholder).join(newToken);
          }
        }
      }, `binding-${b.elementId}`);
    } catch (e) {
      setUiError((e as Error).message);
    }
  };

  if (!activeSchema) {
    return (
      <div className="dp-container">
        <div className="schema-error">
          Схема не выбрана. Откройте вкладку «Данные» и выберите схему.
        </div>
      </div>
    );
  }

  const known = flattenFields(activeSchema.fields);
  const arrayPaths = known.filter((f) => f.type === 'array');

  return (
    <div className="dp-container">
      <div className="dp-section-title">Матрица связей</div>
      <p className="schema-hint" style={{ marginBottom: 12 }}>
        Связи собираются из <code>{'{{...}}'}</code> и <code>fieldPath</code>.
        Выбор сразу правит элемент (undo — Ctrl+Z).
      </p>

      {uiError && <div className="schema-error">{uiError}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="dm-table" style={{ fontSize: 11, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ minWidth: 100 }}>Элемент</th>
              <th>Поле</th>
            </tr>
          </thead>
          <tbody>
            {bindings.map((b) => {
              const key = `${b.elementId}|${b.placeholder}`;
              const element = elementsById.get(b.elementId);
              const isTable = element?.type === 'table';
              // Для таблиц предлагаем только массивы.
              const allowed = isTable ? arrayPaths : known;
              const isMissing = !allowed.some((f) => f.path === b.schemaPath);
              return (
                <tr key={key}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{b.elementLabel}</div>
                    <code style={{ fontSize: 10, wordBreak: 'break-all' }}>{b.placeholder}</code>
                    {isMissing && (
                      <div
                        className="schema-error"
                        style={{ padding: 2, marginTop: 4, fontSize: 10 }}
                      >
                        ⚠ нет в схеме
                      </div>
                    )}
                  </td>
                  <td>
                    <select
                      className="dp-select-model"
                      value={b.schemaPath}
                      onChange={(e) => changeBinding(b, e.target.value)}
                      style={{ minWidth: 100 }}
                    >
                      <option value="">— не привязано —</option>
                      {allowed.map((f) => (
                        <option key={f.path} value={f.path}>{f.path}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {bindings.length === 0 && (
              <tr>
                <td colSpan={2} className="schema-hint" style={{ textAlign: 'center' }}>
                  Нет связей — на холсте нет {'{{...}}'}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {issues.length > 0 && (
        <div className="schema-error" style={{ marginTop: 12, fontSize: 11 }}>
          {issues.map((i, k) => (
            <div key={k}>{i.kind}: {i.message}</div>
          ))}
        </div>
      )}
      {issues.length === 0 && bindings.length > 0 && (
        <div className="schema-hint" style={{ marginTop: 12, color: '#16a34a' }}>
          ✓ Связи валидны
        </div>
      )}
    </div>
  );
};