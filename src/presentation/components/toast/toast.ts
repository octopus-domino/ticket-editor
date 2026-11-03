import { toastStore } from './toastStore';
import type { Toast, ToastVariant } from './types';

/**
 * Stable, imperative API — safe to import anywhere (no hooks, no context).
 * This is the only place that mutates toastStore, so consumers never
 * need to know about its internals (DIP).
 */
const DEFAULT_DURATION_MS: Record<ToastVariant, number> = {
  info: 4000,
  success: 4000,
  warn: 6000,
  error: 8000,
};

let nextId = 0;
const timers = new Map<string, number>();

function add(
  variant: ToastVariant,
  title: string,
  description?: string,
  durationMs?: number,
): string {
  const id = `toast-${++nextId}`;
  const toast: Toast = {
    id,
    variant,
    title,
    description,
    durationMs: durationMs ?? DEFAULT_DURATION_MS[variant],
  };

  toastStore.setState((s) => ({ items: [...s.items, toast] }));

  const ttl = toast.durationMs ?? 4000;
  if (ttl > 0) {
    const timer = window.setTimeout(() => dismiss(id), ttl);
    timers.set(id, timer);
  }

  return id;
}

function dismiss(id: string): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  toastStore.setState((s) => ({
    items: s.items.filter((t) => t.id !== id),
  }));
}

function dismissAll(): void {
  for (const t of timers.values()) window.clearTimeout(t);
  timers.clear();
  toastStore.setState(() => ({ items: [] }));
}

export const toast = {
  info: (title: string, description?: string, durationMs?: number): string =>
    add('info', title, description, durationMs),
  success: (title: string, description?: string, durationMs?: number): string =>
    add('success', title, description, durationMs),
  warn: (title: string, description?: string, durationMs?: number): string =>
    add('warn', title, description, durationMs),
  error: (title: string, description?: string, durationMs?: number): string =>
    add('error', title, description, durationMs),
  dismiss,
  dismissAll,
};

export type ToastApi = typeof toast;