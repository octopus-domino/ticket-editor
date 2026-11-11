import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { registerLanguageSave } from '@/shared/i18n';

/** Save only for the language reload, in this tab; never persist a visitor's form on the server. */
export function useLanguageDraft<T>(
  key: string,
  initial: T | (() => T),
  restore?: (value: T) => T,
): [T, Dispatch<SetStateAction<T>>] {
  const storageKey = `codoc:language-draft:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const entry = JSON.parse(raw) as { savedAt: number; value: T };
        if (Date.now() - entry.savedAt < 60000) return restore ? restore(entry.value) : entry.value;
      }
    } catch {
      /* Storage is optional. */
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });
  const current = useRef(value);
  current.current = value;
  useEffect(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Storage is optional. */
    }
  }, [storageKey]);
  useEffect(
    () =>
      registerLanguageSave(async () => {
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({ savedAt: Date.now(), value: current.current }),
          );
        } catch {
          /* The form can still change language without browser storage. */
        }
      }),
    [storageKey],
  );
  return [value, setValue];
}
