import { describe, expect, it } from 'vitest';
import { DOCUMENT_PRESETS } from '@/templates/catalog';
import { buildTutorialBrochure } from '@/templates/tutorials';
import { setLocale, LANGUAGES } from '@/shared/i18n';
import type { Slide } from '@/shared/types';

function inspect(slide: Slide, label: string) {
  const p = slide.padding;
  for (const element of slide.elements) {
    const name = element.type === 'text' ? element.text : element.type;
    const info = `${label}: ${name}`;
    expect(element.x, info).toBeGreaterThanOrEqual(p.left - 0.01);
    expect(element.y, info).toBeGreaterThanOrEqual(p.top - 0.01);
    expect(element.x + element.width, info).toBeLessThanOrEqual(slide.width - p.right + 0.01);
    expect(element.y + element.height, info).toBeLessThanOrEqual(slide.height - p.bottom + 0.01);
  }
  const texts = slide.elements.filter((el) => el.type === 'text');
  for (let i = 0; i < texts.length; i++) for (const other of texts.slice(i + 1)) {
    const a = texts[i];
    const overlap = Math.min(a.x + a.width, other.x + other.width) - Math.max(a.x, other.x) > 1
      && Math.min(a.y + a.height, other.y + other.height) - Math.max(a.y, other.y) > 1;
    expect(overlap, `${label}: text collision: ${a.text} / ${other.text}`).toBe(false);
  }
}
describe('print-ready built-in layouts', () => {
  for (const [locale] of LANGUAGES) it(`keeps content within print margins without text collisions (${locale})`, () => {
    setLocale(locale);
    try {
      for (const preset of DOCUMENT_PRESETS) for (const slide of preset.build()) inspect(slide, `${locale}/${preset.id}`);
      for (const slide of buildTutorialBrochure()) inspect(slide, `${locale}/tutorial`);
    } finally { setLocale('ru'); }
  });
});
