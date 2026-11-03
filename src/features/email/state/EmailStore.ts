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
  constructor() {
    super(INITIAL);
  }

  async openPreview(slides: Slide[]): Promise<void> {
    if (slides.length === 0) {
      this.setState((s) => ({ ...s, modal: 'preview', previewHtml: null,
        previewError: 'Нет слайдов', slides }));
      return;
    }
    this.setState((s) => ({
      ...s, modal: 'preview', slides,
      previewHtml: null, previewLoading: true, previewError: null,
    }));
    try {
      const html = await fetchPreviewHtml(slides[0]);
      this.setState((s) => ({ ...s, previewHtml: html, previewLoading: false }));
    } catch (e) {
      this.setState((s) => ({
        ...s, previewLoading: false, previewError: (e as Error).message,
      }));
    }
  }

  openSend(slides: Slide[]): void {
    this.setState((s) => ({
      ...s, modal: 'send', slides,
      sendError: null, sendDone: false,
    }));
  }

  close(): void {
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
    this.setState((s) => ({ ...s, sendBusy: true, sendError: null, sendDone: false }));
    try {
      await sendEmail(req);
      this.setState((s) => ({ ...s, sendBusy: false, sendDone: true }));
    } catch (e) {
      this.setState((s) => ({
        ...s, sendBusy: false, sendError: (e as Error).message,
      }));
    }
  }
}

export const emailStore = new EmailStore();