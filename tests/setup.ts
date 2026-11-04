// tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setLocale } from '@/shared/i18n';
setLocale('ru');

/* ─────────────────────────────────────────────
   1. RTL: размонтируем между тестами
   ───────────────────────────────────────────── */
afterEach(() => {
  cleanup();
  setLocale('ru');
});

/* ─────────────────────────────────────────────
   2. ResizeObserver — react-konva / TipTap
   ───────────────────────────────────────────── */
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  // некоторые версии передают callback — игнорируем
  constructor(_cb?: ResizeObserverCallback) {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

/* ─────────────────────────────────────────────
   3. matchMedia — useAutoFitZoom, темы
   ───────────────────────────────────────────── */
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

/* ─────────────────────────────────────────────
   4. URL.createObjectURL / revokeObjectURL
      (jsdom не реализует)
   ───────────────────────────────────────────── */
if (!URL.createObjectURL) {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:mock'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  });
}

/* ─────────────────────────────────────────────
   5. crypto.randomUUID — DocumentPersistence,
      ImportElements, ModelStore (jsdom < 24 не даёт)
   ───────────────────────────────────────────── */
if (!globalThis.crypto) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('node:crypto');
  globalThis.crypto = nodeCrypto.webcrypto as unknown as Crypto;
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }) as ReturnType<Crypto['randomUUID']>;
}

/* ─────────────────────────────────────────────
   6. structuredClone — materializeSlide/Element
   ───────────────────────────────────────────── */
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj));
  };
}

/* ─────────────────────────────────────────────
   7. HTMLCanvasElement.getContext — react-konva
      пытается измерить текст. jsdom возвращает
      null и падает в недрах Konva.
   ───────────────────────────────────────────── */
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  type: string,
  options?: CanvasRenderingContext2DSettings,
): RenderingContext | null {
  if (type === '2d') {
    // минимальный «пустой» 2D-контекст, чтобы measureText и fillRect
    // не валились; для тестов логики этого достаточно
    return {
      canvas: this,
      font: '',
      fillStyle: '#000',
      strokeStyle: '#000',
      lineWidth: 1,
      textAlign: 'start',
      textBaseline: 'alphabetic',
      measureText: (text: string) => ({ width: text.length * 8 }),
      fillRect: () => {},
      clearRect: () => {},
      fillText: () => {},
      strokeText: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      ellipse: () => {},
      rect: () => {},
      fill: () => {},
      stroke: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      setTransform: () => {},
      getImageData: () => ({
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0,
      } as ImageData),
      putImageData: () => {},
      drawImage: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 } as ImageData),
      createLinearGradient: () => ({ addColorStop: () => {} }) as CanvasGradient,
      createRadialGradient: () => ({ addColorStop: () => {} }) as CanvasGradient,
    } as unknown as CanvasRenderingContext2D;
  }
  return originalGetContext.call(this, type as '2d', options);
} as typeof HTMLCanvasElement.prototype.getContext;

/* ─────────────────────────────────────────────
   8. Изображения в jsdom не грузятся —
      подстраховка для <img>.onload
   ───────────────────────────────────────────── */
if (typeof globalThis.Image !== 'undefined') {
  Object.defineProperty(globalThis.Image.prototype, 'src', {
    configurable: true,
    set(value: string) {
      // эмулируем асинхронный onload
      Object.defineProperty(this, '_src', { value, writable: true });
      setTimeout(() => {
        Object.defineProperty(this, 'naturalWidth', { value: 100, configurable: true });
        Object.defineProperty(this, 'naturalHeight', { value: 100, configurable: true });
        Object.defineProperty(this, 'width', { value: 100, configurable: true });
        Object.defineProperty(this, 'height', { value: 100, configurable: true });
        if (typeof this.onload === 'function') (this.onload as () => void)();
      }, 0);
    },
    get() {
      return (this as unknown as { _src: string })._src ?? '';
    },
  });
}

/* ─────────────────────────────────────────────
   9. window.getComputedStyle — jsdom возвращает
      урезанный CSSStyleDeclaration, ломает TipTap
   ───────────────────────────────────────────── */
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = function (elt: Element) {
  return originalGetComputedStyle.call(window, elt);
};

/* ─────────────────────────────────────────────
   10. Подавить шумные console.warn от react-konva
       в тестах (не влияет на результат, но
       забивает вывод)
   ───────────────────────────────────────────── */
const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : '';
  if (
    first.includes('Konva') ||
    first.includes('React does not recognize') ||
    first.includes('findDOMNode is deprecated')
  ) {
    return;
  }
  origWarn(...args);
};
