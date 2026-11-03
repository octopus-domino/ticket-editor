import type { CanvasElement, Slide } from '@/shared/types';
import { getByPath } from './path';
import { escapeXml } from './svg/escape';
import type { DocumentBinding } from '@/shared/types/document';

/** Resolve a rendering copy. Substitutions in HTML are escaped text, never markup. */
export function materializeElement(
  element: CanvasElement,
  values: Record<string, unknown>,
  bindings: readonly DocumentBinding[] = [],
): CanvasElement {
  values = { ...values };
  for (const binding of bindings) {
    if (binding.elementId !== element.id || binding.status === 'ignored') continue;
    const path = binding.placeholder.replace(/^\{\{|\}\}$/g, '').trim();
    const value = getByPath(values, binding.schemaPath);
    values[path] = value;
  }
  const copy = structuredClone(element);
  const replace = (text: string | undefined, html = false) =>
    (text ?? '').replace(/\{\{\s*([\w.[\]]+)\s*\}\}/g, (_token, path: string) => {
      const value = getByPath(values, path);
      const textValue = value == null ? '' : String(value);
      return html ? escapeXml(textValue) : textValue;
    });
  if (
    copy.type === 'text' ||
    copy.type === 'shape' ||
    copy.type === 'footer' ||
    copy.type === 'qr'
  ) {
    copy.text = replace(copy.text);
    if (copy.text.trim() === 'Введите текст') copy.text = '';
    if ('html' in copy && typeof copy.html === 'string') copy.html = replace(copy.html, true);
  }
  if (copy.type === 'image') copy.src = replace(copy.src);
  if (copy.type === 'placeholder') {
    const value = getByPath(values, copy.fieldPath);
    copy.sample = value == null ? '' : String(value);
  }
  if (copy.type === 'table') copy.data = copy.data.map((row) => row.map((cell) => replace(cell)));
  if (copy.type === 'stamp') {
    copy.texts = copy.texts?.map((text) => ({
      ...text,
      text: replace(text.text),
    }));
    copy.images = copy.images?.map((image) => ({
      ...image,
      src: replace(image.src),
    }));
  }
  if (copy.type === 'chart' && copy.dataPath) {
    const data = getByPath(values, copy.dataPath);
    if (Array.isArray(data))
      copy.values = data
        .map((row: unknown) =>
          Number(
            copy.valueField && row && typeof row === 'object'
              ? getByPath(row, copy.valueField)
              : row,
          ),
        )
        .filter(Number.isFinite);
  }
  return copy;
}
export function materializeSlide(
  slide: Slide,
  values: Record<string, unknown>,
  bindings: readonly DocumentBinding[] = [],
): Slide {
  return {
    ...structuredClone(slide),
    elements: slide.elements.map((element) => materializeElement(element, values, bindings)),
  };
}
