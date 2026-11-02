import { TEXT_PLACEHOLDER } from '@/shared/constants';
import { resolveWithValues, getByPath } from '@/lib/modelBinding';

/**
 * Возвращает глубокую копию слайда, в которой все {{...}} заменены значениями.
 * Оригинал не мутируется — на канве по-прежнему остаётся шаблон.
 *
 * Пустой текст («Введите текст») очищается, чтобы не попасть в PDF.
 * Неизвестные пути (нет значения в модели) → очищаются, чтобы не было
 * литералов {{...}} в готовом документе.
 */
export function materializeSlide(
  slide: unknown,
  values: Record<string, unknown>,
): unknown {
  const copy = JSON.parse(JSON.stringify(slide)) as { elements?: unknown[] };
  if (!Array.isArray(copy.elements)) return copy;

  for (const el of copy.elements) {
    if (!el || typeof el !== 'object') continue;
    const e = el as Record<string, unknown>;
    const type = e.type;

    // text / shape / footer — текст и rich html
    if (type === 'text' || type === 'shape' || type === 'footer') {
      const rawText = typeof e.text === 'string' ? e.text : '';
      const rawHtml = typeof e.html === 'string' ? e.html : '';

      const resolvedText = rawText ? resolveWithValues(rawText, values) : '';
      const resolvedHtml = rawHtml ? resolveWithValues(rawHtml, values) : '';

      const textStripped = resolvedText.trim();
      const htmlStripped = resolvedHtml.replace(/<[^>]+>/g, '').trim();

      const isPlaceholderText = textStripped === '' || textStripped === TEXT_PLACEHOLDER;
      const isPlaceholderHtml = htmlStripped === '' || htmlStripped === TEXT_PLACEHOLDER;

      if (isPlaceholderText && isPlaceholderHtml) {
        e.text = '';
        if ('html' in e) e.html = '';
      } else {
        if (rawText) e.text = resolvedText;
        if ('html' in e) e.html = resolvedHtml;
      }
    }

    // image — src может содержать {{...}}
    if (type === 'image' && typeof e.src === 'string') {
      e.src = resolveWithValues(e.src, values);
    }

    // placeholder — sample из модели
    if (type === 'placeholder' && typeof e.fieldPath === 'string' && e.fieldPath) {
      const v = getByPath(values, e.fieldPath);
      e.sample = v !== undefined && v !== null ? String(v) : '';
    }

    // table — резолвим каждую ячейку
    if (type === 'table' && Array.isArray(e.data)) {
      e.data = (e.data as unknown[][]).map((row) =>
        row.map((cell) => (typeof cell === 'string' ? resolveWithValues(cell, values) : cell)),
      );
    }
  }

  return copy;
}