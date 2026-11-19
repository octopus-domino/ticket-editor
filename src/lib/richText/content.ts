/** Tables and media remain document content even when they contain no printable characters. */
export function hasRichStructure(html: string | null | undefined): boolean {
  return /<(?:table|img)\b/i.test(html ?? '');
}
