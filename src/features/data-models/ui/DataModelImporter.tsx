import React, { useState } from 'react';
import { jsonDataModelIO } from '../api/FileDataModelIO';
import type { ImportedModel } from '../api/DataModelRepository';

interface Props {
  onImport: (models: ImportedModel[]) => Promise<void>;
}

/**
 * Inline-панель импорта: file-picker + textarea + drag-drop.
 * Ошибки — inline, без alert.
 */
export const DataModelImporter: React.FC<Props> = ({ onImport }) => {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ImportedModel[] | null>(null);
  const [issues, setIssues] = useState<{ index: number; message: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const parse = (raw: string): void => {
    setIssues([]);
    setPreview(null);
    const res = jsonDataModelIO.fromText(raw);
    if (res.ok) setPreview(res.models);
    else setIssues(res.issues);
  };

  const handleFile = async (file: File): Promise<void> => {
    setBusy(true);
    try {
      const res = await jsonDataModelIO.fromFile(file);
      if (res.ok) setPreview(res.models);
      else setIssues(res.issues);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (): Promise<void> => {
    if (!preview) return;
    setBusy(true);
    try {
      await onImport(preview);
      setPreview(null);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 12, background: '#f8fafc', border: '1px dashed #cbd5e1',
                  borderRadius: 6, margin: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          style={{ fontSize: 12 }}
        />
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); parse(e.target.value); }}
        placeholder='Или вставьте JSON: {"items": [{"name": "...", "values": {...}}]}'
        style={{ width: '100%', minHeight: 80, fontFamily: 'monospace', fontSize: 11,
                 padding: 6, border: '1px solid #cbd5e1', borderRadius: 4 }}
      />
      {issues.length > 0 && (
        <div style={{ marginTop: 8, padding: 8, background: '#fef2f2',
                      border: '1px solid #fecaca', borderRadius: 4, fontSize: 11, color: '#991b1b' }}>
          {issues.slice(0, 5).map((i, k) => (
            <div key={k}>#{i.index}: {i.message}</div>
          ))}
        </div>
      )}
      {preview && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: '#16a34a', marginBottom: 6 }}>
            ✓ Найдено {preview.length} моделей
          </div>
          <button
            onClick={() => void apply()}
            disabled={busy}
            style={{ padding: '6px 12px', background: '#4f46e5', color: '#fff',
                     border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
          >
            {busy ? 'Импорт…' : 'Импортировать'}
          </button>
          <button
            onClick={() => { setPreview(null); setText(''); }}
            style={{ marginLeft: 8, padding: '6px 12px', background: 'transparent',
                     border: '1px solid #cbd5e1', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
          >
            Отмена
          </button>
        </div>
      )}
    </div>
  );
};