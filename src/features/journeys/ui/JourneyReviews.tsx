import { useEffect, useState } from 'react';
import { t, getLocale } from '@/shared/i18n';
import { journeyRequest } from '../api/journeys';
import { downloadFile } from '@/shared/files/download';

interface Review {
  rating: number;
  message: string;
  createdAt: string;
}
interface Results {
  items: Review[];
  page: number;
  pages: number;
  total: number;
  average: number;
}
function responseKey(id: string) {
  const storage = `codoc:review:${id}`;
  try {
    const saved = localStorage.getItem(storage);
    if (saved) return saved;
    const key = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem(storage, key);
    return key;
  } catch {
    return crypto.randomUUID() + crypto.randomUUID();
  }
}
export function JourneyReviews({
  id,
  manage,
  managementKey,
  course = false,
}: {
  id: string;
  manage: boolean;
  managementKey: string;
  course?: boolean;
}) {
  const [key] = useState(() => responseKey(id));
  const [rating, setRating] = useState(5),
    [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [sent, setSent] = useState(false);
  const [page, setPage] = useState(0),
    [results, setResults] = useState<Results | null>(null);
  const headers = { 'X-Management-Key': managementKey };
  async function load(index: number) {
    return journeyRequest<Results>(
      `/api/journeys/${encodeURIComponent(id)}/reviews?page=${index}`,
      { headers },
    );
  }
  useEffect(() => {
    if (!manage) return;
    let active = true;
    void journeyRequest<Results>(`/api/journeys/${encodeURIComponent(id)}/reviews?page=${page}`, {
      headers: { 'X-Management-Key': managementKey },
    })
      .then((value) => {
        if (active) setResults(value);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [id, manage, managementKey, page]);
  async function submit() {
    setBusy(true);
    setError('');
    try {
      await journeyRequest(`/api/journeys/${encodeURIComponent(id)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, message, responseKey: key }),
      });
      setSent(true);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportCsv() {
    setBusy(true);
    setError('');
    try {
      const first = await load(0),
        items = [...first.items];
      for (let index = 1; index < first.pages; index++) items.push(...(await load(index)).items);
      const cell = (value: string) =>
        '"' + (/^\s*[=+@-]/.test(value) ? "'" : '') + value.replaceAll('"', '""') + '"';
      const rows = [
        ['rating', 'message', 'date'],
        ...items.map((item) => [String(item.rating), item.message, item.createdAt]),
      ];
      downloadFile(
        new Blob(['\uFEFF' + rows.map((row) => row.map(cell).join(';')).join('\r\n')], {
          type: 'text/csv;charset=utf-8',
        }),
        'reviews.csv',
      );
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="journey-reviews">
      <h2>{course ? t(manage ? 'Course reviews' : 'Rate this course') : manage ? t('Customer reviews') : t('Rate this product')}</h2>
      {manage ? (
        <>
          {results && (
            <p>
              {t('Reviews: {0}. Average rating: {1}', results.total, results.average.toFixed(1))}
            </p>
          )}
          <button
            type="button"
            className="journey-secondary"
            disabled={busy || !results?.total}
            onClick={() => void exportCsv()}
          >
            {t('Download reviews CSV')}
          </button>
          {results?.items.map((item, index) => (
            <article key={`${item.createdAt}-${index}`}>
              <strong>{item.rating} / 5</strong>
              <p>{item.message}</p>
              <small>{new Date(item.createdAt).toLocaleString(getLocale())}</small>
            </article>
          ))}
          {!!results && results.pages > 1 && (
            <nav aria-label={t('Pages')}>
              <button
                type="button"
                className="journey-secondary"
                disabled={busy || page === 0}
                onClick={() => setPage(page - 1)}
              >
                {t('Previous')}
              </button>
              <span>
                {page + 1} / {results.pages}
              </span>
              <button
                type="button"
                className="journey-secondary"
                disabled={busy || page + 1 >= results.pages}
                onClick={() => setPage(page + 1)}
              >
                {t('Next')}
              </button>
            </nav>
          )}
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label>
            {t('Rating')}
            <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('Your feedback')}
            <textarea
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </label>
          <button className="journey-primary" disabled={busy}>
            {sent ? t('Update review') : t('Send review')}
          </button>
          {sent && <p role="status">{t('Thank you! Your feedback has been saved.')}</p>}
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
