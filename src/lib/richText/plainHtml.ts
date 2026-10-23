/* ============================================================
   Fallback: plain text → HTML для единообразного парсинга.
   ============================================================ */

export function plainToHtml(text: string): string {
  const esc = (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<p>${esc.replace(/\n/g, '<br>')}</p>`;
}