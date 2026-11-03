import { describe, expect, it } from 'vitest';
import { sanitizeSvg } from '@/lib/svg/sanitize';
describe('SVG boundary', () => {
  it('removes active content and encoded protocols', () => {
    const result = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><a href="java&#x73;cript:alert(1)"><text>bad</text></a><image href="https://internal/x" onload="run()"/><rect style="fill:url(https://internal/x)"/></svg>',
    );
    expect(result).not.toMatch(/script|onload|https:\/\/internal|<a /);
  });
  it('preserves local clipping and raster images', () => {
    const result = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect clip-path="url(#clip)"/><image href="data:image/png;base64,AAAA"/></svg>',
    );
    expect(result).toContain('url(#clip)');
    expect(result).toContain('data:image/png');
  });
  it('rejects DTD and malformed XML', () => {
    expect(sanitizeSvg('<!DOCTYPE svg><svg/>')).toBe('');
    expect(sanitizeSvg('<svg>')).toBe('');
  });
});
