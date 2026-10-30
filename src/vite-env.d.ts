/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DRAWIO_URL?: string;
  readonly VITE_FEATURE_DIAGRAM?: string;
  readonly VITE_FEATURE_STAMP_EDITOR?: string;
  readonly VITE_FEATURE_NEW_LEFT_PANEL?: string;
  readonly VITE_FEATURE_NEW_CANVAS?: string;
  readonly VITE_FEATURE_SHOW_MIGRATION_BANNER?: string;
  readonly VITE_FEATURE_SHOW_ROLLBACK_BUTTON?: string;
  readonly VITE_BASE_URL?: string;
  readonly VITE_EXPORT_API?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}