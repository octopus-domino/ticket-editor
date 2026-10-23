// src/shared/config.ts
/* ============================================================
   config.ts
   NFR-SEC-08: Все URL и лимиты из env.
   ============================================================ */

export const CONFIG = {
  DRAWIO_URL: import.meta.env.VITE_DRAWIO_URL || 'https://embed.diagrams.net/',
  // Fallback — локальный сервер экспорта (как в старом проекте).
  // В проде задаётся через VITE_EXPORT_API.
  EXPORT_API: import.meta.env.VITE_EXPORT_API || 'http://localhost:8080/api/export',

  // NFR-SEC-03: Лимиты импорта
  MAX_IMPORT_SIZE: 20 * 1024 * 1024, // 20 MB
  MAX_SLIDES: 500,
  MAX_ELEMENTS_PER_SLIDE: 2000,
} as const;