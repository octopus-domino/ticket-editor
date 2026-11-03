import { setSentryProvider } from '@/shared/sentry';

/** Optional production adapter; no telemetry or SDK download without an explicit DSN. */
export async function configureTelemetry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!import.meta.env.PROD || !dsn) return;
  const sentry = await import('@sentry/react');
  sentry.init({
    dsn,
    release: import.meta.env.VITE_RELEASE as string | undefined,
    tracesSampleRate: 0.1,
    beforeSend: (event) => {
      delete event.user;
      return event;
    },
  });
  setSentryProvider({
    captureException: (error, context) => {
      sentry.captureException(error, { extra: context });
    },
    captureMessage: (message, context) => {
      sentry.captureMessage(message, { extra: context });
    },
  });
}
