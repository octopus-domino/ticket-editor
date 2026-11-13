import { t } from '@/shared/i18n';

/** Endpoint names are stable; only intermediate visits have stop numbers. */
export function routePointCaption(index: number, count: number): string {
  if (index === 0) return t('Route start');
  if (index === count - 1) return t('Route end');
  return `${t('Stop')} ${index}`;
}
