import type { CanvasElement, Slide } from '@/shared/types';
import { getByPath } from './path';
import { escapeXml } from './svg/escape';
import type { DocumentBinding } from '@/shared/types/document';
import { fillArrayTable } from './arrayTable';

/** Resolve a rendering copy. Substitutions in HTML are escaped text, never markup. */
export function materializeElement(
  element: CanvasElement,
  values: Record<string, unknown>,
  bindings: readonly DocumentBinding[] = [],
): CanvasElement {
  const aliases = new Map<string, string>();
  for (const binding of bindings) {
    if (binding.elementId !== element.id || binding.status === 'ignored') continue;
    const path = binding.placeholder.replace(/^\{\{|\}\}$/g, '').trim();
    if (path) aliases.set(path, binding.schemaPath);
  }
  function read(path: string): unknown {
    let source = path;
    let length = 0;
    for (const [alias, schemaPath] of aliases) {
      if (alias.length <= length || (path !== alias && !path.startsWith(alias + '.') && !path.startsWith(alias + '['))) continue;
      source = schemaPath + path.slice(alias.length);
      length = alias.length;
    }
    return getByPath(values, source);
  }
  const copy = structuredClone(element);
  const replace = (text: string | undefined, html = false, lookup = read) =>
    (text ?? '').replace(/\{\{\s*([\w.[\]]+)\s*\}\}/g, (_token, path: string) => {
      const value = lookup(path);
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
    const value = read(copy.fieldPath);
    copy.sample = value == null ? '' : String(value);
  }
  if (copy.type === 'table' && !fillArrayTable(copy, read, (cell, lookup) => replace(cell, false, lookup))) {
    copy.data = copy.data.map(row => row.map(cell => replace(cell)));
  }
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
