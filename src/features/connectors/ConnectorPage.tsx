import { useEffect, useMemo, useState } from 'react';
import { authFetch } from '@/shared/api/client';
import { t } from '@/shared/i18n';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { flattenFields } from '@/features/schemas/domain/SchemaInference';
import { validateModel, setPath } from '@/features/data-models/domain/DataModelValidator';
import { sourceValue, convertSourceValue, sourceColumns } from './mapping';
import '../templates/ui/template-journey.css';

interface Source {
  id: string;
  name: string;
  provider: string;
  origin: string;
  schemaId: string | null;
  keyPath: string | null;
  namePath: string | null;
  mapping: Record<string, string>;
  autoSyncMinutes: number;
  lastStatus: string | null;
  lastSyncAt: string | null;
}
interface Preview {
  token: string;
  rows: Record<string, unknown>[];
  truncated: boolean;
}
async function json<T>(path: string, body?: unknown, method = body ? 'POST' : 'GET'): Promise<T> {
  const response = await authFetch(path, {
    method,
    ...(body
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {}),
    signal: AbortSignal.timeout(150000),
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }
  return response.status === 204 || method === 'DELETE'
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
export function ConnectorPage() {
  const { schemas, activeSchema } = useSchemas();
  const [sources, setSources] = useState<Source[]>([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('one-c-odata');
  const [url, setUrl] = useState('');
  const [auth, setAuth] = useState('basic');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [schemaId, setSchemaId] = useState('');
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [keyPath, setKeyPath] = useState('');
  const [namePath, setNamePath] = useState('');
  const [interval, setInterval] = useState(0);
  const [rowIndex, setRowIndex] = useState(0);
  const [overrides, setOverrides] = useState<Record<number, Record<string, unknown>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const schema = schemas.find((s) => s.id === (schemaId || activeSchema?.id));
  const fields = useMemo(
    () => (schema ? flattenFields(schema.fields).filter((f) => f.type !== 'object') : []),
    [schema],
  );
  const columns = useMemo(() => (preview ? sourceColumns(preview.rows) : []), [preview]);
  const issues = useMemo(() => {
    if (!schema || !preview) return [];
    const result: { index: number; message: string }[] = [];
    const ids = new Set<string>();
    preview.rows.forEach((row, index) => {
      const id = String(sourceValue(row, keyPath) ?? '');
      if (!id || ids.has(id))
        result.push({ index, message: t('Choose a unique external ID for every row.') });
      ids.add(id);
      const values: Record<string, unknown> = {};
      for (const field of fields) {
        const raw = overrides[index]?.[field.path] ?? sourceValue(row, mapping[field.path]);
        setPath(values, field.path, convertSourceValue(raw, field.type));
      }
      result.push(
        ...validateModel({ values }, schema).map((issue) => ({
          index,
          message: `${issue.path}: ${issue.message}`,
        })),
      );
    });
    return result;
  }, [schema, preview, keyPath, mapping, overrides, fields]);
  const load = async () => setSources(await json<Source[]>('/api/connectors'));
  useEffect(() => {
    void json<Source[]>('/api/connectors')
      .then(setSources)
      .catch((reason: Error) => setError(reason.message));
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setPreview(null);
    setOverrides({});
    setNotice('');
    setError('');
    setRowIndex(0);
  }
  async function create() {
    await run(async () => {
      const source = await json<Source>('/api/connectors', {
        name,
        provider,
        url,
        auth,
        username,
        password,
      });
      setPassword('');
      setUrl('');
      setUsername('');
      setName('');
      setSelected(source.id);
      reset();
      await load();
    });
  }
  async function fetchRows() {
    await run(async () => {
      reset();
      const source = sources.find((s) => s.id === selected)!;
      const result = await json<Preview>(`/api/connectors/${selected}/preview`, {});
      const columns = sourceColumns(result.rows);
      setPreview(result);
      setSchemaId(source.schemaId ?? activeSchema?.id ?? '');
      setMapping(source.mapping ?? {});
      setKeyPath(
        source.keyPath ?? columns.find((c) => ['Ref_Key', 'id', 'ID', 'uuid'].includes(c)) ?? '',
      );
      setNamePath(source.namePath ?? '');
      setInterval(source.autoSyncMinutes || 0);
    });
  }
  async function apply() {
    if (!preview || !schema) return;
    await run(async () => {
      const result = await json<{ created: number; updated: number }>(
        `/api/connectors/${selected}/import`,
        {
          token: preview.token,
          schemaId: schema.id,
          keyPath,
          namePath,
          mapping: Object.fromEntries(Object.entries(mapping).filter(([, value]) => value)),
          overrides,
          autoSyncMinutes: interval,
        },
      );
      setNotice(`${t('Created')}: ${result.created}. ${t('Updated')}: ${result.updated}.`);
      setPreview(null);
      await load();
    });
  }
  return (
    <main className="template-new">
      <h1>{t('Data connections')}</h1>
      <p>
        {t(
          'Connect 1C, Bitrix24 or amoCRM, map fields and review rows before importing. Repeated imports update records by external ID.',
        )}
      </p>
      <p>
        {t(
          'The administrator must allow the exact source origin. Credentials stay on the server and are never returned to the browser.',
        )}
      </p>
      <details>
        <summary>{t('Add connection')}</summary>
        <form
          className="template-form"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <label>
            {t('Name')}
            <input
              value={name}
              required
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            {t('Source type')}
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              disabled={busy}
            >
              <option value="one-c-odata">1С · OData</option>
              <option value="one-c-http">1С · HTTP JSON</option>
              <option value="bitrix24">Bitrix24</option>
              <option value="amocrm">amoCRM</option>
              <option value="json">HTTP JSON</option>
            </select>
          </label>
          <label>
            URL
            <input
              type="url"
              value={url}
              required
              maxLength={4000}
              autoComplete="off"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://company.example/base/odata/standard.odata/Catalog_...?$format=json"
              disabled={busy}
            />
          </label>
          <label>
            {t('Authentication')}
            <select value={auth} onChange={(event) => setAuth(event.target.value)} disabled={busy}>
              <option value="none">{t('No additional authentication')}</option>
              <option value="basic">HTTP Basic</option>
              <option value="bearer">Bearer</option>
            </select>
          </label>
          {auth === 'basic' && (
            <label>
              {t('Login')}
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="off"
                disabled={busy}
              />
            </label>
          )}
          {auth !== 'none' && (
            <label>
              {t('Password or token')}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
                disabled={busy}
              />
            </label>
          )}
          <button type="submit" disabled={busy}>
            {t('Save connection')}
          </button>
        </form>
      </details>
      <section className="template-form">
        <label>
          {t('Connection')}
          <select
            value={selected}
            disabled={busy}
            onChange={(event) => {
              setSelected(event.target.value);
              reset();
            }}
          >
            <option value="">—</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name} · {source.provider} · {source.lastStatus ?? '—'}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={busy || !selected} onClick={() => void fetchRows()}>
          {t('Load source preview')}
        </button>
        <button
          type="button"
          disabled={busy || !selected}
          onClick={() =>
            void run(async () => {
              await json(`/api/connectors/${selected}`, undefined, 'DELETE');
              setSelected('');
              reset();
              await load();
            })
          }
        >
          {t('Remove connection')}
        </button>
      </section>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {preview && (
        <section className="template-form">
          <p>
            {t('Rows')}: {preview.rows.length}
          </p>
          {preview.truncated && (
            <p role="alert">
              {t(
                'The source has more pages. This preview covers only the returned page; automatic sync is disabled.',
              )}
            </p>
          )}
          <label>
            {t('Data schema')}
            <select
              value={schema?.id ?? ''}
              onChange={(event) => {
                setSchemaId(event.target.value);
                setMapping({});
                setOverrides({});
              }}
              disabled={busy}
            >
              <option value="">—</option>
              {schemas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('External ID column')}
            <select
              value={keyPath}
              onChange={(event) => setKeyPath(event.target.value)}
              disabled={busy}
            >
              <option value="">—</option>
              {columns.map((column) => (
                <option key={column}>{column}</option>
              ))}
            </select>
          </label>
          <label>
            {t('Record name column')}
            <select
              value={namePath}
              onChange={(event) => setNamePath(event.target.value)}
              disabled={busy}
            >
              <option value="">—</option>
              {columns.map((column) => (
                <option key={column}>{column}</option>
              ))}
            </select>
          </label>
          <h2>{t('Field mapping')}</h2>
          {fields.map((field) => (
            <label key={field.path}>
              {field.label || field.path}
              {field.required ? ' *' : ''}
              <select
                value={mapping[field.path] ?? ''}
                onChange={(event) =>
                  setMapping((previous) => ({ ...previous, [field.path]: event.target.value }))
                }
                disabled={busy}
              >
                <option value="">—</option>
                {columns.map((column) => (
                  <option key={column}>{column}</option>
                ))}
              </select>
            </label>
          ))}
          <h2>{t('Review and correct a row')}</h2>
          <label>
            {t('Row number')}
            <input
              type="number"
              value={rowIndex + 1}
              min={1}
              max={preview.rows.length}
              onChange={(event) =>
                setRowIndex(
                  Math.min(preview.rows.length - 1, Math.max(0, Number(event.target.value) - 1)),
                )
              }
              disabled={busy}
            />
          </label>
          {fields
            .filter((field) => mapping[field.path])
            .map((field) => {
              const value =
                overrides[rowIndex]?.[field.path] ??
                sourceValue(preview.rows[rowIndex], mapping[field.path]);
              return (
                <label key={field.path}>
                  {field.label || field.path}
                  <input
                    value={typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}
                    onChange={(event) =>
                      setOverrides((previous) => ({
                        ...previous,
                        [rowIndex]: {
                          ...previous[rowIndex],
                          [field.path]: convertSourceValue(event.target.value, field.type),
                        },
                      }))
                    }
                    disabled={busy}
                  />
                </label>
              );
            })}
          {issues.length > 0 && (
            <div role="alert">
              {issues.slice(0, 10).map((issue, index) => (
                <p key={index}>
                  #{issue.index + 1}: {issue.message}
                </p>
              ))}
            </div>
          )}
          <label>
            {t('Automatic refresh')}
            <select
              value={interval}
              onChange={(event) => setInterval(Number(event.target.value))}
              disabled={busy || preview.truncated}
            >
              <option value={0}>{t('Off')}</option>
              <option value={15}>15 min</option>
              <option value={60}>60 min</option>
              <option value={1440}>24 h</option>
            </select>
          </label>
          <p>
            {t(
              'Automatic refresh repeats the saved mapping and updates known external IDs. Missing source records are not deleted.',
            )}
          </p>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={
              busy ||
              !schema ||
              !keyPath ||
              !Object.values(mapping).some(Boolean) ||
              issues.length > 0
            }
          >
            {t('Import and update records')}
          </button>
        </section>
      )}
    </main>
  );
}
