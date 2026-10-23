/* ============================================================
   shared/utils/formats.ts

   Чистая функция: размер слайда по формату + ориентации.
   Раньше жила в domain/slide/operations.ts, но lib импортировал
   её → lib → domain нарушение ARC-LAYER.
   ============================================================ */

import { FORMATS } from '../constants';
import type { DocFormat, Orientation } from '../types';

export interface FormatSize {
  readonly w: number;
  readonly h: number;
}

export function getFormatSize(
  format: DocFormat,
  orientation: Orientation,
  customSize?: FormatSize,
): FormatSize {
  const base =
    format === 'custom' && customSize
      ? customSize
      : FORMATS[format]?.portrait ?? FORMATS.a4.portrait;

  return orientation === 'portrait'
    ? { w: base.w, h: base.h }
    : { w: base.h, h: base.w };
}