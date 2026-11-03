import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

const primaryLinkStyle: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  textDecoration: 'none',
  boxSizing: 'border-box',
};
const secondaryLinkStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 10px',
  textAlign: 'center',
  textDecoration: 'none',
  boxSizing: 'border-box',
};

export const BindingMatrix: React.FC = () => {
  const docStore = useDocumentStore();
  const location = useLocation();
  const returnTo = location.pathname + location.search;

  const slides = useStore(docStore, (s) => s.slides);
  const activeId = useStore(docStore, (s) => s.activeId);
  const { activeSchema, schemas } = useSchemas();

  const activeModelId = useStore(modelStore, (s) => s.selectedId);
  const models = useStore(modelStore, (s) => s.models);
  const activeModel = models.find((m) => m.id === activeModelId);

  const [uiError, setUiError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSchema) {
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
    const hasSchemas = schemas.length > 0;

    return (
      <div className="dp-container">
        <div className="dp-section-title">Матрица связей</div>

        <div className="schema-error">
          {hasSchemas
            ? 'Схема не выбрана. Откройте раздел «Схемы» и выберите одну — или создайте новую.'
            : 'Схем пока нет. Создайте первую — потом привяжете к ней поля на холсте.'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {hasSchemas && (
            <Link
              to="/app/schemas"
              className="dp-btn-submit"
              style={primaryLinkStyle}
            >
              Выбрать схему
            </Link>
          )}
          <Link
            to="/app/schemas/new"
            state={{ from: returnTo }}
            className={hasSchemas ? 'dp-btn' : 'dp-btn-submit'}
            style={hasSchemas ? secondaryLinkStyle : primaryLinkStyle}
          >
            {hasSchemas ? '+ Создать схему' : '+ Создать первую схему'}
          </Link>
        </div>
      </div>
    );
  }

  const known = flattenFields(activeSchema.fields);
  const arrayPaths = known.filter((f) => f.type === 'array');

  return (
    <div className="dp-container">
      <div
        className="dp-section-title"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>Матрица связей</span>
        <Link
          to={`/app/schemas/${activeSchema.id}`}
          state={{ from: returnTo }}
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--accent)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
          title="Открыть редактор схемы"
        >
          ⚙ Схема
        </Link>
      </div>

      <div className="schema-hint" style={{ marginBottom: 8 }}>
        Схема: <b>{activeSchema.name}</b> · {known.length}{' '}
        {known.length === 1 ? 'поле' : 'полей'}
        {bindings.length > 0 && (
          <> · {bindings.length} {bindings.length === 1 ? 'связь' : 'связей'}</>
        )}
      </div>

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
              const allowed = isTable ? arrayPaths : known;
              const isMissing = !allowed.some((f) => f.path === b.schemaPath);
              return (
                <tr key={key}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{b.elementLabel}</div>
                    <code style={{ fontSize: 10, wordBreak: 'break-all' }}>
                      {b.placeholder}
                    </code>
                    {isMissing && (
                      <div
                        className="schema-error"
                        style={{ padding: 2, marginTop: 4, fontSize: 10 }}
                      >
                        ⚠ нет в схеме —{' '}
                        <Link
                          to={`/app/schemas/${activeSchema.id}`}
                          state={{ from: returnTo }}
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                          title="Открыть редактор схемы"
                        >
                          добавить
                        </Link>
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
                        <option key={f.path} value={f.path}>
                          {f.path}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {bindings.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="schema-hint"
                  style={{ textAlign: 'center', padding: 16 }}
                >
                  Нет связей — на холсте нет <code>{'{{...}}'}</code> и плейсхолдеров.
                  <br />
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                    Перетащите поле из вкладки «Данные» на холст — связь появится
                    автоматически.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {issues.length > 0 && (
        <div className="schema-error" style={{ marginTop: 12, fontSize: 11 }}>
          {issues.map((i, k) => (
            <div key={k} style={{ marginBottom: 4 }}>
              {i.kind}: {i.message}
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <Link
              to={`/app/schemas/${activeSchema.id}`}
              state={{ from: returnTo }}
              style={{ color: 'inherit', textDecoration: 'underline', fontSize: 11 }}
            >
              Редактировать схему →
            </Link>
          </div>
        </div>
      )}
      {issues.length === 0 && bindings.length > 0 && (
        <div
          className="schema-hint"
          style={{ marginTop: 12, color: 'var(--success, #16a34a)' }}
        >
          ✓ Связи валидны
        </div>
      )}
    </div>
  );
};