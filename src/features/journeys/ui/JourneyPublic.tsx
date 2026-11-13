import { t, getLocale } from '@/shared/i18n';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { GuestReply, JourneyDocument } from '../domain/definitions';
import { journeyApi, managementKey, pdfUrl, publicUrl } from '../api/journeys';
import { JourneyCard } from './JourneyCard';
import { JourneyShare } from './JourneyShare';
import { ProposalEditor } from './ProposalEditor';
import { ScheduleEditor } from './ScheduleEditor';
import { STATUS_LABELS } from './JourneyBatch';
import type { JourneyStatus } from '../domain/definitions';
import { API_BASE } from '@/shared/api/client';
import { ProposalActionBar } from './ProposalActionBar';
import { JourneyBrandingEditor } from './JourneyBrandingEditor';
import { readBranding } from '../domain/branding';
import { JourneyReviews } from './JourneyReviews';
import { JourneyPrintSize } from './JourneyPrintSize';
import { contactHref } from '../domain/contact';
import type { RouteEditorHandle } from './RouteEditor';
import { JourneyConstructorButton } from './JourneyConstructorButton';
import { JourneyStatusActions } from './JourneyStatusActions';
const RouteEditor = lazy(() =>
  import('./RouteEditor').then((module) => ({ default: module.RouteEditor })),
);
const AlbumPanel = lazy(() => import('./AlbumPanel').then(module => ({ default: module.AlbumPanel })));

export function JourneyPublic({ manage = false }: { manage?: boolean }) {
  const { id = '' } = useParams();
  const [document, setDocument] = useState<JourneyDocument | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [routeBusy, setRouteBusy] = useState(false);
  const routeEditor = useRef<RouteEditorHandle>(null);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [attending, setAttending] = useState(true);
  const [guests, setGuests] = useState<GuestReply[]>([]);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [status, setStatus] = useState<JourneyStatus | null>(null);
  const documentKind = document?.kind;
  const documentUpdatedAt = document?.updatedAt;
  useEffect(() => {
    setStatus(null);
    if (!documentKind || !manage && !['TICKET', 'GIFT', 'PASS'].includes(documentKind)) return;
    let active = true;
    void journeyApi
      .status(id)
      .then((v) => {
        if (active) setStatus(v);
      })
      .catch((reason) => {
        if (active) setError((reason as Error).message);
      });
    return () => {
      active = false;
    };
  }, [id, documentKind, documentUpdatedAt, manage]);
  useEffect(() => {
    let active = true;
    setDocument(null);
    setError('');
    const key = manage ? managementKey(id) : '';
    void (manage ? journeyApi.manage(id, key) : journeyApi.get(id))
      .then((value) => {
        if (active) setDocument(value);
      })
      .catch((reason) => {
        if (active) setError((reason as Error).message);
      });
    if (manage)
      void journeyApi
        .guests(id, key)
        .then((value) => {
          if (active) setGuests(value);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, manage]);
  async function respond() {
    setBusy(true);
    setError('');
    try {
      const storage = `codoc:rsvp:${id}`;
      let key = localStorage.getItem(storage);
      if (!key) {
        key = crypto.randomUUID() + crypto.randomUUID();
        localStorage.setItem(storage, key);
      }
      await journeyApi.respond(id, name, attending, key);
      setMessage(
        attending
          ? t('Ваш ответ сохранён. До встречи!')
          : t('Ваш ответ сохранён. Спасибо, что сообщили.'),
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!document) return;
    setBusy(true);
    setError('');
    try {
      const routeId = document.kind === 'TOUR' ? await routeEditor.current?.prepare() : undefined;
      const prepared = routeId ? { ...document, data: { ...document.data, route: routeId } } : document;
      setDocument(await journeyApi.update(prepared, managementKey(id)));
      setMessage(t('Обновлено. Публичная ссылка и QR остались прежними.'));
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!document)
    return (
      <main className="journey-public">
        {error ? <p role="alert">{error}</p> : <p role="status">{t('Открываем страницу…')}</p>}
      </main>
    );
  return (
    <main className={`journey-public journey-public-${document.kind.toLowerCase()}`}>
      <div className="journey-public-layout">
        {document.kind === 'ALBUM' && <Suspense fallback={<p>{t('Loading…')}</p>}><AlbumPanel id={id} manage={manage} /></Suspense>}
        {document.kind !== 'ALBUM' && <JourneyCard document={document} />}
        <aside className="journey-public-actions">
          {manage && <JourneyConstructorButton id={id} />}
          {!manage && ['INVITATION', 'TICKET'].includes(document.kind) && (
            <header className="journey-event-intro">
              <span>{t('ДО ВСТРЕЧИ НА СОБЫТИИ')}</span>
              <h1>
                {document.kind === 'INVITATION' ? t('Сохраните приглашение') : t('Ваш билет готов')}
              </h1>
              <p>
                {document.kind === 'INVITATION'
                  ? t('Скачайте карточку, поделитесь ссылкой и сообщите, сможете ли вы прийти.')
                  : t('Сохраните PDF или откройте эту страницу при входе.')}
              </p>
            </header>
          )}
          {status && (
            <div
              role="status"
              className={`journey-validity journey-validity-${status.state.toLowerCase()}`}
            >
              <h2>{STATUS_LABELS[status.state]}</h2>
              {status.validUntil && (
                <p>
                  {t('Действует по')}{' '}
                  {new Date(`${status.validUntil}T12:00:00`).toLocaleDateString(getLocale(), {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
              <button
                className="journey-status-refresh"
                onClick={() =>
                  void journeyApi
                    .status(id)
                    .then(setStatus)
                    .catch((reason) => setError((reason as Error).message))
                }
              >
                {t('Обновить статус')}
              </button>
            </div>
          )}
          {['BADGE', 'VCARD'].includes(document.kind) && (
            <a
              className="journey-primary"
              href={`${API_BASE}/api/journeys/${encodeURIComponent(id)}/contact`}
            >
              {t('Сохранить контакт ↓')}
            </a>
          )}
          {document.kind === 'SCHEDULE' && (
            <a
              className="journey-primary"
              href={`${API_BASE}/api/journeys/${encodeURIComponent(id)}/calendar`}
            >
              {t('Скачать расписание в календарь ↓')}
            </a>
          )}
          {document.kind === 'CERTIFICATE' && (
            <div className="journey-verification">
              <span>✓</span>
              <h1>{t('Запись найдена')}</h1>
              <p>
                {t('Сертификат опубликован в CoDoc')}{' '}
                {new Date(document.updatedAt).toLocaleDateString(getLocale())}.
              </p>
              <small>
                {t(
                  'Запись подтверждает публикацию автором. CoDoc не проверяет полномочия организации, выдавшей сертификат.',
                )}
              </small>
            </div>
          )}
          <a className="journey-primary" href={pdfUrl(id)}>
            {t('Скачать PDF ↓')}
          </a>
          {document.kind === 'TICKET' && (
            <details className="journey-ticket-code">
              <summary>{t('Показать QR на входе')}</summary>
              <img
                src={`${API_BASE}/api/qr?size=480&text=${encodeURIComponent(publicUrl(id))}`}
                alt={t('QR-код для прохода')}
              />
            </details>
          )}
          {!['INVITATION', 'TICKET'].includes(document.kind) && (
            <img
              className="journey-qr"
              src={`${API_BASE}/api/qr?size=240&text=${encodeURIComponent(publicUrl(id))}`}
              alt={t('QR-код этой страницы')}
            />
          )}
          <JourneyShare url={publicUrl(id)} title={document.title} />
          {document.kind === 'PROPERTY' && contactHref(document.data.contact ?? '') && (
            <a
              className="journey-primary"
              href={contactHref(document.data.contact)}
              rel="noreferrer"
            >
              {t('Contact us')}
            </a>
          )}
          {document.kind === 'PRICETAG' && (
            <JourneyReviews
              key={id}
              id={id}
              manage={manage}
              managementKey={manage ? managementKey(id) : ''}
            />
          )}
          {!manage && document.kind === 'INVITATION' && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void respond();
              }}
            >
              <h2>{t('Вы придёте?')}</h2>
              <label>
                {t('Ваше имя')}
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                <select
                  value={attending ? 'yes' : 'no'}
                  onChange={(event) => setAttending(event.target.value === 'yes')}
                >
                  <option value="yes">{t('Да, буду!')}</option>
                  <option value="no">{t('Не смогу прийти')}</option>
                </select>
              </label>
              <button disabled={busy} className="journey-primary">
                {t('Отправить ответ')}
              </button>
              <small>{t('Имя и ответ увидит только организатор.')}</small>
            </form>
          )}
          {manage && (
            <section className="journey-manage">
              <h1>{t('Управление публикацией')}</h1>
              {status && <JourneyStatusActions id={id} managementKey={managementKey(id)} status={status} onChange={setStatus} />}
              <p>{t('Сохраните эту ссылку. Не отправляйте её гостям.')}</p>
              <label>
                {t('Название')}
                <input
                  value={document.title}
                  maxLength={120}
                  onChange={(event) => setDocument({ ...document, title: event.target.value })}
                />
              </label>
              {Object.entries(document.data)
                .filter(
                  ([key]) =>
                    ![
                      'site',
                      'theme',
                      'positions',
                      'events',
                      'branding',
                      'route',
                      'route_labels',
                      'locale',
                      'field_labels',
                      'print_width',
                      'print_height',
                    ].includes(key),
                )
                .map(([key, value]) => (
                  <label key={key}>
                    {(
                      {
                        items: t('Блюда и цены'),
                        description: t('Описание'),
                        date: t('Дата'),
                        time: t('Время'),
                        location: t('Место'),
                        recipient: t('Получатель'),
                        issuer: t('Организация'),
                        contact: t('Контакты'),
                        valid_until: t('Действует по (ГГГГ-ММ-ДД)'),
                        amount: t('Номинал'),
                        role: t('Должность'),
                        vehicle: t('Автомобиль или объект'),
                        timezone: t('Часовой пояс'),
                        currency: t('Валюта'),
                        portfolio: t('Портфолио'),
                        phone: t('Телефон'),
                        email: t('Email'),
                        batch: t('Batch number'),
                        weight: t('Weight or volume'),
                        website: t('Website'),
                        area: t('Area, m²'),
                        rooms: t('Rooms'),
                        return_date: t('End date'),
                        price: t('Price'),
                      } as Record<string, string>
                    )[key] ?? key}
                    <textarea
                      value={value}
                      maxLength={12000}
                      onChange={(event) =>
                        setDocument({
                          ...document,
                          data: { ...document.data, [key]: event.target.value },
                        })
                      }
                    />
                  </label>
                ))}
              <JourneyBrandingEditor
                value={readBranding(document.data.branding)}
                onBusyChange={setMediaBusy}
                onChange={(branding) =>
                  setDocument((value) =>
                    value
                      ? {
                          ...value,
                          data: { ...value.data, branding: JSON.stringify(branding) },
                        }
                      : value,
                  )
                }
              />
              {['VCARD', 'LABEL', 'PRICETAG'].includes(document.kind) && (
                <JourneyPrintSize
                  kind={document.kind}
                  data={document.data}
                  onChange={(patch) =>
                    setDocument((value) =>
                      value ? { ...value, data: { ...value.data, ...patch } } : value,
                    )
                  }
                />
              )}
              {document.kind === 'TOUR' && (
                <Suspense fallback={<p>{t('Loading map…')}</p>}>
                  <RouteEditor
                    ref={routeEditor}
                    value={document.data.route ?? ''}
                    onBusyChange={setRouteBusy}
                    onChange={(route) =>
                      setDocument((value) =>
                        value ? { ...value, data: { ...value.data, route } } : value,
                      )
                    }
                  />
                </Suspense>
              )}
              {document.kind === 'PROPOSAL' && (
                <ProposalEditor
                  value={document.data.positions ?? '[]'}
                  currency={document.data.currency ?? 'RUB'}
                  onChange={(positions) =>
                    setDocument((value) =>
                      value ? { ...value, data: { ...value.data, positions } } : value,
                    )
                  }
                />
              )}
              {document.kind === 'SCHEDULE' && (
                <ScheduleEditor
                  value={document.data.events ?? '[]'}
                  onChange={(events) =>
                    setDocument((value) =>
                      value ? { ...value, data: { ...value.data, events } } : value,
                    )
                  }
                />
              )}
              <ProposalActionBar data={document.kind === 'PROPOSAL' ? document.data : undefined}>
                <button
                  type="button"
                  disabled={
                    busy ||
                    mediaBusy ||
                    routeBusy ||
                    (document.kind === 'TOUR' && !document.data.route)
                  }
                  className="journey-primary"
                  onClick={() => void save()}
                >
                  {t('Сохранить изменения')}
                </button>
              </ProposalActionBar>
              {document.kind === 'INVITATION' && (
                <>
                  <h2>
                    {t('Ответы гостей ·')}
                    {guests.filter((guest) => guest.attending).length} {t('придут')}
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      void journeyApi
                        .guests(id, managementKey(id))
                        .then(setGuests)
                        .catch((reason) => setError((reason as Error).message))
                    }
                  >
                    {t('Обновить ответы')}
                  </button>
                  {guests.length ? (
                    <ul>
                      {guests.map((guest, index) => (
                        <li key={index}>
                          {guest.name} · {guest.attending ? t('Придёт') : t('Не придёт')}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t('Ответов пока нет.')}</p>
                  )}
                </>
              )}
              <a href={pdfUrl(id, true)}>{t('Скачать архивную версию PDF/A ↓')}</a>
              <button
                type="button"
                className="journey-danger"
                onClick={() => setConfirmRevoke(true)}
              >
                {t('Отозвать публикацию')}
              </button>
              {confirmRevoke && (
                <div role="alert">
                  <p>{t('Страница и PDF станут недоступны. Отозвать публикацию?')}</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      void journeyApi
                        .revoke(id, managementKey(id))
                        .then(() => {
                          setDocument(null);
                          setError(t('Публикация отозвана.'));
                        })
                        .catch((reason) => setError((reason as Error).message))
                        .finally(() => setBusy(false));
                    }}
                  >
                    {t('Да, отозвать')}
                  </button>
                  <button type="button" onClick={() => setConfirmRevoke(false)}>
                    {t('Отмена')}
                  </button>
                </div>
              )}
            </section>
          )}
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
        </aside>
      </div>
    </main>
  );
}
