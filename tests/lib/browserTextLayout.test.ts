import { describe, expect, it } from 'vitest';
import { withBrowserTextLayout } from '@/lib/browserTextLayout';
import { newSimpleText, newSlide } from '@/lib/factories';

describe('browser PDF layout contract', () => {
  it('stores canvas lines and recalculates positions when text or width changes', () => {
    const text = { ...newSimpleText(), text: 'Short line', width: 250 };
    const slide = { ...newSlide(1), elements: [text] };
    const captured = withBrowserTextLayout([slide])[0].elements[0] as typeof text & {
      browserLayout: {
        source: { text: string };
        runs: { x: number; y: number; width: number; text: string }[];
      };
    };
    expect(captured.browserLayout.source.text).toBe(text.text);
    expect(new Set(captured.browserLayout.runs.map((run) => run.y)).size).toBe(1);
    expect(captured.browserLayout.runs.map((run) => run.text).join('')).toBe(text.text);
    expect(captured.browserLayout.runs.every((run) => run.x + run.width <= text.width)).toBe(true);
    const changed = {
      ...text,
      text: 'A long personalized line that cannot fit the original narrow box',
      width: 80,
    };
    const updated = withBrowserTextLayout([{ ...slide, elements: [changed] }])[0]
      .elements[0] as typeof captured;
    expect(updated.browserLayout.source.text).toBe(changed.text);
    expect(new Set(updated.browserLayout.runs.map((run) => run.y)).size).toBeGreaterThan(1);
    expect(text).not.toHaveProperty('browserLayout');
  });
});
