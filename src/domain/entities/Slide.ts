/* ============================================================
   domain/entities/Slide.ts

   Сущность Slide. Type-alias над shared/types.Slide.
   Поведение (create/changeFormat/reflow) — в domain/slide/operations.
   ============================================================ */

import type {
  Slide as SlideModel,
  DocFormat,
  Orientation,
  Padding,
} from '@/shared/types';

export type { Slide } from '@/shared/types';

/**
 * Параметры создания нового слайда.
 * Поведение — в `domain/slide/operations.createSlide`.
 */
export interface SlideProps {
  readonly format: DocFormat;
  readonly orientation: Orientation;
  readonly padding: Padding;
  readonly name?: string;
  readonly customSize?: { w: number; h: number };
}

/** Публичное имя сущности домена. */
export type SlideEntity = SlideModel;