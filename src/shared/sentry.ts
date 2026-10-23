/* ============================================================
   shared/sentry.ts
   NFR-OBS-02: prod-only Sentry. SDK подключается снаружи
   через `setSentryProvider`.
   ============================================================ */

export interface SentryContext {
  [key: string]: unknown;
}

export interface SentryLike {
  captureException(error: unknown, context?: SentryContext): void;
  captureMessage(message: string, context?: SentryContext): void;
}

let provider: SentryLike | null = null;

export function setSentryProvider(p: SentryLike | null): void {
  provider = p;
}

export function getSentry(): SentryLike | null {
  return provider;
}