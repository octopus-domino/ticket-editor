import { useLanguageDraft } from './useLanguageDraft';
import { t } from '@/shared/i18n';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CreatedJourney, JourneyDefinition } from '../domain/definitions';
import { journeyApi, managementUrl, pdfUrl, publicUrl, rememberKey } from '../api/journeys';
import { JourneyCard } from './JourneyCard';
import { JourneyShare } from './JourneyShare';
import { ProposalEditor } from './ProposalEditor';
import { proposalItems, proposalNumber } from '../domain/proposal';
import { JOURNEY_CAPABILITIES } from '../domain/definitions';
import { ScheduleEditor } from './ScheduleEditor';
import { lessons } from '../domain/schedule';
import { BatchRecipientsEditor } from './BatchRecipientsEditor';
import { ProposalActionBar } from './ProposalActionBar';

export function JourneyWizard({
  definition,
  custom = false,
  previewOnly = false,
}: {
  definition: JourneyDefinition;
  custom?: boolean;
  previewOnly?: boolean;
}) {
  const [step, setStep] = useLanguageDraft(`wizard:${definition.slug}:step`, 0);
  const [title, setTitle] = useLanguageDraft(
    `wizard:${definition.slug}:title`,
    definition.kind === 'PROPOSAL'
      ? t('Коммерческое предложение')
      : definition.kind === 'MENU'
        ? t('Меню')
        : definition.kind === 'CERTIFICATE'
          ? t('Сертификат участника')
          : definition.kind === 'INVITATION'
            ? t('Приглашаем вас!')
            : JOURNEY_CAPABILITIES[definition.kind].label,
  );
  const [data, setData] = useLanguageDraft<Record<string, string>>(
    `wizard:${definition.slug}:data`,
    {
      theme: definition.theme,
      ...(definition.kind === 'SCHEDULE' ? { timezone: 'Europe/Moscow', events: '[]' } : {}),
      ...(definition.kind === 'PROPOSAL' ? { currency: 'RUB', positions: '[]' } : {}),
      ...(custom ? { site: definition.slug } : {}),
    },
  );
  const [names, setNames] = useLanguageDraft(`wizard:${definition.slug}:names`, '');
  const [rows, setRows] = useLanguageDraft<Record<string, string>[]>(
    `wizard:${definition.slug}:rows`,
    [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useLanguageDraft<CreatedJourney[]>(
    `wizard:${definition.slug}:created`,
    [],
  );
  async function publish() {
    if (previewOnly) {
      setError(t('Это предпросмотр. Сначала опубликуйте сайт в конструкторе.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await journeyApi.create(
        definition.kind,
        title,
        data,
        JOURNEY_CAPABILITIES[definition.kind].batch
          ? names
              .split('\n')
              .map((value) => value.trim())
              .filter(Boolean)
          : [],
        rows,
      );
      result.forEach((value) => rememberKey(value.document.id, value.managementKey));
      setCreated(result);
      setStep(2);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className={`journey-main ${definition.kind === 'PROPOSAL' ? 'journey-main-proposal' : ''}`}
    >
      <div className="journey-intro">
        <span className="journey-eyebrow">
          {definition.kind === 'PROPOSAL'
            ? t('КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ')
            : t('МАЛЕНЬКИЕ ДЕТАЛИ. БОЛЬШИЕ СОБЫТИЯ.')}
        </span>
        <h1>{step === 2 ? t('Готово. Теперь можно поделиться.') : definition.title}</h1>
        <p>{definition.description}</p>
        <ol className="journey-steps">
          {[t('Заполнить'), t('Посмотреть'), t('Поделиться')].map((label, index) => (
            <li key={label} aria-current={index === step ? 'step' : undefined}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </div>
      {step < 2 ? (
        <div className="journey-workspace">
          <section className="journey-form-panel">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (definition.kind === 'SCHEDULE' && !lessons(data.events).length) {
                  setError(t('Добавьте хотя бы одно занятие.'));
                  return;
                }
                if (definition.kind === 'PROPOSAL') {
                  try {
                    const items = proposalItems(data.positions);
                    if (!items.length) throw new Error(t('Добавьте хотя бы одну позицию.'));
                    items.forEach((item) => {
                      proposalNumber(item.price);
                      proposalNumber(item.quantity);
                      if (!item.name.trim() || Number(item.quantity) <= 0)
                        throw new Error(t('Проверьте названия и количество позиций.'));
                    });
                  } catch (reason) {
                    setError((reason as Error).message);
                    return;
                  }
                }
                setError('');
                setStep(1);
              }}
            >
              {step === 0 ? (
                <>
                  <label>
                    {t('Название')}
                    <input
                      value={title}
                      required
                      maxLength={120}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                  </label>
                  {definition.fields.map((field) => (
                    <label key={field.name}>
                      {field.label}
                      {field.type === 'textarea' ? (
                        <textarea
                          required={
                            field.required &&
                            !(rows.length > 0 && rows.every((row) => Boolean(row[field.name])))
                          }
                          maxLength={12000}
                          value={data[field.name] ?? ''}
                          onChange={(event) =>
                            setData((value) => ({ ...value, [field.name]: event.target.value }))
                          }
                        />
                      ) : (
                        <input
                          type={field.type}
                          required={
                            field.required &&
                            !(rows.length > 0 && rows.every((row) => Boolean(row[field.name])))
                          }
                          maxLength={300}
                          value={data[field.name] ?? ''}
                          onChange={(event) =>
                            setData((value) => ({ ...value, [field.name]: event.target.value }))
                          }
                        />
                      )}
                    </label>
                  ))}
                  {JOURNEY_CAPABILITIES[definition.kind].batch && (
                    <BatchRecipientsEditor
                      names={names}
                      fields={definition.fields}
                      onChange={(names, rows) => {
                        setNames(names);
                        setRows(rows);
                      }}
                    />
                  )}
                  {definition.kind === 'SCHEDULE' && (
                    <ScheduleEditor
                      value={data.events ?? '[]'}
                      onChange={(events) => setData((value) => ({ ...value, events }))}
                    />
                  )}
                  {definition.kind === 'PROPOSAL' && (
                    <ProposalEditor
                      value={data.positions ?? '[]'}
                      currency={data.currency ?? 'RUB'}
                      onChange={(positions) => setData((value) => ({ ...value, positions }))}
                    />
                  )}
                  <fieldset className="journey-theme">
                    <legend>{t('Оформление')}</legend>
                    {(['sage', 'rose', 'ink'] as const).map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        className={`theme-dot ${theme}`}
                        aria-pressed={data.theme === theme}
                        aria-label={
                          theme === 'sage'
                            ? t('Шалфей')
                            : theme === 'rose'
                              ? t('Роза')
                              : t('Чернила')
                        }
                        onClick={() => setData((value) => ({ ...value, theme }))}
                      />
                    ))}
                  </fieldset>
                  <ProposalActionBar data={definition.kind === 'PROPOSAL' ? data : undefined}>
                    <button className="journey-primary" type="submit">
                      {t('Посмотреть результат')}
                      <span>↗</span>
                    </button>
                  </ProposalActionBar>
                </>
              ) : (
                <>
                  <h2>{t('Всё выглядит хорошо?')}</h2>
                  <p>
                    {t(
                      'Вы получите PDF для печати и постоянную ссылку. Открыть её сможет каждый, кому вы её отправите.',
                    )}
                  </p>
                  <ProposalActionBar data={definition.kind === 'PROPOSAL' ? data : undefined}>
                    <button
                      type="button"
                      className="journey-primary"
                      disabled={busy}
                      onClick={() => void publish()}
                    >
                      {busy ? t('Готовим…') : t('Получить ссылку и PDF')} <span>↗</span>
                    </button>
                    <button
                      type="button"
                      className="journey-secondary"
                      disabled={busy}
                      onClick={() => setStep(0)}
                    >
                      {t('Вернуться к редактированию')}
                    </button>
                  </ProposalActionBar>
                </>
              )}
            </form>
            {error && <p role="alert">{error}</p>}
          </section>
          <div className="journey-preview">
            <span>{t('ПРЕДПРОСМОТР')}</span>
            <JourneyCard
              compact
              document={{
                kind: definition.kind,
                title,
                data: {
                  ...data,
                  ...(names ? { recipient: names.split('\n')[0] } : {}),
                  ...rows[0],
                },
              }}
            />
            <p>{t('PDF доступен после создания.')}</p>
          </div>
        </div>
      ) : (
        <section className="journey-results">
          {created[0]?.batchId && (
            <a
              className="journey-primary"
              href={`/issues/${created[0].batchId}#key=${encodeURIComponent(created[0].managementKey)}`}
            >
              {t('Открыть реестр выпуска и скачать все документы ↗')}
            </a>
          )}
          {created.map((value) => (
            <article key={value.document.id}>
              <h2>{value.document.data.recipient ?? value.document.title}</h2>
              <JourneyShare url={publicUrl(value.document.id)} title={value.document.title} />
              <div className="journey-result-links">
                <a className="journey-primary" href={pdfUrl(value.document.id)}>
                  {t('Скачать PDF ↓')}
                </a>
                <Link to={`/d/${value.document.id}`}>{t('Открыть страницу ↗')}</Link>
                <a href={managementUrl(value.document.id, value.managementKey)}>
                  {value.document.kind === 'INVITATION'
                    ? t('Управление и ответы гостей ↗')
                    : t('Изменить или отозвать ↗')}
                </a>
              </div>
              <details>
                <summary>{t('Сохранить ссылку управления')}</summary>
                <p>
                  {t(
                    'Она даёт право изменять публикацию. Сохраните её отдельно от ссылки для гостей.',
                  )}
                </p>
                <input
                  aria-label={t('Ссылка управления')}
                  readOnly
                  value={managementUrl(value.document.id, value.managementKey)}
                  onFocus={(event) => event.target.select()}
                />
              </details>
            </article>
          ))}
          <button type="button" className="journey-secondary" onClick={() => setStep(0)}>
            {t('Создать ещё')}
          </button>
        </section>
      )}
    </main>
  );
}
