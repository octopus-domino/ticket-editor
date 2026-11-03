// tests/lib/richText/plainHtml.test.ts
import { describe, it, expect } from 'vitest';
import { plainToHtml } from '@/lib/richText/plainHtml';

describe('plainHtml', () => {
  it('escapes HTML and converts newlines', () => {
    expect(plainToHtml('<script>alert("xss")</script>\nhello & bye'))
      .toBe('<p>&lt;script&gt;alert("xss")&lt;/script&gt;<br>hello &amp; bye</p>');
  });

  it('handles empty string', () => {
    expect(plainToHtml('')).toBe('<p></p>');
  });
});