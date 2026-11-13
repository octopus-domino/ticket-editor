import { useLanguageDraft } from '../journeys/ui/useLanguageDraft';
import { isTranslation, t } from '@/shared/i18n';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { httpTemplateRepository, type TemplateSummary } from '@/features/templates';
import {
  workflowApi,
  type WorkflowDefinition,
  type ManagedWorkflow,
  type WorkflowField,
} from './api';
import { JourneyButton } from '../journeys/ui/JourneyButton';
import '../journeys/journeys.css';
import './workflows.css';
import { useAddressAvailability } from '../journeys/ui/useAddressAvailability';
import { AddressFeedback } from '../journeys/ui/AddressFeedback';
import { siteUrl } from '../journeys/api/journeys';
import { localizeInvalidField, clearFieldValidation } from '../journeys/ui/formValidation';

const empty = (): WorkflowDefinition => ({
  version: 1,
  slug: '',
  title: '',
  description: '',
  templateId: '',
  steps: [
    {
      title: t('Ваши данные'),
      fields: [{ path: 'name', label: t('Имя'), type: 'text', required: true, options: [] }],
    },
  ],
  completionMessage: t('Скачайте готовый документ.'),
});
const TYPES = [
  ['text', t('Текст')],
  ['textarea', t('Длинный текст')],
  ['number', t('Число')],
  ['date', t('Дата')],
  ['email', 'Email'],
  ['select', t('Выбор из списка')],
  ['boolean', t('Подтверждение')],
];
export default function WorkflowBuilder() {
  const [items, setItems] = useState<ManagedWorkflow[]>([]);
  const [catalog, setCatalog] = useState<import('./api').PublicWorkflow[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [saved, setSaved] = useLanguageDraft<ManagedWorkflow | null>('professional:saved', null);
  const [draft, setDraft] = useLanguageDraft('professional:draft', empty, (value) =>
    saved
      ? value
      : {
          ...value,
          completionMessage: isTranslation('Скачайте готовый документ.', value.completionMessage)
            ? t('Скачайте готовый документ.')
            : value.completionMessage,
          steps: value.steps.map((step) => ({
            ...step,
            title: ['Ваши данные', 'Новый шаг'].reduce(
              (title, source) => (isTranslation(source, title) ? t(source) : title),
              step.title,
            ),
            fields: step.fields.map((field) => ({
              ...field,
              label:
                field.path === 'name' && isTranslation('Имя', field.label) ? t('Имя') : field.label,
            })),
          })),
        },
  );
  const [dirty, setDirty] = useLanguageDraft('professional:dirty', true);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const address = useAddressAvailability(draft.slug, 'workflows', !!saved);
  const fieldCount = draft.steps.reduce((sum, step) => sum + step.fields.length, 0);
  useEffect(() => {
    void workflowApi
      .catalog()
      .then(setCatalog)
      .catch(() => {
        /* Own workflows remain available when the common catalog is offline. */
      });
    void Promise.all([workflowApi.list(), httpTemplateRepository.list()])
      .then(([paths, t]) => {
        setItems(paths);
        setTemplates(t);
      })
      .catch((e) => setError((e as Error).message));
  }, []);
  function change(next: WorkflowDefinition) {
    setDraft(next);
    setDirty(true);
    setNotice('');
  }
  function field(step: number, index: number, patch: Partial<WorkflowField>) {
    change({
      ...draft,
      steps: draft.steps.map((s, i) =>
        i === step
          ? { ...s, fields: s.fields.map((f, j) => (j === index ? { ...f, ...patch } : f)) }
          : s,
      ),
    });
  }
  async function execute(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (e) {
      if (!saved && (e as { status?: number }).status === 409) {
        address.markTaken();
        return;
      }
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function accepted(result: ManagedWorkflow) {
    setSaved(result);
    setDraft(result.definition);
    setShared(result.shared);
    setDirty(false);
    setItems((current) => [
      result,
      ...current.filter((i) => i.definition.slug !== result.definition.slug),
    ]);
  }
  return (
    <main
      className="workflow-page"
      onInvalidCapture={localizeInvalidField}
      onInputCapture={clearFieldValidation}
    >
      <h1>{t('Конструктор клиентских путей')}</h1>
      <p>
        {t(
          'Соберите форму по шагам и свяжите её с собственным шаблоном. Клиент заполнит данные и получит PDF без входа в редактор.',
        )}
      </p>
      <div className="workflow-builder">
        <aside className="workflow-panel">
          <h2>{t('Мои сценарии')}</h2>
          <JourneyButton
            onClick={() => {
              setDraft(empty());
              setSaved(null);
              setDirty(true);
              setShared(false);
            }}
          >
            {t('Новый сценарий')}
          </JourneyButton>
          {items.map((item) => (
            <JourneyButton key={item.definition.slug} onClick={() => accepted(item)}>
              {item.definition.title} · {item.published ? t('Опубликован') : t('Черновик')}
            </JourneyButton>
          ))}
          <Link to="/app/templates/new">{t('Создать шаблон документа ↗')}</Link>
          {!!catalog.length && (
            <>
              <h2>{t('Ready-to-use services')}</h2>
              {catalog.map((item) => (
                <Link key={item.definition.slug} to={siteUrl(item.definition.slug)}>
                  {item.definition.title} ↗
                </Link>
              ))}
            </>
          )}
        </aside>
        <form
          className="workflow-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void execute(async () => {
              accepted(await workflowApi.save(draft, saved?.revision));
              setNotice(t('Черновик сохранён'));
            });
          }}
        >
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <label>
            {t('Название')}
            <input
              required
              maxLength={120}
              value={draft.title}
              onChange={(e) => change({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            {t('Адрес /flows/')}
            <input
              required
              disabled={!!saved}
              pattern="[a-z][a-z0-9-]{1,46}[a-z0-9]"
              aria-describedby="workflow-address-status"
              aria-invalid={['taken', 'reserved', 'invalid'].includes(address.status)}
              value={draft.slug}
              onChange={(e) => change({ ...draft, slug: e.target.value.toLowerCase() })}
            />
            {!saved && <AddressFeedback id="workflow-address-status" status={address.status} />}
            {draft.slug && <small>{siteUrl(draft.slug)}</small>}
          </label>
          <label>
            {t('Описание')}
            <textarea
              maxLength={600}
              value={draft.description}
              onChange={(e) => change({ ...draft, description: e.target.value })}
            />
          </label>
          <label>
            {t('Шаблон PDF')}
            <select
              required
              value={draft.templateId}
              onChange={(e) => change({ ...draft, templateId: e.target.value })}
            >
              <option value="">{t('Выберите свой шаблон')}</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <JourneyButton
            disabled={busy || !draft.templateId}
            onClick={() =>
              void execute(async () => {
                const fields = await workflowApi.fields(draft.templateId);
                if (!fields.length)
                  throw new Error(
                    t(
                      'В шаблоне нет простых полей схемы. Добавьте поля вручную или привяжите схему в редакторе.',
                    ),
                  );
                if (fields.length > 100)
                  throw new Error(
                    t('A workflow supports up to 100 fields. Choose a smaller schema.'),
                  );
                change({
                  ...draft,
                  steps: Array.from({ length: Math.ceil(fields.length / 30) }, (_, index) => ({
                    title: t('Ваши данные') + (fields.length > 30 ? ` ${index + 1}` : ''),
                    fields: fields.slice(index * 30, (index + 1) * 30),
                  })),
                });
                setNotice(t('Поля загружены из схемы шаблона'));
              })
            }
          >
            {t('Загрузить поля из схемы шаблона')}
          </JourneyButton>
          <p className="workflow-hint">
            {t(
              'Путь поля должен совпадать с полем схемы или плейсхолдером шаблона, например client.name. Макет PDF редактируется в обычном редакторе шаблонов. Публикация сохраняет копию макета.',
            )}
          </p>
          {draft.steps.map((step, si) => (
            <fieldset key={si}>
              <legend>
                {t('Шаг')} {si + 1}
              </legend>
              <label>
                {t('Заголовок шага')}
                <input
                  required
                  maxLength={80}
                  value={step.title}
                  onChange={(e) =>
                    change({
                      ...draft,
                      steps: draft.steps.map((s, i) =>
                        i === si ? { ...s, title: e.target.value } : s,
                      ),
                    })
                  }
                />
              </label>
              <div className="workflow-actions">
                <JourneyButton
                  disabled={si === 0}
                  onClick={() => {
                    const steps = [...draft.steps];
                    [steps[si - 1], steps[si]] = [steps[si], steps[si - 1]];
                    change({ ...draft, steps });
                  }}
                >
                  {t('Выше')}
                </JourneyButton>
                <JourneyButton
                  disabled={draft.steps.length === 1}
                  onClick={() =>
                    change({ ...draft, steps: draft.steps.filter((_, i) => i !== si) })
                  }
                >
                  {t('Удалить шаг')}
                </JourneyButton>
              </div>
              {step.fields.map((f, fi) => (
                <div className="workflow-field" key={fi}>
                  <label>
                    {t('Подпись')}
                    <input
                      required
                      maxLength={100}
                      value={f.label}
                      onChange={(e) => field(si, fi, { label: e.target.value })}
                    />
                  </label>
                  <label>
                    {t('Путь в шаблоне')}
                    <input
                      required
                      value={f.path}
                      onChange={(e) => field(si, fi, { path: e.target.value })}
                    />
                  </label>
                  <label>
                    {t('Тип')}
                    <select
                      value={f.type}
                      onChange={(e) => field(si, fi, { type: e.target.value })}
                    >
                      {TYPES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="workflow-checkbox">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => field(si, fi, { required: e.target.checked })}
                    />
                    {t('Обязательное')}
                  </label>
                  {f.type === 'select' && (
                    <label>
                      {t('Варианты (каждый с новой строки)')}
                      <textarea
                        value={f.options.join('\n')}
                        onChange={(e) => field(si, fi, { options: e.target.value.split('\n') })}
                      />
                    </label>
                  )}
                  <div className="workflow-actions">
                    <JourneyButton
                      disabled={fi === 0}
                      onClick={() => {
                        const fields = [...step.fields];
                        [fields[fi - 1], fields[fi]] = [fields[fi], fields[fi - 1]];
                        change({
                          ...draft,
                          steps: draft.steps.map((s, i) => (i === si ? { ...s, fields } : s)),
                        });
                      }}
                    >
                      {t('Выше')}
                    </JourneyButton>
                    <JourneyButton
                      variant="danger"
                      disabled={step.fields.length === 1}
                      onClick={() =>
                        change({
                          ...draft,
                          steps: draft.steps.map((s, i) =>
                            i === si ? { ...s, fields: s.fields.filter((_, j) => j !== fi) } : s,
                          ),
                        })
                      }
                    >
                      {t('Удалить поле')}
                    </JourneyButton>
                  </div>
                </div>
              ))}
              <JourneyButton
                disabled={step.fields.length >= 30 || fieldCount >= 100}
                onClick={() =>
                  change({
                    ...draft,
                    steps: draft.steps.map((s, i) =>
                      i === si
                        ? {
                            ...s,
                            fields: [
                              ...s.fields,
                              { path: '', label: '', type: 'text', required: false, options: [] },
                            ],
                          }
                        : s,
                    ),
                  })
                }
              >
                {t('Добавить поле')}
              </JourneyButton>
            </fieldset>
          ))}
          <JourneyButton
            disabled={draft.steps.length >= 8 || fieldCount >= 100}
            onClick={() =>
              change({
                ...draft,
                steps: [
                  ...draft.steps,
                  {
                    title: t('Новый шаг'),
                    fields: [{ path: '', label: '', type: 'text', required: false, options: [] }],
                  },
                ],
              })
            }
          >
            {t('Добавить шаг')}
          </JourneyButton>
          <label>
            {t('Сообщение после создания PDF')}
            <textarea
              maxLength={500}
              value={draft.completionMessage}
              onChange={(e) => change({ ...draft, completionMessage: e.target.value })}
            />
          </label>
          <details className="workflow-attendance">
            <summary>{t('Attendance check after issuing')}</summary>
            <label className="workflow-checkbox"><input type="checkbox" checked={Boolean(draft.attendance)}
              onChange={event => change({ ...draft, attendance: event.target.checked ? {
                title: t('Attendance verification'), instructions: t('Show this QR at the entrance. The organiser can check the document and mark your visit.'),
              } : null })} />{t('Add a verification card with a QR code to the PDF')}</label>
            {draft.attendance && <>
              <label>{t('Title')}<input maxLength={120} required value={draft.attendance.title}
                onChange={event => change({ ...draft, attendance: { ...draft.attendance!, title: event.target.value } })} /></label>
              <label>{t('Instructions')}<textarea maxLength={300} required value={draft.attendance.instructions}
                onChange={event => change({ ...draft, attendance: { ...draft.attendance!, instructions: event.target.value } })} /></label>
              <p>{t('Only the workflow owner can record checks and attendance. Guests can view the status.')}</p>
            </>}
          </details>
          {saved?.administrator && (
            <label className="workflow-checkbox">
              <input
                type="checkbox"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
              />
              {t('Добавить в общий каталог')}
            </label>
          )}
          <div className="workflow-actions workflow-controls">
            <JourneyButton type="submit" disabled={busy || !address.valid} variant="primary">
              {t('Сохранить черновик')}
            </JourneyButton>
            <JourneyButton
              disabled={busy || dirty || !saved}
              onClick={() =>
                void execute(async () => {
                  accepted(await workflowApi.publish(draft.slug, saved!.revision, shared));
                  setNotice(t('Сценарий опубликован'));
                })
              }
            >
              {t('Опубликовать')}
            </JourneyButton>
            {saved?.published && (
              <>
                <Link to={siteUrl(draft.slug)} target="_blank" rel="noreferrer">
                  {t('Открыть путь ↗')}
                </Link>
                <JourneyButton
                  disabled={busy}
                  onClick={() =>
                    void execute(async () => {
                      await workflowApi.unpublish(draft.slug);
                      const paths = await workflowApi.list();
                      setItems(paths);
                      const next = paths.find((p) => p.definition.slug === draft.slug);
                      if (next) accepted(next);
                      setNotice(t('Публикация снята'));
                    })
                  }
                >
                  {t('Снять с публикации')}
                </JourneyButton>
              </>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
