import { t } from '@/shared/i18n';
import { useState } from 'react';
export function JourneyShare({
  url,
  title = t('Документ в CoDoc'),
}: {
  url: string;
  title?: string;
}) {
  const [message, setMessage] = useState('');
  const subject = title.replace(/[\r\n]+/g, ' ').slice(0, 120);
  return (
    <div className="journey-share">
      <input
        aria-label={t('Публичная ссылка')}
        readOnly
        value={url}
        onFocus={(event) => event.target.select()}
      />
      <div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(url)
              .then(() => setMessage(t('Ссылка скопирована')))
              .catch(() => setMessage(t('Выделите ссылку и скопируйте её.')));
          }}
        >
          {t('Скопировать')}
        </button>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noreferrer"
        >
          Telegram ↗
        </a>
        <a href={`https://wa.me/?text=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
          WhatsApp ↗
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(subject + '\n\n' + url)}`}
          title={t('Откроется почтовое приложение. PDF доступен получателю по ссылке.')}
        >
          {t('Отправить по email ↗')}
        </a>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
