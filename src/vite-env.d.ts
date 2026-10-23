/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DRAWIO_URL?: string;
  readonly VITE_EXPORT_API?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}