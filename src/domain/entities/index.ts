/**
 * Domain Entities
 * Core business objects with behavior
 *
 * Было: `export { Slide } from './Slide'` — файла не было, tsc падал.
 * Стало: type-only export существующего файла.
 */

export type { Slide, SlideEntity, SlideProps } from './Slide';