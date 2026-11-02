import type { CanvasElement } from '@/shared/types';
import { TEXT_PLACEHOLDER } from '@/shared/constants';
import { layoutRuns } from '@/lib/richText/layout';
import { getByPath } from '@/lib/path';

export { getByPath };

/** ВАЖНО: [\w.\[\]] — поддерживает array-index: {{event.items[0].code}}. */
const PH_RE = /\{\{\s*([\w.\[\]]+)\s*\}\}/g;

export function resolveWithValues(
  text: string | undefined,
  values: Record<string, unknown>,
): string {
  if (!text) return text ?? '';
  PH_RE.lastIndex = 0;
  return text.replace(PH_RE, (m, path) => {
    const v = getByPath(values, path);
    return v !== undefined && v !== null ? String(v) : m;
  });
}

function isEmptyText(text: string | undefined | null): boolean {
  if (!text) return true;
  const t = text.trim();
  return t === '' || t === TEXT_PLACEHOLDER;
}

function isEmptyHtml(html: string | undefined | null): boolean {
  if (!html) return true;
  const t = html.replace(/<[^>]+>/g, '').trim();
  return t === '' || t === TEXT_PLACEHOLDER;
}

export function appendPlaceholderPatch(
  el: CanvasElement,
  path: string,
  opts?: { localX?: number; localY?: number },
): { text?: string; html?: string } {
  const token = `{{${path}}}`;

  if (el.type !== 'text' && el.type !== 'shape' && el.type !== 'footer') return {};

  if (el.type === 'footer') {
    const raw = (el as { text?: string }).text ?? '';
    if (isEmptyText(raw)) return { text: token };
    const isTop = opts?.localY !== undefined
      && opts.localY < ((el as { height?: number }).height ?? 0) / 2;
    return { text: isTop ? `${token} ${raw}` : `${raw}${raw.endsWith(' ') ? '' : ' '}${token}` };
  }

  if (el.type === 'shape') {
    const raw = (el as { text?: string }).text ?? '';
    if (isEmptyText(raw)) return { text: token };
    const isTop = opts?.localY !== undefined
      && opts.localY < ((el as { height?: number }).height ?? 0) / 2;
    return { text: isTop ? `${token} ${raw}` : `${raw}${raw.endsWith(' ') ? '' : ' '}${token}` };
  }

  // Text
  const rawText = (el as { text?: string }).text ?? '';
  const rawHtml = (el as { html?: string }).html ?? '';
  const hasRealHtml = rawHtml.length > 0 && !isEmptyHtml(rawHtml);

  if (hasRealHtml) {
    const htmlIndex = findBlockInsertIndex(
      rawHtml, opts?.localY ?? 0, (el as { height?: number }).height ?? 0,
    );
    const before = rawHtml.slice(0, htmlIndex);
    const after = rawHtml.slice(htmlIndex);
    return { html: `${before}<p>${token}</p>${after}` };
  }

  if (isEmptyText(rawText)) {
    return { text: token, html: `<p>${token}</p>` };
  }

  const pos = findPlainInsertPos(rawText, opts?.localX, opts?.localY, el);
  if (pos !== null && pos >= 0 && pos <= rawText.length) {
    return { text: rawText.slice(0, pos) + token + rawText.slice(pos) };
  }
  return { text: rawText + (rawText.endsWith(' ') ? '' : ' ') + token };
}

function findPlainInsertPos(
  text: string,
  localX: number | undefined,
  localY: number | undefined,
  el: CanvasElement,
): number | null {
  if (localX === undefined || localY === undefined) return null;

  const padding = (el as { padding?: { top: number; right: number; bottom: number; left: number } })
    .padding ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const width = (el as { width?: number }).width ?? 0;
  const innerWidth = Math.max(1, width - padding.left - padding.right);

  const fontSize = (el as { fontSize?: number }).fontSize ?? 16;
  const fontFamily = (el as { fontFamily?: string }).fontFamily ?? 'Arial';
  const lineHeight = (el as { lineHeight?: number }).lineHeight ?? 1.5;

  const run = {
    text,
    bold: false, italic: false, underline: false, strike: false,
    fontSize, fontFamily,
  };
  const layout = layoutRuns([run] as never[], innerWidth, lineHeight);
  if (layout.lines.length === 0) return 0;

  const ly = localY - padding.top;
  let charOffset = 0;

  for (let i = 0; i < layout.lines.length; i++) {
    const line = layout.lines[i];
    if (line.length === 0) continue;
    const lineTop = line[0].y;
    const lineH = fontSize * lineHeight;
    const isLast = i === layout.lines.length - 1;

    if (ly < lineTop + lineH || isLast) {
      const lx = localX - padding.left;
      for (const r of line) {
        if (lx < r.x + r.width) {
          const rel = Math.max(0, Math.min(1, (lx - r.x) / Math.max(1, r.width)));
          return charOffset + Math.round(rel * r.text.length);
        }
        charOffset += r.text.length;
      }
      return charOffset;
    }
    charOffset += line.reduce((s, r) => s + r.text.length, 0);
  }
  return charOffset;
}

function findBlockInsertIndex(html: string, localY: number, totalHeight: number): number {
  const blockRegex = /<(p|h1|h2|h3|li)[^>]*>[\s\S]*?<\/\1>/g;
  const blocks: { end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(html)) !== null) {
    blocks.push({ end: m.index + m[0].length });
  }
  if (blocks.length === 0) return html.length;

  const ratio = Math.max(0, Math.min(1, localY / Math.max(1, totalHeight)));
  if (ratio < 0.33) {
    const first = /<(p|h1|h2|h3|li)[^>]*>/.exec(html);
    return first ? first.index : 0;
  }
  const blockIdx = Math.min(blocks.length - 1, Math.floor(ratio * blocks.length));
  return blocks[blockIdx].end;
}