import React from 'react';
import { EmailPreviewModal } from './EmailPreviewModal';
import { EmailSendModal } from './EmailSendModal';

export const EmailModals: React.FC = () => (
  <>
    <EmailPreviewModal />
    <EmailSendModal />
  </>
);