export { EmailModals } from './ui/EmailModals';
export { emailStore } from './state/EmailStore';
export type { EmailModal, EmailState } from './state/EmailStore';
export {
  fetchPreviewHtml,
  downloadEml,
  sendEmail,
  downloadBlob,
} from './api/EmailClient';
export type { EmailOptions, EmailItem, EmailRequest } from './api/EmailClient';