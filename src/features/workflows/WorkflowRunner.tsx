import { useLanguageDraft } from '../journeys/ui/useLanguageDraft';
import { t } from '@/shared/i18n';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { workflowApi, type PublicWorkflow } from './api';
import { JourneyButton } from '../journeys/ui/JourneyButton';
import '../journeys/journeys.css';
import './workflows.css';
import { LanguageSwitcher } from '@/shared/i18n/LanguageSwitcher';
import { localizeInvalidField, clearFieldValidation } from '../journeys/ui/formValidation';

export default function WorkflowRunner({
  slugOverride,
  embedded = false,
}: {
  slugOverride?: string;
  embedded?: boolean;
}) {
  const params = useParams();
  const slug = slugOverride ?? params.slug ?? '';
  const previousSlug = useRef(slug);
  const [workflow, setWorkflow] = useState<PublicWorkflow | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [values, setValues] = useLanguageDraft<Record<string, string | boolean>>(
    `runner:${slug}:values`,
    {},
  );
  const [busy, setBusy] = useState(false);
  const [download, setDownload] = useState('');
  useEffect(() => {
    let active = true;
    setWorkflow(null);
    setError('');
    setStep(0);
    if (previousSlug.current !== slug) {
      setValues({});
      setDownload('');
      previousSlug.current = slug;
    }

    void workflowApi
      .get(slug)
      .then((w) => {
        if (active) setWorkflow(w);
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      });
    return () => {
      active = false;
    };
  }, [slug, setValues]);
  useEffect(() => {
    if (workflow) {
      window.document.title = `${workflow.definition.title} | CoDoc`;
      window.document
        .querySelector('meta[name="description"]')
        ?.setAttribute('content', workflow.definition.description);
    }
  }, [workflow]);
  useEffect(
    () => () => {
      if (download) URL.revokeObjectURL(download);
    },
    [download],
  );
  const definition = workflow?.definition;
  return (
    <main
      className="workflow-page"
      onInvalidCapture={localizeInvalidField}
      onInputCapture={clearFieldValidation}
    >
      {!embedded && <LanguageSwitcher />}
      {!embedded && (
        <Link to="/" className="workflow-brand">
          CoDoc
        </Link>
      )}
      {error && <p role="alert">{error}</p>}
      {!definition ? (
        <p role="status">{t('Загружаем сценарий…')}</p>
      ) : (
        <>
          <h1>{definition.title}</h1>
          <p>{definition.description}</p>
          {download ? (
            <section className="workflow-panel">
              <h2>{t('Документ готов')}</h2>
              <p>{definition.completionMessage}</p>
              <a
                className="journey-button journey-button--primary"
                href={download}
                download="document.pdf"
              >
                {t('Скачать PDF')}
              </a>
              <JourneyButton
                onClick={() => {
                  setDownload('');
                  setStep(0);
                }}
              >
                {t('Создать ещё')}
              </JourneyButton>
            </section>
          ) : (
            <form
              className="workflow-panel"
              onSubmit={async (e) => {
                e.preventDefault();
                if (step < definition.steps.length - 1) {
                  setStep(step + 1);
                  return;
                }
                setBusy(true);
                setError('');
                try {
                  setDownload(
                    URL.createObjectURL(await workflowApi.pdf(slug, workflow!.revision, values)),
                  );
                } catch (reason) {
                  setError((reason as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p>
                {t('Шаг')}
                {step + 1} {t('из')}
                {definition.steps.length}
              </p>
              <h2>{definition.steps[step].title}</h2>
              {definition.steps[step].fields.map((field) => (
                <label key={field.path}>
                  {field.label}
                  {field.required ? ' *' : ''}
                  {field.type === 'boolean' ? (
                    <input
                      type="checkbox"
                      required={field.required}
                      checked={values[field.path] === true}
                      onChange={(e) => setValues({ ...values, [field.path]: e.target.checked })}
                    />
                  ) : field.type === 'textarea' ? (
                    <textarea
                      maxLength={4000}
                      required={field.required}
                      value={String(values[field.path] ?? '')}
                      onChange={(e) => setValues({ ...values, [field.path]: e.target.value })}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={String(values[field.path] ?? '')}
                      onChange={(e) => setValues({ ...values, [field.path]: e.target.value })}
                    >
                      <option value="">{t('Выберите')}</option>
                      {field.options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={
                        field.type === 'number'
                          ? 'number'
                          : field.type === 'email'
                            ? 'email'
                            : field.type === 'date'
                              ? 'date'
                              : 'text'
                      }
                      step={field.type === 'number' ? 'any' : undefined}
                      maxLength={4000}
                      required={field.required}
                      value={String(values[field.path] ?? '')}
                      onChange={(e) => setValues({ ...values, [field.path]: e.target.value })}
                    />
                  )}
                </label>
              ))}
              <div className="workflow-actions">
                {step > 0 && (
                  <JourneyButton disabled={busy} onClick={() => setStep(step - 1)}>
                    {t('Назад')}
                  </JourneyButton>
                )}
                <JourneyButton type="submit" variant="primary" disabled={busy}>
                  {busy
                    ? t('Готовим PDF…')
                    : step === definition.steps.length - 1
                      ? t('Получить PDF')
                      : t('Продолжить')}
                </JourneyButton>
              </div>
            </form>
          )}
        </>
      )}
    </main>
  );
}
