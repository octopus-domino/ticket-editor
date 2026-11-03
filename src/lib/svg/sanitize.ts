/* ============================================================
   sanitize.ts
   NFR-SEC-04: Удаление опасных тегов и атрибутов из SVG.
   ============================================================ */

const tags = new Set(
  'svg g defs symbol use path rect circle ellipse line polyline polygon text tspan textpath image clippath mask pattern lineargradient radialgradient stop marker title desc foreignobject div span p br b i u strong em table tbody tr td'.split(
    ' ',
  ),
);
export function sanitizeSvg(svg: string): string {
  if (!svg || /<!DOCTYPE|<!ENTITY/i.test(svg)) return '';
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg')
    return '';
  const clean = (element: Element) => {
    for (const child of Array.from(element.children)) {
      if (!tags.has(child.localName.toLowerCase())) child.remove();
      else clean(child);
    }
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.localName.toLowerCase();
      const value = Array.from(attribute.value)
        .filter((character) => character.charCodeAt(0) > 32)
        .join('')
        .toLowerCase();
      if (
        name.startsWith('on') ||
        name === 'srcdoc' ||
        (name === 'style' && /url\(|expression\(|@import/i.test(value)) ||
        (/url\(/i.test(value) && !/^url\(#[\w-]+\)$/.test(value)) ||
        (['href', 'src'].includes(name) &&
          !/^(#[\w-]+|data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/=]+)$/.test(value))
      ) {
        element.removeAttributeNode(attribute);
      }
    }
  };
  clean(document.documentElement);
  return new XMLSerializer().serializeToString(document.documentElement);
}
