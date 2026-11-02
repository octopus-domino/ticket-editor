import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '@/shared/store/store';
import { inferFieldsFromSlides, flattenFields } from '@/features/schemas/domain/SchemaInference';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { getPath } from '@/features/data-models/domain/DataModelValidator';
import { useDocumentStore } from '../providers/EditorProvider';

export const DataPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const { schemas, activeSchema, loading, error } = useSchemas();
  const models = useStore(modelStore, (s) => s.models);
  const activeModelId = useStore(modelStore, (s) => s.selectedId);
  const activeModel = models.find((m) => m.id === activeModelId);

  const [uiError, setUiError] = React.useState<string | null>(null);

  useEffect(() => {
    if (activeSchema) {
      void modelStore.load(activeSchema.id);
    }
  }, [activeSchema?.id]);

  const createFromDocument = async (): Promise<void> => {
    const slides = docStore.getState().slides;
    const inferred = inferFieldsFromSlides(slides);
    if (inferred.length === 0) {
      setUiError('В документе нет {{...}} или fieldPath.');
      return;
    }
    setUiError(null);
    await schemaStore.create({
      name: `Схема ${new Date().toLocaleDateString('ru-RU')}`,
      fields: inferred,
    });
  };

  const createEmpty = async (): Promise<void> => {
    setUiError(null);
    await schemaStore.create({
      name: 'Новая схема',
      fields: [
        { path: 'title', type: 'string', required: true, label: 'Заголовок' },
        { path: 'subtitle', type: 'string', required: false, label: 'Подзаголовок' },
      ],
    });
  };

  const onDragField = (e: React.DragEvent, path: string, type: string): void => {
    let sample = '';
    if (activeModel) {
      const v = getPath(activeModel.values, path);
      if (v !== undefined && v !== null) sample = String(v);
    }
    e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'field', path, fieldType: type, sample }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onDragArray = (e: React.DragEvent, path: string): void => {
    if (!activeSchema) return;

    const flat = flattenFields(activeSchema.fields);
    const prefix = `${path}.`;

    // Прямые дети массива (без вложенных массивов/объектов)
    const arrayChildren = flat
      .filter((f) => f.path.startsWith(prefix))
      .map((f) => {
        const rel = f.path.slice(prefix.length);
        if (rel.includes('.')) return null;
        if (f.type === 'array' || f.type === 'object') return null;
        return { name: rel, type: f.type };
      })
      .filter((c): c is { name: string; type: string } => c !== null);

    // Если в активной модели уже есть данные — берём их длину для sampleCount
    let sampleCount = 3;
    if (activeModel) {
      const arr = getPath(activeModel.values, path);
      if (Array.isArray(arr) && arr.length > 0) sampleCount = arr.length;
    }

    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        kind: 'array',
        path,
        arrayName: path.split('.').pop(),
        sampleCount,
        arrayChildren,
      }),
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (loading) return <div className="dp-container"><div className="schema-hint">Загрузка…</div></div>;
  if (error) return <div className="dp-container"><div className="schema-error">{error}</div></div>;

  if (schemas.length === 0) {
    return (
      <div className="dp-container">
        <div className="dp-section-title">Нет схем</div>
        <p className="schema-hint">Создать можно из текущего документа (все {'{{...}}'}) или пустую.</p>
        {uiError && <div className="schema-error">{uiError}</div>}
        <button className="dp-btn-submit" onClick={() => void createFromDocument()}>
          ⤓ Создать из документа
        </button>
        <button className="dp-btn" onClick={() => void createEmpty()} style={{ marginTop: 8, width: '100%' }}>
          + Пустая схема
        </button>
      </div>
    );
  }

  if (!activeSchema) return <div className="dp-container"><div className="schema-hint">Выберите схему</div></div>;

  const leafFields = flattenFields(activeSchema.fields).filter((f) => f.type !== 'object' && f.type !== 'array');
  const arrayFields = flattenFields(activeSchema.fields).filter((f) => f.type === 'array');

  return (
    <div className="dp-container">
      <div className="dp-toolbar" style={{ flexDirection: 'column', gap: 4 }}>
        <select
          className="dp-select-model"
          value={activeSchema.id}
          onChange={(e) => schemaStore.setActive(e.target.value)}
        >
          {schemas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
          <Link to={`/schemas/${activeSchema.id}`} style={{ color: '#4f46e5' }}>✎ Редактировать схему</Link>
        </div>
      </div>

      <div className="dp-section-title">Поля (drag на холст)</div>
      <div className="dp-list">
        {leafFields.map((f) => (
          <div key={f.path} className="dp-field-chip" draggable onDragStart={(e) => onDragField(e, f.path, f.type)}>
            <span>{f.path}</span>
            <span className="schema-hint">{f.type}</span>
          </div>
        ))}
        {leafFields.length === 0 && <div className="schema-hint">Нет полей</div>}
      </div>

      {arrayFields.length > 0 && (
        <>
          <div className="dp-section-title">Массивы (drag → таблица)</div>
          {arrayFields.map((f) => (
            <div key={f.path} className="dp-field-chip" draggable onDragStart={(e) => onDragArray(e, f.path)}>
              <span>{f.path}</span>
              <span className="schema-hint">→ таблица</span>
            </div>
          ))}
        </>
      )}

      <div className="dp-section-title">Модели</div>
      {models.length === 0 ? (
        <div className="schema-hint">
          Нет моделей. Создайте в разделе <Link to="/data-models" style={{ color: '#4f46e5' }}>Данные</Link>.
        </div>
      ) : (
        <>
          <select
            className="dp-select-model"
            value={activeModelId ?? ''}
            onChange={(e) => modelStore.select(e.target.value || null)}
          >
            <option value="" disabled>— выберите модель —</option>
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button
            className="dp-btn-submit"
            onClick={() => activeModel && docStore.applyModelToSlides(activeModel.values)}
            disabled={!activeModelId}
          >
            Применить модель к холсту
          </button>
        </>
      )}

      {uiError && <div className="schema-error">{uiError}</div>}
    </div>
  );
};