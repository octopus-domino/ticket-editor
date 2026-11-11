import { describe, it, expect } from 'vitest';
import { generationDefaults } from '@/features/generation/domain/GenerationDefaults';
describe('generation output defaults', () => {
  it.each([0, 1])('downloads one PDF directly for %s data sets', (count) => {
    expect(generationDefaults(count, null, null)).toEqual({ format: 'pdf', packAs: 'single' });
  });
  it('uses an archive for a batch and preserves explicit user options', () => {
    expect(generationDefaults(3, null, null)).toEqual({ format: 'pdfa', packAs: 'zip' });
    expect(generationDefaults(1, 'svg', 'zip')).toEqual({ format: 'svg', packAs: 'zip' });
    expect(generationDefaults(2, 'invalid', 'invalid')).toEqual({ format: 'pdfa', packAs: 'zip' });
  });
});
