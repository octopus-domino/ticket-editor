import { t, getLocale } from '@/shared/i18n';
export function journeyError(status: number, raw?: string): string {
  if (status === 409) return t('The document has changed. Reload and try again.');
  if (status === 429) return t('Too many requests. Please try again later.');
  if (status === 401) return t('Sign in');
  if (status === 403) return t('Access denied');
  if (status === 404) return t('Not found');
  const translated = raw ? t(raw) : '';
  if (raw && translated !== raw) return translated;
  if (raw && getLocale() === 'ru' && /[А-Яа-я]/.test(raw)) return raw;
  return t('Check the form and try again.');
}
