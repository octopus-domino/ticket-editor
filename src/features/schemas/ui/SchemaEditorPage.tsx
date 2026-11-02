import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { FieldDef, FieldType } from '../domain/DataSchema';
import { FIELD_TYPE_LABEL } from '../domain/DataSchema';
import { schemaStore } from '../state/SchemaStore';
import { inferFieldsFromSlides } from '../domain/SchemaInference';

interface DraftField extends FieldDef {
  key: string;
  children?: DraftField[];
}

function makeDraft(): DraftField {
  return { key: crypto.randomUUID(), path: '', type: 'string', required: true, label: '', children: [] };
}

const TYPES: FieldType[] = ['string', 'number', 'date', 'boolean', 'image', 'object', 'array'];

function unflattenFields(flat: readonly FieldDef[]): DraftField[] {
  const byFullPath = new Map<string, DraftField>();
  const result: DraftField[] = [];

  const sorted = [...flat].sort((a, b) => a.path.localeCompare(b.path));

  for (const f of sorted) {
    const parts = f.path.split('.');
    const parentPath = parts.slice(0, -1).join('.');
    const ownName = parts[parts.length - 1];

    const parent = parentPath ? byFullPath.get(parentPath) : undefined;
    const canNest = !!parent && (parent.type === 'array' || parent.type === 'object');

    const draft: DraftField = {
      key: crypto.randomUUID(),
      path: canNest ? ownName : f.path,
      type: f.type,
      required: f.required,
      label: f.label,
      defaultValue: f.defaultValue,
      children: [],
    };

    if (canNest && parent) {
      (parent.children ??= []).push(draft);
    } else {
      result.push(draft);
    }

    byFullPath.set(f.path, draft);
  }
  return result;
}

function stripDraft(fields: DraftField[]): FieldDef[] {
  const out: FieldDef[] = [];

  const walk = (arr: DraftField[], prefix: string): void => {
    for (const f of arr) {
      const own = f.path.trim();
      if (!own) continue;
      const fullPath = prefix ? `${prefix}.${own}` : own;
      out.push({
        path: fullPath,
        type: f.type,
        required: f.required,
        label: f.label || own,
        defaultValue: f.defaultValue,
      });
      if (f.children && f.children.length > 0) {
        walk(f.children, fullPath);
      }
    }
  };

  walk(fields, '');
  return out;
}

export const SchemaEditorPage: React.FC = () => {
  const { schemaId } = useParams<{ schemaId?: string }>();
  const navigate = useNavigate();
  const [name, setName] = useState('Схема');
  const [fields, setFields] = useState<DraftField[]>([makeDraft()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schemaId) return;
    const apply = (schema: { name: string; fields: readonly FieldDef[] }) => {
      setName(schema.name);
      setFields(unflattenFields(schema.fields));
    };
    const existing = schemaStore.getState().schemas.find((s) => s.id === schemaId);
    if (existing) {
      apply(existing);
    } else {
      void schemaStore.refresh(schemaId).then(() => {
        const loaded = schemaStore.getState().schemas.find((s) => s.id === schemaId);
        if (loaded) apply(loaded);
      });
    }
  }, [schemaId]);

  const fillFromDocument = (): void => {
    try {
      const raw = localStorage.getItem('ticket-editor:autosave');
      if (!raw) { setError('Нет autosave. Откройте редактор и вернитесь.'); return; }
      const parsed = JSON.parse(raw) as { slides?: unknown[] };
      if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) {
        setError('Нет слайдов в документе.'); return;
      }
      const inferred = inferFieldsFromSlides(parsed.slides);
      if (inferred.length === 0) { setError('Не найдено {{...}} или fieldPath'); return; }
      setFields(unflattenFields(inferred));
      setError(null);
    } catch (e) { setError((e as Error).message); }
  };

  const submit = async (): Promise<void> => {
    const out = stripDraft(fields).filter((f) => f.path.trim());
    if (!name.trim()) { setError('Название схемы'); return; }
    if (out.length === 0) { setError('Хотя бы одно поле'); return; }
    setBusy(true);
    try {
      if (schemaId) {
        await schemaStore.update(schemaId, { name: name.trim(), fields: out });
      } else {
        const created = await schemaStore.create({ name: name.trim(), fields: out });
        navigate(`/schemas/${created.id}`);
        return;
      }
      navigate('/schemas');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="schema-page">
      <h2>{schemaId ? 'Редактирование схемы' : 'Создание схемы'}</h2>
      <p>Схема — список полей. Массивы и объекты поддерживаются: задайте тип и добавьте дочерние поля.</p>
      <div className="schema-form">
        <label className="schema-label">
          <span>Название</span>
          <input className="schema-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="schema-fields-header">
          <h3>Поля схемы</h3>
          <button type="button" className="schema-btn-fill" onClick={fillFromDocument}>
            ⤓ Заполнить из документа
          </button>
        </div>
        <FieldTree fields={fields} onChange={setFields} />
        <button
          type="button"
          className="schema-btn-add"
          onClick={() => setFields((prev) => [...prev, makeDraft()])}
        >
          + Добавить поле
        </button>
        {error && <div className="schema-error">{error}</div>}
        <div className="schema-actions">
          <button
            type="button"
            className="schema-btn-submit"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

const FieldTree: React.FC<{
  fields: DraftField[];
  onChange: (f: DraftField[]) => void;
  depth?: number;
}> = ({ fields, onChange, depth = 0 }) => {
  const update = (key: string, patch: Partial<DraftField>): void => {
    const walk = (arr: DraftField[]): DraftField[] =>
      arr.map((f) => {
        if (f.key === key) return { ...f, ...patch };
        if (f.children) return { ...f, children: walk(f.children) };
        return f;
      });
    onChange(walk(fields));
  };
  const remove = (key: string): void => {
    const walk = (arr: DraftField[]): DraftField[] =>
      arr.filter((f) => f.key !== key).map((f) => (f.children ? { ...f, children: walk(f.children) } : f));
    onChange(walk(fields));
  };
  const addChild = (key: string): void => {
    const walk = (arr: DraftField[]): DraftField[] =>
      arr.map((f) => {
        if (f.key === key) return { ...f, children: [...(f.children ?? []), makeDraft()] };
        if (f.children) return { ...f, children: walk(f.children) };
        return f;
      });
    onChange(walk(fields));
  };

  return (
    <div className="schema-fields-list" style={{ paddingLeft: depth * 16 }}>
      {fields.map((f) => {
        const isContainer = f.type === 'object' || f.type === 'array';
        return (
          <div key={f.key} className="schema-field-block">
            <div className="schema-field-row">
              <input
                type="text"
                value={f.path}
                placeholder="event.title"
                onChange={(e) => update(f.key, { path: e.target.value })}
              />
              <select
                value={f.type}
                onChange={(e) => update(f.key, { type: e.target.value as FieldType })}
              >
                {TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>)}
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => update(f.key, { required: e.target.checked })}
                />
                обяз.
              </label>
              <button className="schema-btn-remove" onClick={() => remove(f.key)}>×</button>
            </div>
            {isContainer && (
              <>
                <FieldTree
                  fields={f.children ?? []}
                  onChange={(c) => update(f.key, { children: c })}
                  depth={depth + 1}
                />
                <button className="schema-btn-add" onClick={() => addChild(f.key)}>
                  + дочернее поле
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};