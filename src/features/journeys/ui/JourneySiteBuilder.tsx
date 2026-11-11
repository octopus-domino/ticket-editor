import { useLanguageDraft } from './useLanguageDraft';
import { t } from '@/shared/i18n';
import { useEffect, useState } from 'react';
import type { JourneyDefinition, JourneyField } from '../domain/definitions';
import { JOURNEYS } from '../domain/definitions';
import { JOURNEY_CAPABILITIES } from '../domain/definitions';
import { journeyApi, managementKey, rememberKey, siteUrl } from '../api/journeys';
import { JourneyWizard } from './JourneyWizard';
import { useAddressAvailability } from './useAddressAvailability';
import { AddressFeedback } from './AddressFeedback';
import { Link } from 'react-router-dom';

export function JourneySiteBuilder() {
  const [definition, setDefinition] = useLanguageDraft<JourneyDefinition>(
    `builder:${new URLSearchParams(window.location.search).get('site') ?? 'new'}`,
    { ...JOURNEYS.invite, slug: '' },
  );
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [ownerLink, setOwnerLink] = useState('');
  const editing = new URLSearchParams(window.location.search).get('site');
  const address = useAddressAvailability(definition.slug, 'sites', !!editing);
  useEffect(() => {
    if (editing)
      void journeyApi
        .site(editing)
        .then(setDefinition)
        .catch((reason) => setError((reason as Error).message));
  }, [editing, setDefinition]);
  function field(index: number, patch: Partial<JourneyField>) {
    setDefinition((value) => ({
      ...value,
      fields: value.fields.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }
  async function publish() {
    if (!address.valid) return;
    setBusy(true);
    setError('');
    try {
      let key = editing ? managementKey(`site:${editing}`) : '';
      if (editing) await journeyApi.updateSite(definition, key);
      else {
        const created = await journeyApi.createSite(definition);
        key = created.managementKey;
        rememberKey(`site:${definition.slug}`, key);
      }
      setResult(siteUrl(definition.slug));
      setOwnerLink(
        `${window.location.origin}/sites/new?site=${definition.slug}#key=${encodeURIComponent(key)}`,
      );
    } catch (reason) {
      if ((reason as { status?: number }).status === 409) {
        address.markTaken();
        return;
      }
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (preview)
    return (
      <>
        <button className="journey-preview-close" onClick={() => setPreview(false)}>
          {t('← Вернуться в конструктор')}
        </button>
        <JourneyWizard
          key={definition.slug + definition.kind}
          definition={definition}
          previewOnly
        />
      </>
    );
  return (
    <main className="journey-builder">
      <div className="journey-intro">
        <span className="journey-eyebrow">{t('КОНСТРУКТОР СЕРВИСОВ CODOC')}</span>
        <h1>{t('Ваш сайт. Готовый путь до результата.')}</h1>
        <Link to="/app/workflows">
          {t('Создать полностью новый путь в профессиональном конструкторе →')}
        </Link>
        <p>
          {t(
            'Выберите сценарий, настройте форму и оформление. Публикация, PDF, QR и управление уже работают вместе.',
          )}
        </p>
      </div>
      <form
        className="journey-builder-form"
        onSubmit={(event) => {
          event.preventDefault();
          void publish();
        }}
      >
        <fieldset>
          <legend>{t('1. Что получает посетитель?')}</legend>
          <div className="journey-scenario-grid">
            {Object.entries(JOURNEYS).map(([key, value]) => (
              <button
                key={key}
                type="button"
                disabled={Boolean(editing)}
                aria-pressed={definition.kind === value.kind}
                onClick={() => setDefinition({ ...value, slug: definition.slug })}
              >
                <strong>{JOURNEY_CAPABILITIES[value.kind].label}</strong>
                <span>{value.description}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t('2. Заголовок и адрес')}</legend>
          <label>
            {t('Название сайта')}
            <input
              required
              value={definition.title}
              maxLength={120}
              onChange={(event) => setDefinition({ ...definition, title: event.target.value })}
            />
          </label>
          <label>
            {t('Короткое описание')}
            <textarea
              value={definition.description}
              maxLength={600}
              onChange={(event) =>
                setDefinition({ ...definition, description: event.target.value })
              }
            />
          </label>
          <label>
            {t('Поддомен')}
            <input
              required
              disabled={Boolean(editing)}
              value={definition.slug}
              pattern="[a-z][a-z0-9-]{1,46}[a-z0-9]"
              placeholder="my-event"
              aria-describedby="site-address-status"
              aria-invalid={['taken', 'reserved', 'invalid'].includes(address.status)}
              onChange={(event) =>
                setDefinition({ ...definition, slug: event.target.value.toLowerCase() })
              }
            />
            <small>{definition.slug || 'my-event'}.codoc.site</small>
            {!editing && <AddressFeedback id="site-address-status" status={address.status} />}
          </label>
        </fieldset>
        <fieldset>
          <legend>{t('3. Поля формы')}</legend>
          {definition.fields.map((item, index) => (
            <div className="journey-builder-field" key={index}>
              <input
                aria-label={t('Название поля {0}', index + 1)}
                required
                value={item.label}
                maxLength={80}
                onChange={(event) => field(index, { label: event.target.value })}
              />
              <select
                aria-label={t('Тип поля {0}', index + 1)}
                value={item.type}
                onChange={(event) =>
                  field(index, { type: event.target.value as JourneyField['type'] })
                }
              >
                <option value="text">{t('Строка')}</option>
                <option value="textarea">{t('Несколько строк')}</option>
                <option value="date">{t('Дата')}</option>
                <option value="time">{t('Время')}</option>
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(event) => field(index, { required: event.target.checked })}
                />
                {t('Обязательное')}
              </label>
              <button
                type="button"
                disabled={definition.fields.length <= 1}
                onClick={() =>
                  setDefinition({
                    ...definition,
                    fields: definition.fields.filter((_, i) => i !== index),
                  })
                }
              >
                {t('Удалить')}
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={definition.fields.length >= 12}
            onClick={() =>
              setDefinition({
                ...definition,
                fields: [
                  ...definition.fields,
                  {
                    name: `field_${crypto.randomUUID().slice(0, 8)}`,
                    label: t('Новое поле'),
                    type: 'text',
                    required: false,
                  },
                ],
              })
            }
          >
            {t('＋ Добавить поле')}
          </button>
        </fieldset>
        <fieldset>
          <legend>{t('4. Оформление')}</legend>
          <select
            value={definition.theme}
            onChange={(event) =>
              setDefinition({
                ...definition,
                theme: event.target.value as JourneyDefinition['theme'],
              })
            }
          >
            <option value="sage">{t('Шалфей')}</option>
            <option value="rose">{t('Роза')}</option>
            <option value="ink">{t('Чернила')}</option>
          </select>
        </fieldset>
        <div className="journey-builder-actions">
          <button type="button" className="journey-secondary" onClick={() => setPreview(true)}>
            {t('Предпросмотр')}
          </button>
          <button type="submit" disabled={busy || !address.valid} className="journey-primary">
            {busy ? t('Публикуем…') : editing ? t('Сохранить сайт') : t('Опубликовать сайт')} ↗
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
        {result && (
          <section role="status">
            <h2>{t('Сайт готов')}</h2>
            <a href={result}>{result}</a>
            <p>{t('Ссылка управления — сохраните её отдельно:')}</p>
            <input
              aria-label={t('Управление сайтом')}
              readOnly
              value={ownerLink}
              onFocus={(event) => event.target.select()}
            />
          </section>
        )}
      </form>
    </main>
  );
}
