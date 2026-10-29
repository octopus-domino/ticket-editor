/* ============================================================
   domain/slide/operations.ts

   Единственный источник логики Slide. Чистые функции,
   работают с mutable-типами (см. shared/types). Не мутируют вход.

   ARC-LAYER-02, REG-S6.
   ============================================================ */

import type { Slide, CanvasElement, DocFormat, Orientation, Padding } from '@/shared/types';
import { DEFAULT_PADDING } from '@/shared/constants';
import { getFormatSize } from '@/shared/utils/formats';
import { generateId } from '@/shared/utils/id';

export { getFormatSize };

export function createSlide(
  n: number,
  format: DocFormat = 'a4',
  orientation: Orientation = 'portrait',
  customSize?: { w: number; h: number },
  padding: Padding = { ...DEFAULT_PADDING },
): Slide {
  const { w, h } = getFormatSize(format, orientation, customSize);
  return {
    id: generateId(),
    name: `Слайд ${n}`,
    format, orientation,
    width: w, height: h,
    background: '#ffffff',
    padding: { ...padding },
    elements: [],
  };
}

export function cloneSlide(source: Slide): Slide {
  return {
    ...source,
    id: generateId(),
    name: `${source.name} (копия)`,
    padding: { ...source.padding },
    elements: source.elements.map((el) => {
      const copy = JSON.parse(JSON.stringify(el)) as CanvasElement;
      copy.id = generateId();
      return copy;
    }),
  };
}

/**
 * @deprecated Оставлено для обратной совместимости. Смена формата больше
 * не рефлоует элементы — элементы остаются с абсолютными координатами
 * и размерами. Пользователь сам двигает и масштабирует при необходимости.
 * Не деструктивное поведение (Figma / Illustrator style).
 */
export function reflowElements(
  elements: CanvasElement[],
  _newWidth: number,
  _newHeight: number,
  _padding: Padding,
): CanvasElement[] {
  return elements;
}

/**
 * Смена формата: обновляет только размеры страницы.
 * Элементы НЕ трогаются — их абсолютные координаты и размеры сохраняются.
 * Если они вылезут за пределы новой страницы — это ожидаемо, пользователь
 * сам их переставит. Такой подход обратим: смена формата туда-обратно
 * возвращает исходный layout без потерь.
 */
export function changeFormat(
  slide: Slide,
  format: DocFormat,
  customSize?: { w: number; h: number },
): Slide {
  const { w, h } = getFormatSize(format, slide.orientation, customSize);
  return {
    ...slide,
    format,
    width: w,
    height: h,
  };
}

/**
 * Смена ориентации: аналогично смене формата — только размеры страницы.
 * Для custom-формата меняет местами width/height сохраняя их значения.
 */
export function changeOrientation(slide: Slide, orientation: Orientation): Slide {
  if (slide.orientation === orientation) return slide;
  const customSize = slide.format === 'custom' ? { w: slide.height, h: slide.width } : undefined;
  const { w, h } = getFormatSize(slide.format, orientation, customSize);
  return {
    ...slide,
    orientation,
    width: w,
    height: h,
  };
}

export function moveElementLayer(slide: Slide, elementId: string, direction: 1 | -1): Slide {
  const idx = slide.elements.findIndex((e) => e.id === elementId);
  if (idx < 0) return slide;
  const next = idx + direction;
  if (next < 0 || next >= slide.elements.length) return slide;
  const elements = slide.elements.slice();
  [elements[idx], elements[next]] = [elements[next], elements[idx]];
  return { ...slide, elements };
}