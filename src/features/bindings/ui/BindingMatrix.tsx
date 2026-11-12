import { t as __tr } from '@/shared/i18n';
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
  const overrides = useStore(docStore, (s) => s.bindings);
  const { activeSchema, schemas } = useSchemas();

  const [uiError, setUiError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSchema) {
      void modelStore.load(activeSchema.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSchema?.id]);

  const elementsById = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    for (const slide of slides) for (const el of slide.elements) map.set(el.id, el);
    return map;
  }, [slides]);

  const bindings = useMemo(() => resolveBindings(slides, overrides), [slides, overrides]);

  const issues = useMemo(
    () => (activeSchema ? validateBindings(bindings, activeSchema) : []),
    [bindings, activeSchema],
  );

  const changeBinding = (binding: Binding, path: string): void => {
    setUiError(null);
    docStore.commit((draft) => {
      const next: Binding = {
        ...binding,
        source: 'manual',
        schemaPath: path || binding.inferred,
        status: path ? 'linked' : 'ignored',
      };
      draft.bindings = draft.bindings.filter(
        (item) => item.elementId !== binding.elementId || item.placeholder !== binding.placeholder,
      );
      draft.bindings.push(next);
    }, `binding-${binding.elementId}`);
  };

  if (!activeSchema) {
    const hasSchemas = schemas.length > 0;

    return (
      <div className="dp-container">
        <div className="dp-section-title">{__tr('Матрица связей')}</div>

        <div className="schema-error">
          {hasSchemas
            ? __tr(
                'Схема не выбрана. Откройте раздел «Схемы» и выберите одну — или создайте новую.',
              )
            : __tr('Схем пока нет. Создайте первую — потом привяжете к ней поля на холсте.')}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginTop: 12,
          }}
        >
          {hasSchemas && (
            <Link to="/app/schemas" className="dp-btn-submit" style={primaryLinkStyle}>
              {__tr('Выбрать схему')}
            </Link>
          )}
          <Link
            to="/app/schemas/new"
            state={{ from: returnTo }}
            className={hasSchemas ? 'dp-btn' : 'dp-btn-submit'}
            style={hasSchemas ? secondaryLinkStyle : primaryLinkStyle}
          >
            {hasSchemas ? __tr('+ Создать схему') : __tr('+ Создать первую схему')}
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
        <span>{__tr('Матрица связей')}</span>
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
          title={__tr('Открыть редактор схемы')}
        >
          {__tr('⚙ Схема')}
        </Link>
      </div>

      <div className="schema-hint" style={{ marginBottom: 8 }}>
        {__tr('Схема:')} <b>{activeSchema.name}</b> · {known.length}{' '}
        {known.length === 1 ? __tr('поле') : __tr('полей')}
        {bindings.length > 0 && (
          <>
            {' '}
            · {bindings.length} {bindings.length === 1 ? __tr('связь') : __tr('связей')}
          </>
        )}
      </div>

      <p className="schema-hint" style={{ marginBottom: 12 }}>
        {__tr('Связи собираются из')}
        <code>{'{{...}}'}</code> {__tr('и')}
        <code>fieldPath</code>
        {__tr('. Выбор сразу правит элемент (undo — Ctrl+Z).')}
      </p>

      {uiError && <div className="schema-error">{uiError}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="dm-table" style={{ fontSize: 11, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ minWidth: 100 }}>{__tr('Элемент')}</th>
              <th>{__tr('Поле')}</th>
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
                    <code style={{ fontSize: 10, wordBreak: 'break-all' }}>{b.placeholder}</code>
                    {isMissing && (
                      <div
                        className="schema-error"
                        style={{ padding: 2, marginTop: 4, fontSize: 10 }}
                      >
                        {__tr('⚠ нет в схеме —')}{' '}
                        <Link
                          to={`/app/schemas/${activeSchema.id}`}
                          state={{ from: returnTo }}
                          style={{
                            color: 'inherit',
                            textDecoration: 'underline',
                          }}
                          title={__tr('Открыть редактор схемы')}
                        >
                          {__tr('добавить')}
                        </Link>
                      </div>
                    )}
                  </td>
                  <td>
                    <select
                      className="dp-select-model"
                      value={b.status === 'ignored' ? '' : b.schemaPath}
                      onChange={(e) => changeBinding(b, e.target.value)}
                      style={{ minWidth: 100 }}
                    >
                      <option value="">{__tr('— не привязано —')}</option>
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
                  {__tr('Нет связей — на холсте нет')}
                  <code>{'{{...}}'}</code> {__tr('и плейсхолдеров.')}
                  <br />
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                    {__tr(
                      'Перетащите поле из вкладки «Данные» на холст — связь появится автоматически.',
                    )}
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
              style={{
                color: 'inherit',
                textDecoration: 'underline',
                fontSize: 11,
              }}
            >
              {__tr('Редактировать схему →')}
            </Link>
          </div>
        </div>
      )}
      {issues.length === 0 && bindings.length > 0 && (
        <div className="schema-hint" style={{ marginTop: 12, color: 'var(--success, #16a34a)' }}>
          {__tr('✓ Связи валидны')}
        </div>
      )}
    </div>
  );
};
