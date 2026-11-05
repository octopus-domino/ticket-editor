import { useEffect, useState } from 'react';
import { authFetch } from '@/shared/api/client';
import { t } from '@/shared/i18n';
import '../templates/ui/template-journey.css';

interface ClientKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string;
  revoked: boolean;
  monthlyRequests: number;
}
interface State {
  enabled: boolean;
  baseUrl: string;
  keys: ClientKey[];
}
export function ApiAccessPage() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [days, setDays] = useState(30);
  const [scopes, setScopes] = useState(['read', 'generate']);
  const [token, setToken] = useState('');
  const [notice, setNotice] = useState('');
  async function load() {
    const response = await authFetch('/api/client-keys');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setState((await response.json()) as State);
  }
  useEffect(() => {
    void load().catch((reason: Error) => setError(reason.message));
  }, []);
  async function issue() {
    setBusy(true);
    setError('');
    setToken('');
    setNotice('');
    try {
      const response = await authFetch('/api/client-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, days, scopes }),
      });
      const result = (await response.json()) as { token?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      setToken(result.token!);
      setName('');
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    setBusy(true);
    setError('');
    try {
      const response = await authFetch(`/api/client-keys/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as { gatewaySynchronized: boolean };
      setToken('');
      setNotice(
        t(
          result.gatewaySynchronized
            ? 'API key revoked.'
            : 'The key is blocked by the application. Gateway cleanup will need another attempt.',
        ),
      );
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="template-new">
      <h1>{t('Client API')}</h1>
      <p>
        {t(
          'Create separate keys for 1C, CRM and other client applications. Keys only access your own data.',
        )}
      </p>
      <p>
        {t(
          'Limits per key: 60 requests per minute and 10,000 per month. Generation limits also apply.',
        )}
      </p>
      {state && !state.enabled && (
        <p role="status">
          {t('The administrator must configure the local Tyk gateway before issuing client keys.')}
        </p>
      )}
      <form
        className="template-form"
        onSubmit={(event) => {
          event.preventDefault();
          void issue();
        }}
      >
        <label>
          {t('Key name')}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
            disabled={busy}
          />
        </label>
        <label>
          {t('Validity in days')}
          <input
            type="number"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            min={1}
            max={365}
            required
            disabled={busy}
          />
        </label>
        <fieldset>
          <legend>{t('Permissions')}</legend>
          {(['read', 'generate', 'data:write'] as const).map((scope) => (
            <label key={scope} style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ width: 'auto' }}
                type="checkbox"
                checked={scopes.includes(scope)}
                disabled={busy}
                onChange={(event) =>
                  setScopes((list) =>
                    event.target.checked
                      ? [...list, scope]
                      : list.filter((value) => value !== scope),
                  )
                }
              />
              {t(
                scope === 'read'
                  ? 'Read data'
                  : scope === 'generate'
                    ? 'Generate documents'
                    : 'Modify data and templates',
              )}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={busy || !state?.enabled || !scopes.length || !name.trim()}>
          {t('Issue API key')}
        </button>
      </form>
      {token && (
        <section role="status" className="template-help">
          <strong>{t('Copy this key now. It will not be shown again.')}</strong>
          <input
            aria-label={t('New API key')}
            value={token}
            readOnly
            autoComplete="off"
            spellCheck={false}
            style={{ width: '100%', fontFamily: 'monospace' }}
          />
          <button
            type="button"
            onClick={() =>
              void (
                navigator.clipboard ? navigator.clipboard.writeText(token) : Promise.reject()
              ).catch(() => setError(t('Copy the key manually.')))
            }
          >
            {t('Copy')}
          </button>
          <button type="button" onClick={() => setToken('')}>
            {t('Hide key')}
          </button>
        </section>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <h2>{t('API keys')}</h2>
      {state?.keys.map((key) => (
        <article key={key.id} className="template-help">
          <strong>{key.name}</strong>
          <p>
            <code>{key.prefix}…</code> · {key.scopes.join(', ')}
          </p>
          <p>
            {t('Requests this month')}: {key.monthlyRequests} · {t('Expires')}:{' '}
            {new Date(key.expiresAt).toLocaleDateString()}
          </p>
          <button type="button" disabled={busy} onClick={() => void revoke(key.id)}>
            {t(key.revoked ? 'Retry gateway cleanup' : 'Revoke key')}
          </button>
          {key.revoked && <span> · {t('Revoked')}</span>}
        </article>
      ))}
      <h2>{t('API example')}</h2>
      <p>{t('Send X-API-Key over HTTPS. Never put the key in the URL or frontend code.')}</p>
      <pre
        style={{ overflow: 'auto', padding: 16, background: 'var(--panel-alt)' }}
      >{`curl '${state?.baseUrl ?? '/client-api'}/templates' -H 'X-API-Key: YOUR_CLIENT_KEY'`}</pre>
      <a href="/client-api.openapi.json" download>
        {t('Download OpenAPI specification')}
      </a>
    </main>
  );
}
