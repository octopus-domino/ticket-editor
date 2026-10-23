/* Минимальный setup для jsdom: не тянем реальные Konva/DOM-зависимости. */
import { vi } from 'vitest';

// jsdom не реализует ResizeObserver — заглушим.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  (window as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
    ResizeObserverStub;
}

// localStorage в jsdom иногда отсутствует — заглушим.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>();
  const stub = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
  Object.defineProperty(window, 'localStorage', { value: stub });
}

// Глушим console.warn в тестах, чтобы не засорять отчёт.
vi.spyOn(console, 'warn').mockImplementation(() => {});