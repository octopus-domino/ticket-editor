import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSchemas } from '@/features/schemas/state/useSchemas';
import { schemaStore } from '@/features/schemas/state/SchemaStore';
import { SchemaEditorPage } from '@/features/schemas/ui/SchemaEditorPage';
import { ModelsPage } from './ModelsPage';
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
  const [failure, setFailure] = useState('');
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
          <button
            type="button"
            key={schema.id}
            aria-pressed={activeSchema?.id === schema.id}
            onClick={() => choose(schema.id)}
          >
            {schema.name}
            <small>
              {schema.fields.length} В· {t('Fields')}
            </small>
          </button>
        ))}
        {activeSchema && (
          <>
            <button type="button" className="dp-btn" onClick={() => setEditing(activeSchema.id)}>
              {t('Edit schema')}
            </button>
            <button type="button" className="dp-btn" onClick={() => setRemove(true)}>
              {t('Delete')}
            </button>
          </>
        )}
        {remove && activeSchema && (
          <div role="alert">
            <p>{t('Delete schema {0}?', activeSchema.name)}</p>
            <button
              type="button"
              onClick={() =>
                void schemaStore
                  .delete(activeSchema.id)
                  .then(() => {
                    setRemove(false);
                    setEditing(null);
                  })
                  .catch((e: Error) => setFailure(e.message))
              }
            >
              {t('Delete')}
            </button>
            <button type="button" onClick={() => setRemove(false)}>
              {t('Cancel')}
            </button>
          </div>
        )}
        {(failure || error) && <p role="alert">{failure || error}</p>}
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
