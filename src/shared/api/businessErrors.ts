import { t } from '@/shared/i18n/core';
/** Human-facing explanation. The unmodified server diagnostic stays in the response details. */
export function businessError(raw: string, status = 400): string {
  const index = /index[=:]\s*(\d+)/i.exec(raw);
  const prefix = index ? t('Document {0}:', Number(index[1]) + 1) + ' ' : '';
  if (/xlink:href|image source is missing|invalid embedded svg|unsupported.*image/i.test(raw))
    return (
      prefix +
      t(
        'An image in the document is missing or cannot be read. Open Images, replace it and generate the document again.',
      )
    );
  if (/light-dark|fill.*function values|invalid css/i.test(raw))
    return (
      prefix +
      t(
        'A diagram uses a color format that cannot be printed. Open the diagram, choose solid colors and export again.',
      )
    );
  const field = /([\w.[\]]+): (?:required field is empty|required array field is empty)/i.exec(raw);
  if (field)
    return prefix + t('Fill in the required field {0} in Data, then generate again.', field[1]);
  if (/schema.*(?:used|referenc)|delete.*schema.*(?:model|template)/i.test(raw))
    return t(
      'This schema is used by data sets or documents. Detach it or remove the linked records first.',
    );
  if (/preview expired/i.test(raw))
    return t('The source preview has expired. Load it again before importing.');
  if (/source request failed|source request rejected/i.test(raw))
    return t(
      'Could not read the source. Check its address, access credentials and JSON export settings.',
    );
  if (/source origin is not allowed/i.test(raw))
    return t(
      'This source address is not allowed. Ask the administrator to allow its exact origin.',
    );
  if (/all items failed|pdf.?a.*render failed|pdf.*transcod/i.test(raw))
    return (
      prefix +
      t(
        'The document could not be printed. Check its images, diagrams and required data, then try again.',
      )
    );
  if (status === 401)
    return t('Your session has ended. Sign in again; keep a local copy of your work.');
  if (status === 429)
    return t('Too many requests are running. Wait a little and try again, or split the batch.');
  if (status === 413)
    return t('The file or batch is too large. Reduce its size or split it into smaller parts.');
  if (status >= 500)
    return t(
      'The service could not complete the action. Your document is still open. Keep a local copy and try again.',
    );
  return raw;
}
export async function describeApiFailure(response: Response): Promise<Response> {
  if (response.ok) return response;
  try {
    const payload = (await response.clone().json()) as Record<string, unknown>;
    if (typeof payload.error !== 'string') return response;
    const raw = payload.error;
    const headers = new Headers(response.headers);
    headers.delete('Content-Length');
    headers.delete('Content-Encoding');
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(
      JSON.stringify({
        ...payload,
        error: businessError(raw, response.status),
        details: payload.details ?? raw,
      }),
      { status: response.status, statusText: response.statusText, headers },
    );
  } catch {
    return response;
  }
}
