import { LANGUAGES, useLocale, changeLanguage, t, type Locale } from './index';
import { useState } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <label className="language-switcher">
      <span aria-hidden="true">🌐</span>
      <select
        aria-label={t('Language')}
        disabled={busy}
        value={locale}
        onChange={(event) => {
          setBusy(true);
          setError('');
          void changeLanguage(event.target.value as Locale).catch((reason: Error) => {
            setError(reason.message);
            setBusy(false);
          });
        }}
      >
        {LANGUAGES.map(([id, name]) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </select>
      {error && <span role="alert">{error}</span>}
    </label>
  );
}
