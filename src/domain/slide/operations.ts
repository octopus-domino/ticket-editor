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

export function reflowElements(
  elements: CanvasElement[],
  newWidth: number,
  newHeight: number,
  padding: Padding,
): CanvasElement[] {
  const printW = Math.max(0, newWidth - padding.left - padding.right);
  const printH = Math.max(0, newHeight - padding.top - padding.bottom);

  return elements.map((el) => {
    if (el.type === 'footer') {
      return { ...el, x: padding.left, y: newHeight - padding.bottom - el.height, width: printW };
    }
    if (el.type === 'placeholder') {
      return { ...el, x: padding.left, y: padding.top, width: printW, height: printH };
    }
    return {
      ...el,
      x: Math.min(el.x, Math.max(0, newWidth - el.width)),
      y: Math.min(el.y, Math.max(0, newHeight - el.height)),
      width: Math.min(el.width, printW),
    };
  });
}

export function changeFormat(
  slide: Slide,
  format: DocFormat,
  customSize?: { w: number; h: number },
): Slide {
  const { w, h } = getFormatSize(format, slide.orientation, customSize);
  return {
    ...slide,
    format, width: w, height: h,
    elements: reflowElements(slide.elements, w, h, slide.padding),
  };
}

export function changeOrientation(slide: Slide, orientation: Orientation): Slide {
  if (slide.orientation === orientation) return slide;
  const customSize = slide.format === 'custom' ? { w: slide.height, h: slide.width } : undefined;
  const { w, h } = getFormatSize(slide.format, orientation, customSize);
  return {
    ...slide,
    orientation, width: w, height: h,
    elements: reflowElements(slide.elements, w, h, slide.padding),
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