import { describe, expect, it } from 'vitest';
import { analyticsPath, parseCounterId } from '@/shared/analytics/metrika';

describe('analytics boundary', () => {
  it('accepts only positive safe integer counter IDs', () => {
    expect(parseCounterId('12345678')).toBe(12345678);
    for (const value of ['', '0', '-1', '1.5', 'test', '9007199254740992', undefined]) {
      expect(parseCounterId(value)).toBeNull();
    }
  });
  it('removes private resource identifiers from analytics URLs', () => {
    expect(analyticsPath('/app/templates/private-id/edit')).toBe('/app/templates/:id/edit');
    expect(analyticsPath('/app/editor/private-document')).toBe('/app/editor/:id');
    expect(analyticsPath('/app/schemas/private-schema')).toBe('/app/schemas/:id');
    expect(analyticsPath('/')).toBe('/');
  });
});
