/* ============================================================
   application/ports/index.ts

   ARC-DI-03, ARC-DI-04: use-cases получают зависимости через
   аргументы, не через module-level imports.
   ============================================================ */

/** Ключ-значение хранилище (localStorage, IndexedDB, in-memory). */
export interface KeyValueStoragePort {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** HTTP-клиент. */
export interface HttpClientPort {
  get(url: string, init?: RequestInit): Promise<Response>;
  post(url: string, body: unknown, init?: RequestInit): Promise<Response>;
}

/** Репозиторий документа (persistence). */
export interface DocumentRepositoryPort {
  load(): Promise<unknown | null>;
  save(document: unknown): Promise<void>;
  clear(): Promise<void>;
}

/** Экспорт в серверный API. */
export interface ExportApiPort {
  exportSvg(slideJson: unknown): Promise<Blob>;
  exportPdfa(slideJson: unknown): Promise<Blob>;
}

/** Логгер (structured logs, NFR-OBS-03). */
export interface LoggerPort {
  debug(event: string, payload?: Record<string, unknown>): void;
  info(event: string, payload?: Record<string, unknown>): void;
  warn(event: string, payload?: Record<string, unknown>): void;
  error(event: string, error: unknown, payload?: Record<string, unknown>): void;
}