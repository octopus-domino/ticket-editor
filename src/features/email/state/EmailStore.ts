import { t as __tr } from '@/shared/i18n';
import { SimpleStore } from '@/shared/store/store';
import type { Slide } from '@/shared/types';
import {
  fetchPreviewHtml,
  downloadEml,
  sendEmail,
  downloadBlob,
  type EmailRequest,
} from '../api/EmailClient';

export type EmailModal = null | 'preview' | 'send';

export interface EmailState {
  modal: EmailModal;
  previewHtml: string | null;
  previewLoading: boolean;
  previewError: string | null;
  sendBusy: boolean;
  sendError: string | null;
  sendDone: boolean;
  /** Слайды, для которых открыт модал (materialized с текущей моделью). */
  slides: Slide[] | null;
}

const INITIAL: EmailState = {
  modal: null,
  previewHtml: null,
  previewLoading: false,
  previewError: null,
  sendBusy: false,
  sendError: null,
  sendDone: false,
  slides: null,
};

export class EmailStore extends SimpleStore<EmailState> {
  private requestId = crypto.randomUUID();
  private requestBody: string | null = null;
  private version = 0;
  constructor() {
    super(INITIAL);
  }

  async openPreview(slides: Slide[]): Promise<void> {
    const version = ++this.version;
    if (slides.length === 0) {
      this.setState((s) => ({
        ...s,
        modal: 'preview',
        previewHtml: null,
        previewError: __tr("Нет слайдов"),
        slides,
      }));
      return;
    }
    this.setState((s) => ({
      ...s,
      modal: 'preview',
      slides,
      previewHtml: null,
      previewLoading: true,
      previewError: null,
    }));
    try {
      const html = await fetchPreviewHtml(slides[0]);
      if (version !== this.version) return;
      this.setState((s) => ({
        ...s,
        previewHtml: html,
        previewLoading: false,
      }));
    } catch (e) {
      if (version !== this.version) return;
      this.setState((s) => ({
        ...s,
        previewLoading: false,
        previewError: (e as Error).message,
      }));
    }
  }

  openSend(slides: Slide[]): void {
    this.version++;
    this.requestBody = null;
    this.setState((s) => ({
      ...s,
      modal: 'send',
      slides,
      sendError: null,
      sendDone: false,
    }));
  }

  close(): void {
    this.version++;
    this.setState(() => ({ ...INITIAL }));
  }

  async downloadEml(req: EmailRequest): Promise<void> {
    try {
      const { blob, filename } = await downloadEml(req);
      downloadBlob(blob, filename);
    } catch (e) {
      this.setState((s) => ({ ...s, previewError: (e as Error).message }));
    }
  }

  async send(req: EmailRequest): Promise<void> {
    if (this.getState().sendBusy) return;
    const version = this.version;
    this.setState((s) => ({
      ...s,
      sendBusy: true,
      sendError: null,
      sendDone: false,
    }));
    try {
      const body = JSON.stringify(req);
      if (body !== this.requestBody) {
        this.requestId = crypto.randomUUID();
        this.requestBody = body;
      }
      const result = await sendEmail({ ...req, requestId: this.requestId });
      if (version !== this.version) return;
      this.setState((s) => ({
        ...s,
        sendBusy: false,
        sendDone: result.failed === 0,
        sendError: result.failed
          ? __tr("Передано серверу: {0}. Не отправлено: {1}. {2}", result.sent, result.failed, result.errors.map((error) => `${error.to}: ${error.message}`).join('; '))
          : null,
      }));
    } catch (e) {
      if (version !== this.version) return;
      this.setState((s) => ({
        ...s,
        sendBusy: false,
        sendError: (e as Error).message,
      }));
    }
  }
}

export const emailStore = new EmailStore();
