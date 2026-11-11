import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { SchemaEditorPage } from '@/features/schemas/ui/SchemaEditorPage';
import { ModelsPage } from './ModelsPage';
import { SchemaDeletionPanel } from '@/features/schemas/ui/SchemaDeletionPanel';
import { t } from '@/shared/i18n';
import './data-workspace.css';

export function DataWorkspacePage() {
  const { schemas, activeSchema, selectSchema, error } = useSchemas();
  const { schemaId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [editing, setEditing] = useState<string | null>(() =>
    location.pathname.endsWith('/new') ? 'new' : (schemaId ?? null),
  );
  const [remove, setRemove] = useState(false);

  useEffect(() => {
    if (schemaId && schemaStore.getState().activeId !== schemaId) schemaStore.setActive(schemaId);
  }, [schemaId]);
  function choose(id: string) {
    selectSchema(id);
    setEditing(null);
    setRemove(false);
  }
  return (
    <div className="data-workspace">
      <aside className="data-schema-list">
        <h1>{t('Data')}</h1>
        <p>{t('Select a schema to edit its fields and data sets here.')}</p>
        <button type="button" className="dp-btn" onClick={() => setEditing('new')}>
          {t('Create data schema')}
        </button>
        {schemas.map((schema) => (
          <div className="data-schema-row" key={schema.id}>
            <button
              type="button"
              key={schema.id}
              aria-pressed={activeSchema?.id === schema.id}
              onClick={() => choose(schema.id)}
            >
              {schema.name}
              <small>
                {schema.fields.length} · {t('Fields')}
              </small>
            </button>
            <button
              type="button"
              title={t('Delete schema {0}?', schema.name)}
              aria-label={t('Delete schema {0}?', schema.name)}
              onClick={() => {
                choose(schema.id);
                setRemove(true);
              }}
            >
              ⋯
            </button>
          </div>
        ))}
        {activeSchema && (
          <>
            <button type="button" className="dp-btn" onClick={() => setEditing(activeSchema.id)}>
              {t('Edit schema')}
            </button>
          </>
        )}
        {remove && activeSchema && (
          <SchemaDeletionPanel
            key={activeSchema.id}
            schemaId={activeSchema.id}
            name={activeSchema.name}
            onClose={() => setRemove(false)}
          />
        )}
        {error && <p role="alert">{error}</p>}
      </aside>
      <section className="data-workspace-content">
        {editing && (
          <div className="data-schema-editor">
            <SchemaEditorPage
              key={editing}
              schemaIdOverride={editing === 'new' ? null : editing}
              onSaved={(id) => {
                setEditing(null);
                const next = new URLSearchParams(params);
                next.set('schemaId', id);
                navigate(`/app/data?${next}`, { replace: true });
              }}
              onClose={() => setEditing(null)}
            />
          </div>
        )}
        <div className="data-workspace-models">
          <ModelsPage />
        </div>
      </section>
    </div>
  );
}
