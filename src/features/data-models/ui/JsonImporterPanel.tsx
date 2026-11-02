import React, { useRef, useState } from 'react';
import { modelIO, type ImportedModel } from '../api/ModelIO';

export const JsonImporterPanel: React.FC<{
  onImport: (models: ImportedModel[]) => Promise<void>;
}> = ({ onImport }) => {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ImportedModel[] | null>(null);
  const [issues, setIssues] = useState<{ index: number; message: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parse = async (file?: File): Promise<void> => {
    setIssues([]);
    setPreview(null);
    const res = file ? await modelIO.fromFile(file) : modelIO.parse(text);
    if (res.ok && res.models) setPreview(res.models);
    if (res.issues) setIssues([...res.issues]);
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
    <div
      className={`dm-importer ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) void parse(f);
      }}
    >
      <div className="dm-importer-drop">
        {dragOver
          ? '📥 Отпустите файл'
          : 'Перетащите .json сюда или выберите файл'}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void parse(f); }}
      />
      <textarea
        className="mv-json"
        placeholder='{"items":[{"name":"...","values":{...}}]}'
        value={text}
        onChange={(e) => { setText(e.target.value); void parse(); }}
      />
      {issues.length > 0 && (
        <div className="schema-error">
          {issues.slice(0, 5).map((i, k) => <div key={k}>#{i.index}: {i.message}</div>)}
        </div>
      )}
      {preview && (
        <div>
          <div className="schema-hint">✓ {preview.length} моделей найдено</div>
          <button className="schema-btn-submit" onClick={() => void apply()} disabled={busy}>
            {busy ? 'Импорт…' : 'Импортировать'}
          </button>
          <button className="schema-btn-add" onClick={() => { setPreview(null); setText(''); }}>
            Отмена
          </button>
        </div>
      )}
    </div>
  );
};