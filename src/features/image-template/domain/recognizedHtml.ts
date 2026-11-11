const tags = new Set([
  'div',
  'p',
  'span',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'del',
]);
const fonts = new Set(['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Courier New']);
const color = /^(#[a-f\d]{3,8}|rgba?\([\d\s.,%]+\)|transparent)$/i;

/** Import only text markup understood by the editor, and scale inline sizes with the page. */
export function recognizedHtml(html: string, scale: number): string {
  const source = document.createElement('template');
  source.innerHTML = html;
  const result = document.createElement('div');
  // The backend's element style describes its first run, not every run in the HTML.
  result.style.fontWeight = 'normal';
  result.style.fontStyle = 'normal';
  result.style.textDecoration = 'none';
  let nodes = 0;

  function append(node: Node, parent: HTMLElement, depth: number) {
    if (++nodes > 10000 || depth > 32) throw new Error('recognition.invalid_result');
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent ?? ''));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (!tags.has(tag)) return;
    const clean = document.createElement(tag);
    const style = element.style;
    if (color.test(style.color)) clean.style.color = style.color;
    if (color.test(style.backgroundColor)) clean.style.backgroundColor = style.backgroundColor;
    const family = style.fontFamily.replace(/["']/g, '').trim();
    if (fonts.has(family)) clean.style.fontFamily = family;
    if (/^\d+(?:\.\d+)?px$/.test(style.fontSize)) {
      const size = Number.parseFloat(style.fontSize);
      if (size > 0 && size <= 512) clean.style.fontSize = `${size * scale}px`;
    }
    if (/^(normal|bold|[1-9]00)$/.test(style.fontWeight)) clean.style.fontWeight = style.fontWeight;
    if (/^(normal|italic)$/.test(style.fontStyle)) clean.style.fontStyle = style.fontStyle;
    const decoration = style.textDecoration
      .split(/\s+/)
      .filter((value) => ['underline', 'line-through', 'none'].includes(value));
    if (decoration.length) clean.style.textDecoration = decoration.join(' ');
    if (/^(left|center|right|justify)$/.test(style.textAlign))
      clean.style.textAlign = style.textAlign;
    for (const child of Array.from(node.childNodes)) append(child, clean, depth + 1);
    parent.appendChild(clean);
  }

  for (const node of Array.from(source.content.childNodes)) append(node, result, 0);
  return result.outerHTML;
}
