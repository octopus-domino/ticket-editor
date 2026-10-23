import type { BaseStyle, RichBlock } from '../types';
import { parseHtmlToRuns } from './runs';
import { parseTableEl } from './table';

export function parseHtmlToBlocks(html: string, base: BaseStyle): RichBlock[] {
  if (!html) return [];
  if (typeof DOMParser === 'undefined') {
    const runs = parseHtmlToRuns(html, base);
    return runs.length ? [{ kind: 'text', runs }] : [];
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  return parseNodesToBlocks(doc.body.childNodes, base);
}

export function parseCellBlocks(cellEl: HTMLElement, base: BaseStyle): RichBlock[] {
  const clone = cellEl.cloneNode(true) as HTMLElement;
  const directPs = Array.from(clone.querySelectorAll(':scope > p')) as HTMLElement[];

  while (directPs.length) {
    const p = directPs[0];
    if (p.textContent?.trim() || p.querySelector('br, table')) break;
    p.remove();
    directPs.shift();
  }
  while (directPs.length) {
    const p = directPs[directPs.length - 1];
    if (p.textContent?.trim() || p.querySelector('br, table')) break;
    p.remove();
    directPs.pop();
  }

  while (clone.firstChild && (clone.firstChild as Element).nodeName === 'BR') {
    clone.removeChild(clone.firstChild);
  }
  while (clone.lastChild && (clone.lastChild as Element).nodeName === 'BR') {
    clone.removeChild(clone.lastChild);
  }

  return parseNodesToBlocks(clone.childNodes, base);
}

const CONTAINER_TAGS = new Set([
  'div', 'section', 'article', 'main', 'aside', 'figure',
  'blockquote', 'header', 'footer', 'nav', 'span',
]);

function parseNodesToBlocks(
  nodes: NodeListOf<ChildNode> | ChildNode[],
  base: BaseStyle,
): RichBlock[] {
  const blocks: RichBlock[] = [];
  let pendingHtml = '';

  const flushText = () => {
    if (!pendingHtml.trim()) { pendingHtml = ''; return; }
    const runs = parseHtmlToRuns(pendingHtml, base);
    if (runs.length) blocks.push({ kind: 'text', runs });
    pendingHtml = '';
  };

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pendingHtml += (node.textContent ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // F-RT-03: Спец-обработка оберток TipTap
    if (tag === 'div' && el.classList.contains('tableWrapper')) {
      const table = el.querySelector('table');
      if (table) {
        flushText();
        try {
          const data = parseTableEl(table, base, parseCellBlocks);
          if (data && data.cells.length) {
            blocks.push({ kind: 'table', data });
          }
        } catch (err) {
          console.error('[richText] parseTableEl failed:', err);
        }
        return;
      }
    }

    if (tag === 'table') {
      flushText();
      try {
        const data = parseTableEl(el, base, parseCellBlocks);
        if (data && data.cells.length) {
          blocks.push({ kind: 'table', data });
        }
      } catch (err) {
        console.error('[richText] parseTableEl failed:', err);
        const runs = parseHtmlToRuns(el.textContent ?? '', base);
        if (runs.length) blocks.push({ kind: 'text', runs });
      }
      return;
    }

    if (CONTAINER_TAGS.has(tag) && el.querySelector('table')) {
      for (const child of Array.from(el.childNodes)) {
        visit(child);
      }
      return;
    }

    pendingHtml += el.outerHTML;
  };

  for (const node of Array.from(nodes)) {
    visit(node);
  }
  flushText();

  return blocks;
}