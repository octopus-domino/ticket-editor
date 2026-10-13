import React, { useState } from 'react';
import type { DataRoot, DataField, DataFieldType } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

const FIELD_TYPES: { value: DataFieldType; label: string; icon: string }[] = [
  { value: 'string',  label: 'Текст',   icon: 'T' },
  { value: 'number',  label: 'Число',   icon: '#' },
  { value: 'date',    label: 'Дата',    icon: '📅' },
  { value: 'boolean', label: 'Да/Нет',  icon: '✓' },
  { value: 'image',   label: 'Картинка',icon: '🖼' },
  { value: 'object',  label: 'Объект',  icon: '{}' },
  { value: 'array',   label: 'Массив',  icon: '[]' },
];

export const newField = (name = 'newField', type: DataFieldType = 'string'): DataField => ({
  id: uid(),
  name,
  type,
  sample: type === 'string' ? 'Пример'
    : type === 'number' ? '0'
    : type === 'date' ? '01.01.2026'
    : type === 'boolean' ? 'true'
    : type === 'image' ? 'https://picsum.photos/200'
    : '',
  children: (type === 'object' || type === 'array') ? [] : undefined,
  sampleCount: type === 'array' ? 3 : undefined,
});

export const EXAMPLE_DATA: DataRoot[] = [
  {
    id: uid(), name: 'event',
    fields: [
      { id: uid(), name: 'title',    type: 'string', sample: 'Гамлет' },
      { id: uid(), name: 'subtitle', type: 'string', sample: 'Трагедия в 5 актах' },
      { id: uid(), name: 'date',     type: 'date',   sample: '15.03.2026' },
      { id: uid(), name: 'time',     type: 'string', sample: '19:00' },
      { id: uid(), name: 'duration', type: 'string', sample: '3 ч 20 мин' },
      { id: uid(), name: 'ageLimit', type: 'string', sample: '16+' },
      { id: uid(), name: 'poster',   type: 'image',  sample: 'https://picsum.photos/400/600' },
      {
        id: uid(), name: 'venue', type: 'object', sample: '',
        children: [
          { id: uid(), name: 'name',    type: 'string', sample: 'Большой театр' },
          { id: uid(), name: 'address', type: 'string', sample: 'Театральная пл., 1' },
          { id: uid(), name: 'city',    type: 'string', sample: 'Москва' },
        ],
      },
      {
        id: uid(), name: 'tickets', type: 'array', sample: '', sampleCount: 3,
        children: [
          { id: uid(), name: 'sector', type: 'string', sample: 'Партер' },
          { id: uid(), name: 'row',    type: 'string', sample: '5' },
          { id: uid(), name: 'seat',   type: 'string', sample: '12' },
          { id: uid(), name: 'price',  type: 'number', sample: '4500' },
        ],
      },
    ],
  },
  {
    id: uid(), name: 'order',
    fields: [
      { id: uid(), name: 'number', type: 'string', sample: 'TKT-2026-001234' },
      { id: uid(), name: 'buyer',  type: 'string', sample: 'Иванов И.И.' },
      { id: uid(), name: 'total',  type: 'number', sample: '9000' },
      { id: uid(), name: 'qrCode', type: 'image',  sample: 'https://picsum.photos/200/200' },
    ],
  },
];

interface Props {
  data: DataRoot[];
  setData: (d: DataRoot[]) => void;
}

export const DataPanel: React.FC<Props> = ({ data, setData }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const updateField = (fieldId: string, patch: Partial<DataField>) => {
    const walk = (fields: DataField[]): DataField[] =>
      fields.map((f) => f.id === fieldId
        ? { ...f, ...patch }
        : { ...f, children: f.children ? walk(f.children) : undefined });
    setData(data.map((r) => ({ ...r, fields: walk(r.fields) })));
  };

  const removeField = (fieldId: string) => {
    const walk = (fields: DataField[]): DataField[] =>
      fields.filter((f) => f.id !== fieldId)
        .map((f) => ({ ...f, children: f.children ? walk(f.children) : undefined }));
    setData(data.map((r) => ({ ...r, fields: walk(r.fields) })));
  };

  const addChild = (parentId: string) => {
    const walk = (fields: DataField[]): DataField[] =>
      fields.map((f) => {
        if (f.id === parentId) {
          const c = newField('field', 'string');
          return { ...f, children: [...(f.children || []), c] };
        }
        return { ...f, children: f.children ? walk(f.children) : undefined };
      });
    setData(data.map((r) => ({ ...r, fields: walk(r.fields) })));
  };

  const addRoot = () => {
    const n = data.length + 1;
    setData([...data, { id: uid(), name: 'object' + n, fields: [] }]);
  };
  const updateRootName = (rootId: string, name: string) =>
    setData(data.map((r) => r.id === rootId ? { ...r, name } : r));
  const removeRoot = (rootId: string) => setData(data.filter((r) => r.id !== rootId));
  const addRootField = (rootId: string) =>
    setData(data.map((r) => r.id === rootId
      ? { ...r, fields: [...r.fields, newField('field', 'string')] } : r));

  const onDragStart = (e: React.DragEvent, payload: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const download = (content: string, name: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const exportData = () => {
    download(JSON.stringify({ version: '1.0', data }, null, 2), 'data-schema.json', 'application/json');
  };

  const normalizeField = (f: any): DataField => {
    const type = (f.type || 'string') as DataFieldType;
    const norm: DataField = {
      id: f.id || uid(),
      name: f.name || 'field',
      type,
      sample: f.sample ?? (type === 'image' ? 'https://picsum.photos/200' : ''),
      sampleCount: type === 'array' ? (f.sampleCount ?? 3) : undefined,
    };
    if ((type === 'object' || type === 'array') && Array.isArray(f.children)) {
      norm.children = f.children.map(normalizeField);
    } else if (type === 'object' || type === 'array') {
      norm.children = [];
    }
    return norm;
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          let imported: DataRoot[];
          if (Array.isArray(parsed)) imported = parsed;
          else if (parsed && Array.isArray(parsed.data)) imported = parsed.data;
          else throw new Error('Ожидается { data: [...] } или массив');
          imported = imported.map((r: any) => ({
            id: r.id || uid(),
            name: r.name || 'object',
            fields: (r.fields || []).map(normalizeField),
          }));
          setData(imported);
        } catch (e: any) { alert('Ошибка импорта: ' + (e?.message || e)); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const loadExample = () => {
    if (data.length && !confirm('Заменить текущую схему данных примером?')) return;
    setData(JSON.parse(JSON.stringify(EXAMPLE_DATA)));
  };

  const renderField = (f: DataField, parentPath: string, depth: number): React.ReactNode => {
    const isArray = f.type === 'array';
    const isObject = f.type === 'object';
    const isContainer = isArray || isObject;
    const ownPath = parentPath ? `${parentPath}.${f.name}` : f.name;
    const isLeaf = !isContainer;
    const isExp = expanded[f.id] !== false;

    return (
      <div key={f.id} className="df-node" style={{ paddingLeft: depth * 10 }}>
        <div className="df-row">
          {isContainer ? (
            <button className="df-toggle" onClick={() => toggle(f.id)}>{isExp ? '▾' : '▸'}</button>
          ) : <span className="df-toggle" />}

          <input className="df-name" value={f.name}
            onChange={(e) => updateField(f.id, { name: e.target.value })} />
          <select className="df-type" value={f.type}
            onChange={(e) => {
              const t = e.target.value as DataFieldType;
              const patch: Partial<DataField> = { type: t };
              if ((t === 'object' || t === 'array') && !f.children) patch.children = [];
              if (t === 'array') patch.sampleCount = f.sampleCount ?? 3;
              if (t === 'image' && !f.sample) patch.sample = 'https://picsum.photos/200';
              updateField(f.id, patch);
            }}>
            {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button className="df-remove" onClick={() => removeField(f.id)} title="Удалить">×</button>
        </div>

        {!isContainer && (
          <div className="df-row df-row-2">
            <span className="df-path" title={ownPath}>{ownPath}</span>
            <input className="df-sample" value={f.sample}
              onChange={(e) => updateField(f.id, { sample: e.target.value })} placeholder="Пример" />
          </div>
        )}

        {isArray && (
          <div className="df-row df-row-2">
            <span className="df-path" title={ownPath}>{ownPath} · элементов:</span>
            <input className="df-sample" type="number" min="1" max="20"
              value={f.sampleCount ?? 3}
              onChange={(e) => updateField(f.id, { sampleCount: Math.max(1, +e.target.value || 1) })} />
          </div>
        )}

        {isLeaf && (
          <div className="df-chip" draggable
            onDragStart={(e) => onDragStart(e, {
              kind: 'field', path: ownPath, fieldType: f.type, sample: f.sample,
            })} title="Перетащите на холст или в текст">
            ⠿ {f.name} <span className="df-chip-type">{f.type}</span>
          </div>
        )}

        {isArray && (
          <div className="df-chip df-chip-array" draggable
            onDragStart={(e) => onDragStart(e, {
              kind: 'array', path: ownPath, arrayName: f.name, fieldType: 'array', sample: '',
              sampleCount: f.sampleCount ?? 3,
              arrayChildren: (f.children || []).map((c) => ({
                name: c.name, type: c.type, sample: c.sample,
              })),
            })} title="Перетащите на холст — создастся таблица">
            ⠿ {ownPath} <span className="df-chip-type">→ таблица ({f.sampleCount ?? 3})</span>
          </div>
        )}

        {isContainer && isExp && (
          <div className="df-children">
            {f.children?.map((child) => renderField(child, ownPath, depth + 1))}
            <button className="df-add" onClick={() => addChild(f.id)}>
              + {isArray ? 'атрибут массива' : 'поле'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="data-panel-inline">
      <div className="panel-header">
        <span className="panel-title">📦 Данные</span>
        <div className="panel-actions">
          <button className="icon-btn" onClick={loadExample} title="Загрузить пример">📋</button>
          <button className="icon-btn" onClick={importData} title="Импорт из JSON">📥</button>
          <button className="icon-btn" onClick={exportData} title="Экспорт в JSON">📤</button>
        </div>
      </div>

      <div className="panel-body">
        <button className="btn-primary-sm" onClick={addRoot}>+ Новый объект</button>

        {data.length === 0 && (
          <div className="empty-hint">
            <p>Начните с кнопки <b>📋 Пример</b> — загрузится театральный билет.</p>
            <p>Перетащите поле на холст или в текст. Массив → таблица.</p>
          </div>
        )}

        {data.map((root) => {
          const isExp = expanded[root.id] !== false;
          return (
            <div key={root.id} className="df-root">
              <div className="df-root-row">
                <button className="df-toggle" onClick={() => toggle(root.id)}>{isExp ? '▾' : '▸'}</button>
                <input className="df-root-name" value={root.name}
                  onChange={(e) => updateRootName(root.id, e.target.value)} />
                <button className="df-remove" onClick={() => removeRoot(root.id)}>×</button>
              </div>
              {isExp && (
                <div className="df-root-body">
                  {root.fields.map((f) => renderField(f, root.name, 0))}
                  <button className="df-add" onClick={() => addRootField(root.id)}>
                    + поле в {root.name}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};