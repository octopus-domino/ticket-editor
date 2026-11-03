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
  });
  await ensureOk(res);
  return res.json() as Promise<EmailSendResult>;
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
