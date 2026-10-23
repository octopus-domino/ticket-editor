/* ============================================================
   shared/logger.ts
   NFR-OBS-03: structured logs {level, event, payload, ts}.
   NFR-OBS-02: в prod ошибки идут в Sentry (если провайдер задан).
   ============================================================ */

import { getSentry } from './sentry';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  event: string;
  payload?: Record<string, unknown>;
  ts: string;
}

const IS_DEV = import.meta.env.DEV;

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

function write(level: LogLevel, event: string, payload?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    event,
    payload,
    ts: new Date().toISOString(),
  };

  if (!IS_DEV && (level === 'debug' || level === 'info')) return;

  const prefix = `[${entry.ts}] [${level}] ${event}`;

  /* eslint-disable no-console */
  switch (level) {
    case 'error':
      console.error(prefix, entry);
      if (!IS_DEV) getSentry()?.captureMessage(event, { ...payload, level });
      break;
    case 'warn':
      console.warn(prefix, entry);
      break;
    case 'info':
      console.info(prefix, entry);
      break;
    case 'debug':
      console.debug(prefix, entry);
      break;
  }
  /* eslint-enable no-console */
}

export const logger = {
  debug(event: string, payload?: Record<string, unknown>): void {
    write('debug', event, payload);
  },

  info(event: string, payload?: Record<string, unknown>): void {
    write('info', event, payload);
  },

  warn(event: string, payload?: Record<string, unknown>): void {
    write('warn', event, payload);
  },

  error(event: string, error: unknown, payload?: Record<string, unknown>): void {
    const errorPayload = { ...payload, error: serializeError(error) };
    write('error', event, errorPayload);
    if (!IS_DEV) getSentry()?.captureException(error, { event, ...errorPayload });
  },
};