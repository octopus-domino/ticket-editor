import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { httpTemplateRepository } from '@/features/templates/api/HttpTemplateRepository';
import type { TemplateSummary } from '@/features/templates/domain/Template';
import { schemaStore } from '../state/SchemaStore';
import { ConfirmDialog } from '@/presentation/components/dialog';
import { httpDataModelRepository } from '@/features/data-models/api/HttpDataModelRepository';
import { modelStore } from '@/features/data-models/state/ModelStore';
import type { DataModel } from '@/features/data-models/domain/DataModel';

export function SchemaDeletionPanel({
  schemaId,
  name,
  onClose,
}: {
  schemaId: string;
  name: string;
  onClose(): void;
}) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [models, setModels] = useState<DataModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<{
    id: string;
    name: string;
    kind: 'template' | 'model';
  } | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([
      httpTemplateRepository.list(schemaId),
      httpDataModelRepository.list(schemaId),
    ])
      .then(([items, data]) => {
        if (active) {
          setTemplates(items);
          setModels(data);
        }
      })
      .catch(() => {
        if (active) setError(t('Could not load schema dependencies. Please try again.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [schemaId]);
  async function removeSchema() {
    setBusy(true);
    setError('');
    try {
      await schemaStore.delete(schemaId);
      onClose();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="schema-delete-panel" aria-label={t('Delete schema {0}?', name)}>
      <strong>{t('Delete schema {0}?', name)}</strong>
      <p>
        {t(
          'Delete the linked data sets and templates first. Open a template to change its data schema, or delete it here.',
        )}
      </p>
      {loading && <p role="status">{t('Loading…')}</p>}
      {templates.map((template) => (
        <div key={template.id} className="schema-dependency">
          <Link to={`/app/templates/${encodeURIComponent(template.id)}/edit`}>{template.name}</Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeleting({ ...template, kind: 'template' })}
          >
            {t('Delete')}
          </button>
        </div>
      ))}
      {models.map((model) => (
        <div className="schema-dependency" key={model.id}>
          <button
            type="button"
            onClick={() => {
              modelStore.select(model.id);
              onClose();
            }}
          >
            {model.name}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeleting({ ...model, kind: 'model' })}
          >
            {t('Delete')}
          </button>
        </div>
      ))}
      <Link to={`/app/data?schemaId=${encodeURIComponent(schemaId)}`} onClick={onClose}>
        {t('Data sets')}
      </Link>
      {error && <p role="alert">{error}</p>}
      <div className="image-template-actions">
        <button
          type="button"
          disabled={loading || busy || templates.length > 0 || models.length > 0}
          onClick={() => void removeSchema()}
        >
          {t('Delete')}
        </button>
        <button type="button" disabled={busy} onClick={onClose}>
          {t('Cancel')}
        </button>
      </div>
      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title={
          deleting?.kind === 'model'
            ? t('Delete data set {0}?', deleting.name)
            : t('Delete template {0}?', deleting?.name ?? '')
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const target = deleting;
          setDeleting(null);
          setBusy(true);
          void (
            target.kind === 'model'
              ? modelStore.remove(target.id)
              : httpTemplateRepository.delete(target.id)
          )
            .then(() => {
              setTemplates((items) => items.filter((item) => item.id !== target.id));
              setModels((items) => items.filter((item) => item.id !== target.id));
            })
            .catch((reason: Error) => setError(reason.message))
            .finally(() => setBusy(false));
        }}
      />
    </section>
  );
}
