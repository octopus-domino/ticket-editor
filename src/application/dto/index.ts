/* ============================================================
   application/dto/index.ts

   DTO для внешних данных (импорт/экспорт JSON).
   Реэкспорт схем из shared, чтобы use-cases зависели от application/dto,
   а не напрямую от shared/schemas.
   ============================================================ */

export {
  DocumentSchema,
  SlideSchema,
  DataRootSchema,
  CanvasElementSchema,
  SCHEMA_LIMITS,
  validateDocument,
} from '@/shared/schemas';

export type {
  ValidatedDocument,
  ValidatedSlide,
  ValidatedCanvasElement,
  ValidatedDataRoot,
  ValidationResult,
} from '@/shared/schemas';