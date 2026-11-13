import { t } from '@/shared/i18n';
import { useEffect, useState, useRef } from 'react';
import { API_BASE } from '@/shared/api/client';
import { sanitizeSvg } from '@/lib/svg/sanitize';
import type { JourneyDocument, JourneyDefinition } from '../domain/definitions';
import { normalizedProposalData } from '../domain/proposal';
import { JourneyButton } from './JourneyButton';
import { lessons } from '../domain/schedule';

interface Artwork {
  pages: { width: number; height: number; svg: string }[];
}
type Document = Pick<JourneyDocument, 'kind' | 'title' | 'data'> & { id?: string };

const faces = [
  ['DejaVu Sans', 'normal', 400, 'sans'],
  ['DejaVu Sans', 'normal', 700, 'sans-bold'],
  ['DejaVu Serif', 'normal', 400, 'serif'],
  ['DejaVu Serif', 'italic', 400, 'serif-italic'],
  ['Marck Script', 'normal', 400, 'handwriting'],
  ['Zhi Mang Xing', 'normal', 400, 'handwriting-zh'],
] as const;
const fonts = faces
  .map(
    ([family, style, weight, file]) =>
      `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:block;src:url(${JSON.stringify(`${API_BASE}/api/journeys/fonts/${file}`)}) format("truetype");}`,
  )
  .join('');

/** Browser artwork is rendered from the server's PDF composition, never a separate HTML template. */
export function JourneyArtwork({
  document,
  definition,
}: {
  document: Document;
  definition?: JourneyDefinition;
}) {
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [retry, setRetry] = useState(0);
  const [selectedPage, setSelectedPage] = useState(0);
  const requested = useRef(false);
  const isProposal = document.kind === 'PROPOSAL';
  let data = document.data,
    valid = true;
  if (isProposal)
    try {
      data = normalizedProposalData(data);
    } catch {
      valid = false;
    }
  if (document.kind === 'SCHEDULE') valid = lessons(data.events ?? '[]').length > 0;
  const payload = JSON.stringify({
    id: document.id,
    kind: document.kind,
    title: document.title || (isProposal ? t('Коммерческое предложение') : t('Приглашение')),
    data,
    ...(definition ? { definition } : {}),
  });
  useEffect(() => {
    if (!valid) {
      setArtwork(null);
      setBusy(false);
      setError('');
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setError('');
    const timer = window.setTimeout(
      () => {
        requested.current = true;
        void fetch(`${API_BASE}/api/journeys/artwork`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        })
          .then(async (response) => {
            if (!response.ok)
              throw new Error(
                response.status === 429
                  ? t('Макет обновляется. Повторите чуть позже.')
                  : t('Не удалось загрузить макет. Повторите попытку.'),
              );
            return response.json() as Promise<Artwork>;
          })
          .then(async (value) => {
            if (!Array.isArray(value.pages) || !value.pages.length)
              throw new Error(t('Не удалось прочитать макет.'));
            await Promise.all(
              faces.filter(([family]) => value.pages.some(page => page.svg.includes(family))).map(
                async ([family, style, weight]) => {
                  const loaded = await window.document.fonts.load(
                    `${style} ${weight} 19px "${family}"`,
                  );
                  if (!loaded.length)
                    throw new Error(t('Не удалось загрузить шрифты документа. Повторите попытку.'));
                },
              ),
            );
            if (controller.signal.aborted) return;
            setArtwork({
              pages: value.pages.map((page) => ({ ...page, svg: sanitizeSvg(page.svg) })),
            });
            setBusy(false);
          })
          .catch((reason) => {
            if (!controller.signal.aborted) {
              setError((reason as Error).message);
              setBusy(false);
            }
          });
      },
      document.id && !requested.current ? 0 : 300,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [payload, retry, document.id, document.kind, isProposal, valid]);
  const currentPage = Math.min(selectedPage, (artwork?.pages.length ?? 1) - 1);
  const visiblePages = isProposal
    ? artwork?.pages.slice(currentPage, currentPage + 1)
    : artwork?.pages;
  return (
    <article
      className={`journey-card journey-artwork ${isProposal ? 'journey-artwork-proposal' : ''}`}
      aria-label={document.title}
      aria-busy={busy}
    >
      <style>{fonts}</style>
      <div className="journey-artwork-accessible">
        <h2>{document.title}</h2>
        <p>{document.data.recipient}</p>
        <p>{document.data.description}</p>
        <p>
          {document.data.date} {document.data.time}
        </p>
        <p>{document.data.location}</p>
        <p>{document.data.contact}</p>
      </div>
      {error ? (
        <div className="journey-artwork-notice" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            {t('Повторить загрузку макета')}
          </button>
        </div>
      ) : (
        <>
          {!valid && (
            <div className="journey-artwork-loading">
              <strong>{isProposal ? t('Ваше коммерческое предложение') : t('ПРЕДПРОСМОТР')}</strong>
              <p>
                {isProposal
                  ? t('Добавьте позиции и проверьте значения — здесь появится готовый макет.')
                  : t('Fill in the form')}
              </p>
            </div>
          )}
          {!artwork && valid && (
            <div className="journey-artwork-loading" role="status">
              {t('Готовим…')}
            </div>
          )}
          {isProposal && artwork && artwork.pages.length > 1 && (
            <nav className="proposal-paper-pagination" aria-label={t('Страницы документа')}>
              <JourneyButton
                disabled={currentPage === 0}
                onClick={() => setSelectedPage(currentPage - 1)}
              >
                ←
              </JourneyButton>
              <label>
                {t('Страница')}
                <select
                  value={currentPage}
                  onChange={(e) => setSelectedPage(Number(e.target.value))}
                >
                  {artwork.pages.map((_, index) => (
                    <option key={index} value={index}>
                      {index + 1} {t('из')} {artwork.pages.length}
                    </option>
                  ))}
                </select>
              </label>
              <JourneyButton
                disabled={currentPage >= artwork.pages.length - 1}
                onClick={() => setSelectedPage(currentPage + 1)}
              >
                →
              </JourneyButton>
            </nav>
          )}
          {visiblePages?.map((page, index) => (
            <div
              key={index}
              className="journey-artwork-page"
              aria-label={t('Страница {0}', index + 1)}
              style={{ maxWidth: page.width }}
              dangerouslySetInnerHTML={{ __html: page.svg }}
            />
          ))}
          {busy && artwork && (
            <span className="journey-artwork-updating" role="status">
              {t('Обновляем макет…')}
            </span>
          )}
        </>
      )}
    </article>
  );
}
