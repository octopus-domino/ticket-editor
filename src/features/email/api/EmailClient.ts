import { t as __tr } from '@/shared/i18n';
import { authFetch } from '@/shared/api/client';
import type { Slide } from '@/shared/types';

export interface EmailOptions {
  from?: string;
  replyTo?: string;
  subject?: string;
}

export interface EmailItem {
  dataModelId?: string;
  inlineValues?: Record<string, unknown>;
  filenameOverride?: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject?: string;
}

export interface EmailRequest {
  requestId?: string;
  templateId?: string;
  inlineSlides?: Slide[];
  items: EmailItem[];
  email?: EmailOptions;
  filenamePattern?: string;
}

async function ensureOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res;
}

export async function fetchPreviewHtml(slide: Slide): Promise<string> {
  const res = await authFetch('/api/email/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slide }),
  });
  await ensureOk(res);
  return res.text();
}

export async function downloadEml(req: EmailRequest): Promise<{ blob: Blob; filename: string }> {
  const res = await authFetch('/api/email/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  await ensureOk(res);
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const m = /filename="([^"]+)"/.exec(disposition);
  return {
    blob: await res.blob(),
    filename: m ? m[1] : 'email.eml',
  };
}

export interface EmailSendResult {
  sent: number;
  failed: number;
  errors: { index: number; to: string; message: string }[];
}
export async function sendEmail(req: EmailRequest): Promise<EmailSendResult> {
  const res = await authFetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    // SMTP batches can exceed the shared API client's 30-second default.
    signal: AbortSignal.timeout(180_000),
  });
  await ensureOk(res);
  const result = (await res.json()) as EmailSendResult;
  if (
    !Number.isInteger(result.sent) ||
    result.sent < 0 ||
    !Number.isInteger(result.failed) ||
    result.failed < 0 ||
    result.sent + result.failed !== req.items.length ||
    !Array.isArray(result.errors) ||
    result.errors.length !== result.failed
  ) {
    throw new Error(
      __tr("Сервер вернул некорректный результат отправки. Проверьте статус перед повторной попыткой."),
    );
  }
  return result;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
