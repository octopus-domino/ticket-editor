/* ============================================================
   presentation/hooks/useFocusTrap.ts
   NFR-A11Y-03: focus trap + Esc для модалок.
   ============================================================ */

import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), ' +
  '[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
): void {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const getFocusable = (): HTMLElement[] =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      );

    const previousActive = document.activeElement as HTMLElement | null;
    const first = getFocusable()[0];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
      previousFocusRestore(previousActive);
    };
  }, [ref, active, onEscape]);
}

function previousFocusRestore(el: HTMLElement | null): void {
  if (el && typeof el.focus === 'function') {
    try { el.focus(); } catch { /* ignore */ }
  }
}