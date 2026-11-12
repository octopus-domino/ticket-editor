/** Accept only actionable contact schemes; never use user text as an unchecked href. */
export function contactHref(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch {
    /* Plain contacts are not URLs. */
  }
  const email = value.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0];
  if (email) return `mailto:${email}`;
  const phone = value.match(/\+?\d[\d\s()-]{5,}\d/)?.[0].replace(/[^+\d]/g, '');
  if (phone && /^\+?\d{7,15}$/.test(phone)) return `tel:${phone}`;
  return undefined;
}
