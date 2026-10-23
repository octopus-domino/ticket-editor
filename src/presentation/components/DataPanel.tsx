import React, { useState } from 'react';
import type { DataRoot, DataField, DataFieldType } from '@/shared/types';
import { useStore } from '@/shared/store/store';
import { useDocumentStore } from '../providers/EditorProvider';
import { generateId } from '@/shared/utils/id';
import { download } from '@/lib/download';

const FIELD_TYPES: DataFieldType[] = ['string', 'number', 'date', 'boolean', 'image', 'object', 'array'];

const FIELD_TYPE_LABEL: Record<DataFieldType, string> = {
  string: 'Строка', number: 'Число', date: 'Дата', boolean: 'Да/Нет',
  image: 'Картинка', object: 'Объект', array: 'Массив',
};

function buildDemoData(): DataRoot[] {
  return [
    {
      id: generateId(), name: 'event',
      fields: [
        { id: generateId(), name: 'title',    type: 'string', sample: 'ГАЛА-КОНЦЕРТ' },
        { id: generateId(), name: 'subtitle', type: 'string', sample: 'Симфонический оркестр' },
        { id: generateId(), name: 'day',      type: 'string', sample: '15' },
        { id: generateId(), name: 'month',    type: 'string', sample: 'МАРТА' },
        { id: generateId(), name: 'time',     type: 'string', sample: '19:00' },
        { id: generateId(), name: 'venue',    type: 'string', sample: 'Большой театр' },
        { id: generateId(), name: 'address',  type: 'string', sample: 'Театральная пл., 1' },
      ],
    },
    {
      id: generateId(), name: 'ticket',
      fields: [
        { id: generateId(), name: 'row',    type: 'string', sample: '12' },
        { id: generateId(), name: 'seat',   type: 'string', sample: '8' },
        { id: generateId(), name: 'sector', type: 'string', sample: 'Партер' },
        { id: generateId(), name: 'price',  type: 'string', sample: '4500 ₽' },
      ],
    },
    {
      id: generateId(), name: 'applicant',
      fields: [
        { id: generateId(), name: 'fio',     type: 'string', sample: 'Иванов Иван Иванович' },
        { id: generateId(), name: 'address', type: 'string', sample: 'г. Москва, ул. Пушкина, д. 1' },
        { id: generateId(), name: 'phone',   type: 'string', sample: '+7 (999) 123-45-67' },
      ],
    },
  ];
}

export const DataPanel: React.FC = () => {
  const docStore = useDocumentStore();
  const data = useStore(docStore, (s) => s.data);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const commit = (recipe: (draft: DataRoot[]) => void) => docStore.commit((draft) => recipe(draft.data), 'data-edit');

  const addRoot = () => commit((d) => { d.push({ id: generateId(), name: 'Новый корень', fields: [] }); });
  const loadDemo = () => commit((d) => { d.length = 0; d.push(...buildDemoData()); });

  const updateRoot = (rootId: string, patch: Partial<DataRoot>) => {
    commit((d) => { const r = d.find((x) => x.id === rootId); if (r) Object.assign(r, patch); });
  };
  const removeRoot = (rootId: string) => {
    commit((d) => { const i = d.findIndex((x) => x.id === rootId); if (i >= 0) d.splice(i, 1); });
  };
  const updateField = (rootId: string, fieldId: string, patch: Partial<DataField>) => {
    const walk = (fields: DataField[]): boolean => {
      for (const f of fields) {
        if (f.id === fieldId) { Object.assign(f, patch); return true; }
        if (f.children && walk(f.children)) return true;
      }
      return false;
    };
    commit((d) => { const r = d.find((x) => x.id === rootId); if (r) walk(r.fields); });
  };
  const addField = (rootId: string, parentId?: string) => {
    const newField: DataField = { id: generateId(), name: 'Поле', type: 'string', sample: '' };
    commit((d) => {
      const r = d.find((x) => x.id === rootId);
      if (!r) return;
      if (parentId) {
        const walk = (fields: DataField[]): boolean => {
          for (const f of fields) {
            if (f.id === parentId) { (f.children ??= []).push(newField); return true; }
            if (f.children && walk(f.children)) return true;
          }
          return false;
        };
        walk(r.fields);
      } else { r.fields.push(newField); }
    });
  };
  const removeField = (rootId: string, fieldId: string) => {
    const walk = (fields: DataField[]): boolean => {
      const i = fields.findIndex((f) => f.id === fieldId);
      if (i >= 0) { fields.splice(i, 1); return true; }
      for (const f of fields) if (f.children && walk(f.children)) return true;
      return false;
    };
    commit((d) => { const r = d.find((x) => x.id === rootId); if (r) walk(r.fields); });
  };

  const onDragStart = (e: React.DragEvent, payload: object) => {
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleExport = () => download(JSON.stringify({ version: '1.0', data }, null, 2), `data-schema-${Date.now()}.json`, 'application/json');
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const newData: DataRoot[] = Array.isArray(parsed) ? parsed : (parsed.data || []);
        docStore.commit((draft) => { draft.data = newData; }, 'import-data');
        alert('Данные успешно импортированы');
      } catch { alert('Ошибка импорта: невалидный JSON'); }
    };
    input.click();
  };

  const renderField = (root: DataRoot, field: DataField, path: string, depth = 0): React.ReactNode => {
    const isContainer = field.type === 'object' || field.type === 'array';
    const ownPath = `${path}.${field.name}`;
    const isOpen = expanded[field.id] !== false;

    return (
      <div key={field.id} style={{ paddingLeft: depth * 12, marginBottom: 4 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {isContainer ? (
            <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 10 }} onClick={() => setExpanded((e) => ({ ...e, [field.id]: !isOpen }))}>
              {isOpen ? '▼' : '▶'}
            </button>
          ) : <span style={{ width: 16 }} />}
          <input style={{ flex: 1, minWidth: 40, padding: '4px 6px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 4 }} value={field.name} onChange={(e) => updateField(root.id, field.id, { name: e.target.value })} />
          <select style={{ width: 80, padding: '4px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 4 }} value={field.type} onChange={(e) => updateField(root.id, field.id, { type: e.target.value as DataFieldType })}>
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>)}
          </select>
          <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }} onClick={() => removeField(root.id, field.id)} title="Удалить поле">✕</button>
        </div>

        {!isContainer && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 20, marginTop: 4, alignItems: 'center' }}>
            <input style={{ flex: 1, minWidth: 40, padding: '3px 6px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 4, background: '#f8fafc' }} placeholder="Пример заполнения" value={field.sample} onChange={(e) => updateField(root.id, field.id, { sample: e.target.value })} />
            <div draggable onDragStart={(e) => onDragStart(e, { kind: 'field', path: ownPath, fieldType: field.type, sample: field.sample })} style={{ display: 'inline-flex', padding: '3px 8px', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 12, fontSize: 11, cursor: 'grab', flexShrink: 0 }} title="Перетащите на холст">🏷️</div>
          </div>
        )}

        {field.type === 'array' && (
          <>
            <div draggable onDragStart={(e) => onDragStart(e, { kind: 'array', path: ownPath, arrayName: field.name, sampleCount: field.sampleCount ?? 3, arrayChildren: (field.children ?? []).map((c) => ({ name: c.name, type: c.type })) })} style={{ display: 'inline-block', margin: '4px 0 4px 22px', padding: '3px 8px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12, fontSize: 11, cursor: 'grab' }} title="Перетащите на холст, чтобы создать таблицу">
              🏷️ {ownPath} <span style={{ color: '#92400e', fontSize: 9 }}>→ таблица</span>
            </div>

            <div draggable onDragStart={(e) => onDragStart(e, { kind: 'chart', path: ownPath, chartKind: 'bar', valueField: field.children?.find(c => c.type === 'number')?.name })} style={{ display: 'inline-block', margin: '4px 0 4px 8px', padding: '3px 8px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 12, fontSize: 11, cursor: 'grab' }} title="Перетащите на холст, чтобы создать гистограмму по массиву">
              📊 chart
            </div>
            <div draggable onDragStart={(e) => onDragStart(e, { kind: 'chart', path: ownPath, chartKind: 'donut', valueField: field.children?.find(c => c.type === 'number')?.name })} style={{ display: 'inline-block', margin: '4px 0 4px 8px', padding: '3px 8px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12, fontSize: 11, cursor: 'grab' }} title="Перетащите на холст, чтобы создать пончик по массиву">
              ◎ donut
            </div>
          </>
        )}

        {isContainer && isOpen && (
          <div style={{ marginLeft: 4, borderLeft: '2px solid #e2e8f0', paddingLeft: 4 }}>
            {field.children?.map((c) => renderField(root, c, ownPath, depth + 1))}
            <button type="button" style={{ margin: '4px 0 4px 22px', padding: '2px 8px', fontSize: 10, border: '1px dashed #cbd5e1', borderRadius: 4, background: 'transparent', cursor: 'pointer' }} onClick={() => addField(root.id, field.id)}>+ поле</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 10, overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        <button type="button" style={{ flex: '1 1 100px', padding: '6px 4px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }} onClick={addRoot}>+ Корень</button>
        <button type="button" style={{ flex: '1 1 80px', padding: '6px 4px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontSize: 12 }} onClick={loadDemo} title="Загрузить демонстрационные данные">📋 Пример</button>
        <button type="button" style={{ flex: '0 0 36px', padding: '6px 0', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontSize: 14 }} onClick={handleImport} title="Импорт данных (JSON)">📥</button>
        <button type="button" style={{ flex: '0 0 36px', padding: '6px 0', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontSize: 14 }} onClick={handleExport} title="Экспорт данных (JSON)">📤</button>
      </div>

      {data.length === 0 && <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', margin: 20 }}>Нет данных. Нажмите «+ Корень» или «📋 Пример», чтобы начать.</p>}

      {data.map((root) => {
        const isOpen = expanded[root.id] !== false;
        return (
          <div key={root.id} style={{ marginBottom: 8, border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}>
            <div style={{ display: 'flex', gap: 4, padding: 6, background: '#eef2ff', borderBottom: '1px solid #e2e8f0' }}>
              <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 10 }} onClick={() => setExpanded((e) => ({ ...e, [root.id]: !isOpen }))}>{isOpen ? '▼' : '▶'}</button>
              <input style={{ flex: 1, fontWeight: 700, fontSize: 13, padding: '3px 6px', border: '1px solid transparent', borderRadius: 4, background: 'transparent' }} value={root.name} onChange={(e) => updateRoot(root.id, { name: e.target.value })} />
              <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }} onClick={() => removeRoot(root.id)} title="Удалить корень">✕</button>
            </div>
            {isOpen && (
              <div style={{ padding: 8 }}>
                {root.fields.map((f) => renderField(root, f, root.name))}
                <button type="button" style={{ margin: '4px 0 0 22px', padding: '2px 8px', fontSize: 10, border: '1px dashed #cbd5e1', borderRadius: 4, background: 'transparent', cursor: 'pointer' }} onClick={() => addField(root.id)}>+ поле</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};