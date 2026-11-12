import { expect, it } from 'vitest';
import { contactHref } from '@/features/journeys/domain/contact';
it('offers a direct call, email or secure site without interpreting arbitrary markup', () => {
  expect(contactHref('Anna +7 (999) 123-45-67')).toBe('tel:+79991234567');
  expect(contactHref('Write to anna@example.test')).toBe('mailto:anna@example.test');
  expect(contactHref('https://example.test/viewing')).toBe('https://example.test/viewing');
  expect(contactHref('javascript:alert(1)')).toBeUndefined();
  expect(contactHref('https://user:secret@example.test')).toBeUndefined();
  expect(contactHref('Only a name')).toBeUndefined();
});
