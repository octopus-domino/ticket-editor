const descendants = (node: Element, name: string) =>
  Array.from(node.getElementsByTagNameNS('*', name));
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Keep mixed DrawingML runs editable, without introducing markup from file contents. */
export function mixedTextRuns(
  paragraphs: Element[],
  defaults: Element | undefined,
  scale: number,
  resolveFont: (name: string) => string,
  color: (node: Element | undefined, fallback: string) => string,
): string | null {
  const styles = new Set<string>();
  const html = paragraphs
    .map((paragraph) => {
      const paragraphDefaults = descendants(paragraph, 'defRPr')[0] ?? defaults;
      const runs = Array.from(paragraph.children)
        .map((run) => {
          if (run.localName === 'br') return '<br>';
          if (!['r', 'fld'].includes(run.localName)) return '';
          const props = descendants(run, 'rPr')[0];
          const attribute = (name: string) =>
            props?.getAttribute(name) ?? paragraphDefaults?.getAttribute(name);
          const font = resolveFont(
            descendants(props ?? run, 'latin')[0]?.getAttribute('typeface') ??
              (paragraphDefaults
                ? descendants(paragraphDefaults, 'latin')[0]?.getAttribute('typeface')
                : undefined) ??
              '+mn-lt',
          );
          const size = (Number(attribute('sz') ?? 1800) / 75) * scale;
          const css = [
            `font-family:${font.replace(/[;:"<>]/g, '')}`,
            `font-size:${Number.isFinite(size) && size > 0 ? size : 24}px`,
            `color:${color(props, color(paragraphDefaults, '#20283e'))}`,
            `font-weight:${attribute('b') === '1' ? 700 : 400}`,
            `font-style:${attribute('i') === '1' ? 'italic' : 'normal'}`,
            `text-decoration:${attribute('u') && attribute('u') !== 'none' ? 'underline' : 'none'}`,
          ].join(';');
          styles.add(css);
          return `<span style="${escape(css)}">${escape(
            descendants(run, 't')
              .map((t) => t.textContent ?? '')
              .join(''),
          )}</span>`;
        })
        .join('');
      const alignment = descendants(paragraph, 'pPr')[0]?.getAttribute('algn');
      const align =
        alignment === 'ctr'
          ? 'center'
          : alignment === 'r'
            ? 'right'
            : alignment === 'just'
              ? 'justify'
              : 'left';
      return `<p style="text-align:${align}">${runs || '<br>'}</p>`;
    })
    .join('');
  return styles.size > 1 ? html : null;
}
