import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataSchema, FieldDef } from '@/features/schemas/domain/DataSchema';
import { getPath, setPath } from '../domain/DataModelValidator';
import { useModelHistory } from '../state/useModelHistory';

function getDirectChildren(fields: FieldDef[], parentPath: string): FieldDef[] {
  const prefix = `${parentPath}.`;
  return fields.filter((f) => {
    if (!f.path.startsWith(prefix)) return false;
    return !f.path.slice(prefix.length).includes('.');
  });
}

function isChildOfArray(fields: FieldDef[], fieldPath: string): boolean {
  const parts = fieldPath.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parentPath = parts.slice(0, i).join('.');
    const parent = fields.find((f) => f.path === parentPath);
    if (parent && parent.type === 'array') return true;
  }
  return false;
}

const JsonCell: React.FC<{ value: unknown; onChange: (v: unknown) => void }> = ({ value, onChange }) => {
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState(false);

  useEffect(() => {
    setText(JSON.stringify(value ?? {}, null, 2));
    setError(false);
  }, [value]);

  const commit = () => {
    try {
      const parsed = JSON.parse(text);
      setError(false);
      onChange(parsed);
    } catch {
      setError(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <textarea
        className="mv-json"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        style={error ? { borderColor: 'var(--danger)' } : undefined}
      />
      {error && <span style={{ fontSize: 10, color: 'var(--danger)' }}>Невалидный JSON</span>}
    </div>
  );
};

export const ModelValuesEditor: React.FC<{
  modelId: string;
  schema: DataSchema;
  values: Readonly<Record<string, unknown>>;
  onChange: (next: Record<string, unknown>) => void;
}> = ({ modelId, schema, values, onChange }) => {
  const history = useModelHistory(modelId, values as Record<string, unknown>);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const allFields = useMemo(() => schema.fields, [schema]);

  // Отфильтровываем поля, которые являются потомками массива
  const roots = useMemo(
    () => allFields.filter((f) => !isChildOfArray(allFields, f.path)),
    [allFields],
  );

  const orderedPaths = useMemo(
    () =>
      roots
        .filter(
          (f) =>
            f.type === 'string' || f.type === 'number' || f.type === 'date' || f.type === 'boolean',
        )
        .map((f) => f.path),
    [roots],
  );

  const focusByIndex = useCallback(
    (idx: number) => {
      const path = orderedPaths[idx];
      if (!path) return;
      const el = inputRefs.current.get(path);
      if (el) { el.focus(); el.select(); }
    },
    [orderedPaths],
  );

  const setValue = useCallback(
    (path: string, value: unknown) => {
      const next = setPath(values as Record<string, unknown>, path, value);
      history.push(next, path);
      onChange(next);
    },
    [values, history, onChange],
  );

  const handleUndo = useCallback(() => {
    const prev = history.undo();
    if (prev) onChange(prev);
  }, [history, onChange]);

  const handleRedo = useCallback(() => {
    const next = history.redo();
    if (next) onChange(next);
  }, [history, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.tagName === 'TEXTAREA') return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, path: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = orderedPaths.indexOf(path);
      if (idx === -1) return;
      focusByIndex(e.shiftKey ? idx - 1 : idx + 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  const renderField = (field: FieldDef, parentPath: string): React.ReactNode => {
    const path = parentPath ? `${parentPath}.${field.path}` : field.path;
    const val = getPath(values, path);

    if (field.type === 'array') {
      const arr = Array.isArray(val) ? (val as Record<string, unknown>[]) : [];
      const children = getDirectChildren(allFields, path);

      // Если в схеме нет дочерних полей для массива — используем простую JSON-таблицу
      if (children.length === 0) {
        return (
          <div key={path} className="mv-array">
            <div className="mv-array-head">
              <span>{path} (массив)</span>
              <button type="button" className="dp-btn" onClick={() => setValue(path, [...arr, {}])}>
                + Строка
              </button>
            </div>
            <div className="mv-table-scroll">
              <table className="mv-table mv-table-wide">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>JSON</th>
                    <th style={{ width: 30 }} />
                  </tr>
                </thead>
                <tbody>
                  {arr.map((row, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <JsonCell
                          value={row}
                          onChange={(next) => {
                            const copy = [...arr];
                            copy[i] = next as Record<string, unknown>;
                            setValue(path, copy);
                          }}
                        />
                      </td>
                      <td>
                        <button type="button" className="dp-btn-danger" onClick={() => setValue(path, arr.filter((_, j) => j !== i))}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // Если есть дети (code, name) — рендерим таблицу с колонками
      return (
        <div key={path} className="mv-array">
          <div className="mv-array-head">
            <span>{path} (массив)</span>
            <button type="button" className="dp-btn" onClick={() => setValue(path, [...arr, {}])}>
              + Строка
            </button>
          </div>
          <div className="mv-table-scroll">
            <table className="mv-table mv-table-wide">
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  {children.map((c) => {
                    const rel = c.path.slice(path.length + 1);
                    return (
                      <th key={c.path} title={c.path} className="mv-table-th">
                        {rel}
                        {c.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                      </th>
                    );
                  })}
                  <th style={{ width: 30 }} />
                </tr>
              </thead>
              <tbody>
                {arr.map((row, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    {children.map((c) => {
                      const rel = c.path.slice(path.length + 1);
                      return (
                        <td key={c.path}>
                          <input
                            className="dp-input"
                            value={String(row[rel] ?? '')}
                            onChange={(e) => {
                              const nextArr = [...arr];
                              nextArr[i] = { ...nextArr[i], [rel]: e.target.value };
                              setValue(path, nextArr);
                            }}
                          />
                        </td>
                      );
                    })}
                    <td>
                      <button type="button" className="dp-btn-danger" onClick={() => setValue(path, arr.filter((_, j) => j !== i))}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (field.type === 'object') {
      return (
        <div key={path} className="mv-object">
          <div className="mv-object-head">{path} (объект)</div>
          <JsonCell value={val ?? {}} onChange={(next) => setValue(path, next)} />
        </div>
      );
    }

    return (
      <label key={path} className="mv-field">
        <span>
          {path}
          {field.required ? ' *' : ''}
        </span>
        <input
          ref={(el) => {
            if (el) inputRefs.current.set(path, el);
            else inputRefs.current.delete(path);
          }}
          className="dp-input"
          value={String(val ?? '')}
          onChange={(e) => setValue(path, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, path)}
        />
      </label>
    );
  };

  return (
    <div className="mv-editor">
      <div className="mv-toolbar">
        <button type="button" className="dp-btn" onClick={handleUndo} disabled={!history.canUndo} title="Ctrl+Z">
          ↶ Отменить
        </button>
        <button type="button" className="dp-btn" onClick={handleRedo} disabled={!history.canRedo} title="Ctrl+Y">
          ↷ Повторить
        </button>
      </div>

      {roots.length === 0 && <p className="dp-empty">Схема пуста — добавьте поля в редакторе схем.</p>}
      {roots.map((f) => renderField(f, ''))}
    </div>
  );
};