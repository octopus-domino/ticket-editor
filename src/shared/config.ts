// src/shared/config.ts
export const CONFIG = {
  DRAWIO_URL: import.meta.env.VITE_DRAWIO_URL || 'https://embed.diagrams.net/',
  // По умолчанию — относительный путь. Vite проксирует на бэкенд.
  EXPORT_API: import.meta.env.VITE_EXPORT_API || '/api/export',

  MAX_IMPORT_SIZE: 20 * 1024 * 1024,
  MAX_SLIDES: 500,
  MAX_ELEMENTS_PER_SLIDE: 2000,
} as const;