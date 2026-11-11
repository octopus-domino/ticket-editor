import type { Slide, TextElement } from '@/shared/types';
import { parseHtmlToBlocks } from './richText/parser/blocks';
import { plainToHtml } from './richText/plainHtml';
import { layoutRuns } from './richText/layout';

const cache = new WeakMap<TextElement, TextElement>();
/** Carry the canvas line breaks across the browser/JVM font-metrics boundary. */
export function withBrowserTextLayout(slides: Slide[]): Slide[] {
  return slides.map((slide) => ({
    ...slide,
    elements: slide.elements.map((element) => {
      if (element.type !== 'text' || element.textMode === 'arc') return element;
      const cached = cache.get(element);
      if (cached) return cached;
      const padding = element.padding ?? { left: 0, right: 0, top: 0, bottom: 0 };
      const width = Math.max(1, element.width - padding.left - padding.right);
      const blocks = parseHtmlToBlocks(element.html || plainToHtml(element.text), {
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        fontStyle: element.fontStyle,
        textDecoration: element.textDecoration,
        fill: element.fill,
      });
      if (blocks.some((block) => block.kind !== 'text')) return element;
      const layouts = blocks.flatMap((block) =>
        block.kind === 'text' ? [layoutRuns(block.runs, width, element.lineHeight || 1.5)] : [],
      );
      const total = layouts.reduce((height, layout) => height + layout.totalHeight, 0);
      const innerHeight = element.height - padding.top - padding.bottom;
      let y =
        padding.top +
        (element.verticalAlign === 'middle'
          ? Math.max(0, (innerHeight - total) / 2)
          : element.verticalAlign === 'bottom'
            ? Math.max(0, innerHeight - total)
            : 0);
      const runs = layouts.flatMap((layout) => {
        const top = y;
        y += layout.totalHeight;
        return layout.lines.flatMap((line) => {
          const lineWidth = line.reduce((sum, run) => sum + run.width, 0);
          const offset =
            element.align === 'center'
              ? Math.max(0, (width - lineWidth) / 2)
              : element.align === 'right'
                ? Math.max(0, width - lineWidth)
                : 0;
          return line.map((run) => ({
            text: run.text,
            x: padding.left + offset + run.x,
            y: top + run.y + run.actualFontSize * 0.8,
            width: run.width,
            size: run.actualFontSize,
            family: run.fontFamily ?? element.fontFamily,
            bold: run.bold,
            italic: run.italic,
            underline: run.underline,
            strike: run.strike,
            color: run.color ?? element.fill,
            background: run.bgColor ?? null,
          }));
        });
      });
      const source = Object.fromEntries(
        [
          'text',
          'html',
          'width',
          'height',
          'fontSize',
          'fontFamily',
          'fontStyle',
          'fill',
          'textDecoration',
          'align',
          'verticalAlign',
          'lineHeight',
          'padding',
        ].map((key) => [key, (element as unknown as Record<string, unknown>)[key] ?? null]),
      );
      const result = { ...element, browserLayout: { source, runs } };
      cache.set(element, result);
      return result;
    }),
  }));
}
