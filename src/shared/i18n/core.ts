import { MESSAGE_CATALOGS } from './messages';

export const LANGUAGES = [
  ['ru', 'Русский'],
  ['en', 'English'],
  ['zh', '中文'],
  ['pl', 'Polski'],
  ['it', 'Italiano'],
  ['es', 'Español'],
  ['nl', 'Nederlands'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
] as const;
export type Locale = (typeof LANGUAGES)[number][0];
const supported = new Set<string>(LANGUAGES.map(([id]) => id));
export function detectLocale(preferences: readonly string[]): Locale {
  for (const preference of preferences) {
    const language = preference.toLowerCase().split(/[-_]/)[0];
    if (supported.has(language)) return language as Locale;
  }
  return 'en';
}
function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru';
  try {
    const saved = localStorage.getItem('codoc:language');
    if (saved && supported.has(saved)) return saved as Locale;
  } catch {
    /* Storage is optional. */
  }
  return detectLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
}
let locale = initialLocale();
const listeners = new Set<() => void>();
const pendingSaves = new Set<() => Promise<unknown>>();
export function registerLanguageSave(save: () => Promise<unknown>) {
  pendingSaves.add(save);
  return () => {
    pendingSaves.delete(save);
  };
}
export async function changeLanguage(next: Locale) {
  await Promise.all(Array.from(pendingSaves, (save) => save()));
  setLocale(next);
  window.location.reload();
}
type Dictionary = Record<string, string>;
const dictionaries: Partial<Record<Locale, Dictionary>> = MESSAGE_CATALOGS;
const normalized = (text: string) =>
  text
    .trim()
    .replace(/^[^\p{L}\p{N}{]+|[^\p{L}\p{N}}]+$/gu, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
const indexes: Partial<Record<Locale, Map<string, string>>> = {};
function indexMessages(language: Locale) {
  // Prefer complete labels to fragments such as "Layers (" or "shapes ·".
  const entries = Object.entries(dictionaries[language] ?? {}).sort(([left], [right]) => {
    const complete = (key: string) => (normalized(key) === key.trim().toLowerCase() ? 1 : 0);
    return complete(left) - complete(right);
  });
  indexes[language] = new Map(entries.map(([key, value]) => [normalized(key), value]));
}
LANGUAGES.forEach(([language]) => indexMessages(language));
export function registerMessages(language: Locale, messages: Dictionary) {
  dictionaries[language] = { ...dictionaries[language], ...messages };
  indexMessages(language);
}
export function getLocale(): Locale {
  return locale;
}
/** Recognize generated placeholder labels even after the user switches language. */
export function isTranslation(source: string, value: string): boolean {
  return (
    source === value || LANGUAGES.some(([language]) => dictionaries[language]?.[source] === value)
  );
}
export function setLocale(next: Locale): void {
  if (!supported.has(next)) return;
  locale = next;
  try {
    localStorage.setItem('codoc:language', next);
  } catch {
    /* Optional preference. */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = next;
  listeners.forEach((notify) => notify());
}
export function t(source: string, ...values: unknown[]): string {
  let result = dictionaries[locale]?.[source];
  if (!result) {
    const key = normalized(source),
      translated = indexes[locale]?.get(key) ?? indexes.en?.get(key);
    if (translated) {
      const prefix = source.match(/^[^\p{L}\p{N}{]*/u)?.[0] ?? '';
      const suffix = source.match(/[^\p{L}\p{N}}]*$/u)?.[0] ?? '';
      result = prefix + translated + suffix;
    }
  }
  result ??= dictionaries.en?.[source] ?? source;
  return values.reduce<string>(
    (message, value, index) => message.replaceAll(`{${index}}`, String(value)),
    result,
  );
}

export function subscribeLocale(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}
