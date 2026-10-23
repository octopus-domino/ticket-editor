/* ============================================================
   sanitize.ts
   NFR-SEC-04: Удаление опасных тегов и атрибутов из SVG.
   ============================================================ */

export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  return svg
    // Удаляем <script>
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Удаляем on* атрибуты (onclick, onload и т.д.)
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '')
    // Удаляем javascript: в href и xlink:href
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/xlink:href\s*=\s*["']javascript:[^"']*["']/gi, 'xlink:href="#"');
}