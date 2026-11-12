import { t as __tr } from '@/shared/i18n';
import React, { useRef, useState } from 'react';
import { modelIO, type ImportedModel } from '../api/ModelIO';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { t } from '@/shared/i18n';
import { productGoal } from '@/shared/analytics/ProductMetrics';
import { ModelValuesEditor } from './ModelValuesEditor';
import { validateModel } from '../domain/DataModelValidator';

export const JsonImporterPanel: React.FC<{
  schemaId?: string;
  onImport: (models: ImportedModel[]) => Promise<void>;
}> = ({ onImport, schemaId }) => {
  const { schemas } = useSchemas();
  const [schemaWarning, setSchemaWarning] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ImportedModel[] | null>(null);
  const [issues, setIssues] = useState<{ index: number; message: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const parseVersion = useRef(0);
  const [rowIndex, setRowIndex] = useState(0);
  const schema = schemas.find((item) => item.id === schemaId);
  const validation =
    preview && schema
      ? preview.flatMap((model, index) =>
          validateModel(model, schema).map((issue) => ({
            index,
            message: `${issue.path}: ${issue.message}`,
          })),
        )
      : [];

  const parse = async (file?: File, nextText = text): Promise<void> => {
    const version = ++parseVersion.current;
    setIssues([]);
    setPreview(null);
    setRowIndex(0);
    const res = file
      ? await (async () => {
          if (/\.xlsx$/i.test(file.name)) {
            const schema = schemas.find((item) => item.id === schemaId);
            if (!schema) throw new Error(t('Choose a data schema first'));
            if (file.size > 20 * 1024 * 1024) throw new Error(t('Import exceeds 20 MB'));
            const { readWorkbook } = await import('../api/ExcelModelIO');
            return readWorkbook(new Uint8Array(await file.arrayBuffer()), schema);
          }
          return modelIO.fromFile(file);
        })().catch((error: Error) => ({
          ok: false,
          schemaId: undefined,
          models: undefined,
          issues: [{ index: 0, message: error.message }],
        }))
      : modelIO.parse(nextText);
    if (version !== parseVersion.current) return;
    if (file && /\.xlsx$/i.test(file.name))
      productGoal(res.ok ? 'excel_import_validated' : 'excel_import_failed', {
        count: res.models?.length ?? 0,
        errors: res.issues?.length ?? 0,
      });
    setSchemaWarning(
      res.schemaId && schemaId && res.schemaId !== schemaId
        ? __tr('Файл использует схему {0}. Импортировать в выбранную схему?', res.schemaId)
        : null,
    );
    if ((res.ok || ('repairable' in res && res.repairable)) && res.models) setPreview(res.models);
    if (res.issues) setIssues('repairable' in res && res.repairable ? [] : [...res.issues]);
  };

  const apply = async (): Promise<void> => {
    if (!preview) return;
    setBusy(true);
    try {
      if (validation.length) throw new Error(validation[0].message);
      await onImport(preview);
      setPreview(null);
      setText('');
    } catch (error) {
      setIssues([{ index: 0, message: (error as Error).message }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`dm-importer ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) void parse(f);
      }}
    >
      <div className="dm-importer-drop">
        {dragOver ? t('Drop the file here') : t('Drop an Excel (.xlsx) or JSON file here')}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.xlsx,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void parse(f);
        }}
      />
      <textarea
        className="mv-json"
        placeholder='{"items":[{"name":"...","values":{...}}]}'
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          void parse(undefined, e.target.value);
        }}
      />
      {issues.length > 0 && (
        <div className="schema-error">
          {issues.slice(0, 5).map((i, k) => (
            <div key={k}>
              #{i.index}: {i.message}
            </div>
          ))}
        </div>
      )}
      {preview && (
        <div>
          {schemaWarning && (
            <div role="alert" className="schema-error">
              {schemaWarning}
            </div>
          )}
          <div className="schema-hint">
            {__tr('✓ Найдено наборов данных:')} {preview.length}
          </div>
          {schema && preview.length > 0 && (
            <details>
              <summary>{t('Review and correct a row')}</summary>
              <label>
                {t('Row number')}
                <input
                  type="number"
                  min={1}
                  max={preview.length}
                  value={rowIndex + 1}
                  onChange={(event) =>
                    setRowIndex(
                      Math.max(0, Math.min(preview.length - 1, Number(event.target.value) - 1)),
                    )
                  }
                />
              </label>
              <label>
                {t('Name')}
                <input
                  value={preview[rowIndex].name}
                  onChange={(event) =>
                    setPreview((old) =>
                      old!.map((model, index) =>
                        index === rowIndex ? { ...model, name: event.target.value } : model,
                      ),
                    )
                  }
                />
              </label>
              <ModelValuesEditor
                key={rowIndex}
                modelId={`import-preview-${rowIndex}`}
                schema={schema}
                values={preview[rowIndex].values}
                onChange={(values) =>
                  setPreview((old) =>
                    old!.map((model, index) => (index === rowIndex ? { ...model, values } : model)),
                  )
                }
              />
            </details>
          )}
          {validation.slice(0, 5).map((issue, index) => (
            <p role="alert" key={index}>
              #{issue.index + 1}: {issue.message}
            </p>
          ))}
          <button
            className="schema-btn-submit"
            onClick={() => void apply()}
            disabled={busy || validation.length > 0}
          >
            {busy ? __tr('Импорт…') : __tr('Импортировать')}
          </button>
          <button
            className="schema-btn-add"
            onClick={() => {
              setPreview(null);
              setText('');
            }}
          >
            {__tr('Отмена')}
          </button>
        </div>
      )}
    </div>
  );
};
