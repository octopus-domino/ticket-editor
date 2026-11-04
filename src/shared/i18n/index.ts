import { useSyncExternalStore } from 'react';
import { subscribeLocale, getLocale, type Locale } from './core';
export * from './core';

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, () => 'ru');
}
