import { t, getLocale } from '@/shared/i18n';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { journeyApi, managementKey, managementUrl, pdfUrl, publicUrl } from '../api/journeys';
import type { JourneyBatch as Batch, JourneyStatus } from '../domain/definitions';
import { downloadFile } from '@/shared/files/download';
import { JourneyScanner } from './JourneyScanner';
import { JourneyStatusActions } from './JourneyStatusActions';
import { JourneyConstructorButton } from './JourneyConstructorButton';
import { JourneyCard } from './JourneyCard';

export const STATUS_LABELS: Record<JourneyStatus['state'], string> = {
  get ACTIVE() { return t('Действителен'); },
  get USED() { return t('Использован'); },
  get EXPIRED() { return t('Срок истёк'); },
  get REVOKED() { return t('Отозван'); },
};
export function JourneyBatch() {
  const { id = '' } = useParams();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [previewId, setPreviewId] = useState('');
  const key = managementKey(`batch:${id}`);
  async function reload() {
    setBatch(await journeyApi.batch(id, key));
  }
  useEffect(() => {
    let active = true;
    void journeyApi
      .batch(id, key)
      .then((v) => {
        if (active) setBatch(v);
      })
      .catch((reason) => {
        if (active) setError((reason as Error).message);
      });
    return () => {
      active = false;
    };
  }, [id, key]);
  let search = code.trim();
  try {
    search = new URL(search).pathname.split('/').filter(Boolean).at(-1) ?? '';
  } catch {
    /* A plain code or a name is also valid. */
  }
  const visible =
    batch?.documents.filter(
      (value) =>
        !code ||
        value.document.id === search ||
        value.document.data.recipient?.toLocaleLowerCase().includes(code.toLocaleLowerCase()),
    ) ?? [];
  async function consume(docId: string) {
    setBusy(true);
    setError('');
    try {
      await journeyApi.consume(docId, key);
      await reload();
    } catch (reason) {
      setError((reason as Error).message);
      await reload().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="journey-main">
      <h1>{batch?.title ?? t('Реестр выпуска')}</h1>
      <p>
        {t(
          'Ссылка управления даёт доступ к именам, изменению и проверке кодов. Передавайте её только ответственному за выпуск.',
        )}
      </p>
      {error && <p role="alert">{error}</p>}
      {batch && (
        <>
          <JourneyScanner onCode={setCode} />
          {batch.documents[0] && <JourneyConstructorButton id={batch.documents[0].document.id} batchId={id} />}
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void journeyApi
                .batchPdf(id, key)
                .then((blob) => downloadFile(blob, 'codoc-release.pdf'))
                .catch((reason) => setError((reason as Error).message))
                .finally(() => setBusy(false));
            }}
          >
            {t('Скачать весь выпуск PDF')}{' '}
            {batch.documents[0]?.document.kind === 'BADGE' ? t('— 6 бейджей на A4') : ''}
          </button>
          <button type="button" disabled={busy} onClick={() => {
            setBusy(true); setError('');
            void journeyApi.batchZip(id, key).then(blob => downloadFile(blob, 'codoc-release.zip'))
              .catch(reason => setError((reason as Error).message)).finally(() => setBusy(false));
          }}>{t('Download separate PDFs (ZIP)')}</button>
          <button
            disabled={busy}
            onClick={() => {
              setError('');
              void reload().catch((reason) => setError((reason as Error).message));
            }}
          >
            {t('Обновить статусы')}
          </button>
          <label>
            {t('Код, ссылка из QR или имя')}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('Вставьте ссылку из камеры телефона')}
            />
          </label>
          {!visible.length && <p role="status">{t('В этом выпуске ничего не найдено.')}</p>}
          <div className="journey-results">
            {visible.map(({ document, status }) => (
              <article key={document.id}>
                <h2>{document.data.recipient || document.title}</h2>
                <p>
                  {document.id} · {STATUS_LABELS[status.state]}
                  {status.validUntil ? t(' · по {0}', status.validUntil) : ''}
                </p>
                {status.usedAt && (
                  <p>
                    {t('Использован:')} {new Date(status.usedAt).toLocaleString(getLocale())}
                  </p>
                )}
                <a href={publicUrl(document.id)} target="_blank" rel="noreferrer">
                  {t('Публичная страница ↗')}
                </a>{' '}
                <a href={pdfUrl(document.id)}>PDF ↓</a>{' '}
                <Link to={managementUrl(document.id, key).replace(window.location.origin, '')}>
                  {t('Изменить / продлить / отозвать')}
                </Link>
                {status.consumable && (
                  <button
                    disabled={busy || status.state !== 'ACTIVE'}
                    onClick={() => void consume(document.id)}
                  >
                    {document.kind === 'GIFT'
                      ? t('Подтвердить погашение')
                      : t('Подтвердить проход')}
                  </button>
                )}
                <JourneyStatusActions id={document.id} managementKey={key} status={status} onChange={next => {
                  setBatch(current => current ? { ...current, documents: current.documents.map(item => item.document.id === document.id ? { ...item, status: next } : item) } : current);
                }} />
                {status.state !== 'REVOKED' && <details open={previewId === document.id} onToggle={event => {
                  if (event.currentTarget.open) setPreviewId(document.id);
                  else if (previewId === document.id) setPreviewId('');
                }}><summary>{t('Preview document')}</summary>
                  {previewId === document.id && <JourneyCard document={document} />}
                </details>}
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
