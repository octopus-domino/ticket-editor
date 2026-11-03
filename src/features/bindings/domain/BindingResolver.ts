import type { Slide } from '@/shared/types';
import type { Binding } from './Binding';

const PH_RE = /\{\{\s*([\w.[\]]+)\s*\}\}/g;
const ARRAY_PH_RE = /\{\{\s*([\w.]+)\[\d+\]/g;

/**
 * Обходит слайды и собирает все точки вставки.
 *  - PlaceholderElement.fieldPath
 *  - TextElement.text / .html      — каждое {{...}}
 *  - ShapeElement.text             — каждое {{...}}
 *  - FooterElement.text / .html    — каждое {{...}}
 *  - ImageElement.src              — каждое {{...}}
 *  - TableElement.data[i][j]       — по базе массива из {{base[N].field}}
 */
export function resolveBindings(
  slides: readonly Slide[],
  overrides: readonly Binding[] = [],
): Binding[] {
  const out = new Map<string, Binding>();

  const add = (
    elementId: string,
    label: string,
    placeholder: string,
    schemaPath: string,
    source: Binding['source'],
  ): void => {
    const key = `${elementId}|${placeholder}`;
    if (out.has(key)) return;
    out.set(key, {
      elementId,
      elementLabel: label,
      placeholder,
      schemaPath,
      source,
      status: 'linked',
      inferred: schemaPath,
    });
  };

  const scanSources = (elementId: string, label: string, sources: (string | undefined)[]): void => {
    for (const source of sources) {
      if (typeof source !== 'string' || !source) continue;
      PH_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = PH_RE.exec(source)) !== null) {
        add(elementId, label, m[0], m[1], 'auto');
      }
    }
  };

  for (const slide of slides) {
    for (const el of slide.elements) {
      if (el.type === 'placeholder') {
        if (!el.fieldPath) continue;
        add(el.id, 'Placeholder', el.fieldPath, el.fieldPath, 'legacy');
        continue;
      }

      if (el.type === 'text') {
        scanSources(el.id, 'Text', [el.text, el.html]);
        continue;
      }

      if (el.type === 'shape') {
        scanSources(el.id, `Фигура (${el.shape ?? 'shape'})`, [el.text]);
        continue;
      }

      if (el.type === 'footer') {
        scanSources(el.id, 'Футер', [el.text, el.html]);
        continue;
      }

      if (el.type === 'image') {
        scanSources(el.id, 'Image', [el.src]);
        continue;
      }

      if (el.type === 'table') {
        // Одна связь на каждый уникальный базовый путь массива.
        // Пример ячейки: {{catalog.items[0].name}} → база "catalog.items".
        const bases = new Set<string>();
        for (const row of el.data ?? []) {
          for (const cell of row ?? []) {
            if (typeof cell !== 'string' || !cell) continue;
            ARRAY_PH_RE.lastIndex = 0;
            let m: RegExpExecArray | null;
            while ((m = ARRAY_PH_RE.exec(cell)) !== null) {
              bases.add(m[1]);
            }
          }
        }
        for (const base of bases) {
          add(el.id, `Таблица (${base})`, base, base, 'auto');
        }
        continue;
      }
    }
  }
  for (const binding of overrides) {
    const key = `${binding.elementId}|${binding.placeholder}`;
    if (out.has(key)) out.set(key, binding);
  }
  const elements = new Map(
    slides.flatMap((slide) => slide.elements.map((element) => [element.id, element] as const)),
  );
  return Array.from(out.values()).map((binding) => {
    const element = elements.get(binding.elementId);
    const expectedType =
      element?.type === 'image'
        ? 'image'
        : element?.type === 'table'
          ? 'array'
          : element?.type === 'placeholder'
            ? element.fieldType
            : 'string';
    return { ...binding, expectedType };
  });
}
