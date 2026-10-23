import type { TextRun, BaseStyle } from '../types';

export function parseHtmlToRuns(html: string, base: BaseStyle): TextRun[] {
  if (!html) return [];
  if (typeof DOMParser === 'undefined') {
    return [{ ...baseToRun(base), text: html.replace(/<[^>]+>/g, '') }];
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const runs: TextRun[] = [];

  const pushLine = (style: Partial<TextRun>) => {
    if (runs.length && runs[runs.length - 1].text.endsWith('\n')) return;
    runs.push({ ...baseToRun(base), ...style, text: '\n' });
  };

  const pushParagraphBreak = (style: Partial<TextRun>, force = false) => {
    const last = runs[runs.length - 1];
    if (force) {
      runs.push({ ...baseToRun(base), ...style, text: '\u200B\n\n' });
      return;
    }
    if (last && last.text.endsWith('\n\n')) return;
    if (last && last.text.endsWith('\n')) {
      runs.push({ ...baseToRun(base), ...style, text: '\n' });
      return;
    }
    runs.push({ ...baseToRun(base), ...style, text: '\n\n' });
  };

  const makeListMarker = (depth: number, ordered: boolean, index: number): string => {
    // Убрали indent из строки. Глубину вложенности будет обрабатывать layout.ts
    const bullet = ordered ? `${index + 1}. ` : '• ';
    return bullet;
  };

  function walk(node: Node, style: Partial<TextRun>, listDepth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) runs.push({ ...baseToRun(base), ...style, text });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') { pushLine(style); return; }
    if (tag === 'table') return;

    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      const liList = Array.from(el.children).filter(
        (c) => (c as HTMLElement).tagName.toLowerCase() === 'li',
      );
      liList.forEach((li, idx) => {
        const marker = makeListMarker(listDepth, ordered, idx);
        runs.push({ ...baseToRun(base), ...style, text: marker });

        li.childNodes.forEach((child) => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const ct = (child as HTMLElement).tagName.toLowerCase();
            if (ct === 'p') {
              child.childNodes.forEach((c) => walk(c, style, listDepth));
              return;
            }
            if (ct === 'ul' || ct === 'ol') {
              pushLine(style);
              walk(child, style, listDepth + 1);
              return;
            }
          }
          walk(child, style, listDepth);
        });
        pushLine(style);
      });
      return;
    }

    const next: Partial<TextRun> = { ...style };
    const baseFontSize = base.fontSize || 16;
    if (tag === 'h1') { next.fontSize = Math.round(baseFontSize * 1.75); next.bold = true; }
    else if (tag === 'h2') { next.fontSize = Math.round(baseFontSize * 1.4); next.bold = true; }
    else if (tag === 'h3') { next.fontSize = Math.round(baseFontSize * 1.15); next.bold = true; }

    if (tag === 'b' || tag === 'strong') next.bold = true;
    if (tag === 'i' || tag === 'em') next.italic = true;
    if (tag === 'u') next.underline = true;
    if (tag === 's' || tag === 'strike' || tag === 'del') next.strike = true;

    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      if (href) next.href = href;
      next.underline = true;
      if (!next.color) next.color = '#2563eb';
    }
    if (tag === 'mark') {
      const bg = el.style.backgroundColor || el.getAttribute('data-color');
      if (bg) next.bgColor = bg;
    }

    const s = el.style;
    if (s) {
      if (s.color) next.color = s.color;
      if (s.backgroundColor) next.bgColor = s.backgroundColor;
      if (s.fontSize) {
        const n = parseFloat(s.fontSize);
        if (!Number.isNaN(n) && n > 0) next.fontSize = n;
      }
      if (s.fontFamily) next.fontFamily = s.fontFamily.replace(/["']/g, '').split(',')[0].trim();
      const fw = s.fontWeight;
      if (fw === 'bold' || (fw && parseInt(fw, 10) >= 600)) next.bold = true;
      if (s.fontStyle === 'italic') next.italic = true;
      const td = s.textDecoration || '';
      if (td.includes('underline')) next.underline = true;
      if (td.includes('line-through')) next.strike = true;
    }

    const isBlock = tag === 'p' || tag === 'div' || tag === 'h1' || tag === 'h2' || tag === 'h3';

    if (isBlock) {
      const wasEmpty = !(el.textContent || '').trim();
      el.childNodes.forEach((child) => walk(child, next, listDepth));
      pushParagraphBreak(style, wasEmpty);
      return;
    }

    el.childNodes.forEach((child) => walk(child, next, listDepth));
  }

  walk(doc.body, {});

  if (runs.length) {
    const last = runs[runs.length - 1];
    if (last.text === '\n\n' || last.text === '\n') runs.pop();
  }

  return runs;
}

export function baseToRun(base: BaseStyle): Omit<TextRun, 'text'> {
  return {
    bold: base.fontStyle.includes('bold'),
    italic: base.fontStyle.includes('italic'),
    underline: base.textDecoration.includes('underline'),
    strike: base.textDecoration.includes('line-through'),
    color: base.fill,
    fontSize: base.fontSize,
    fontFamily: base.fontFamily,
  };
}