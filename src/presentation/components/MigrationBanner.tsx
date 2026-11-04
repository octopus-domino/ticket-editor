import { t as __tr } from '@/shared/i18n';
/* ============================================================
   presentation/components/MigrationBanner.tsx
   MIG-UI-01, MIG-UI-02. Скромный баннер с обратной связью + rollback.
   ============================================================ */

import React, { useState } from 'react';

interface Props {
  reportUrl?: string;
  rollbackUrl?: string;
}

const DISMISS_KEY = 'ticket-editor:banner-dismissed';

export const MigrationBanner: React.FC<Props> = ({
  reportUrl = 'mailto:support@example.com?subject=ticket-editor%20feedback',
  rollbackUrl,
}) => {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) !== '1';
    } catch {
      return true;
    }
  });

  if (!visible) return null;

  const dismiss = (): void => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setVisible(false);
  };

  return (
    <div className="migration-banner" role="status" aria-live="polite">
      <span>
        {__tr("Вы используете новую версию редактора.")}{' '}
        <a href={reportUrl} target="_blank" rel="noreferrer">{__tr("Сообщить о проблеме →")}</a>
      </span>
      {rollbackUrl && (
        <a href={rollbackUrl} className="migration-banner__rollback">{__tr("Старая версия")}</a>
      )}
      <button
        type="button"
        className="migration-banner__close"
        onClick={dismiss}
        aria-label={__tr("Скрыть")}
      >×</button>
    </div>
  );
};