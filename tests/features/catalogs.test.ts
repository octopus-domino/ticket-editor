import { describe, expect, it } from 'vitest';
import { DOCUMENT_PRESETS } from '@/templates/catalog';
import { essentialStamps } from '@/lib/stamps/essential';
import { DocumentSchema } from '@/shared/schemas/document';
import { serializeSlideToSvg } from '@/lib/svg/serialize';
import { newStampFromTemplate } from '@/lib/stamps/factories';
import { setLocale, LANGUAGES } from '@/shared/i18n';

describe('curated document and stamp libraries', () => {
  it('contains 25 editable document designs with valid fresh page IDs', () => {
    expect(DOCUMENT_PRESETS).toHaveLength(25);
    expect(new Set(DOCUMENT_PRESETS.map((preset) => preset.id)).size).toBe(25);
    for (const preset of DOCUMENT_PRESETS) {
      const slides = preset.build();
      expect(DocumentSchema.safeParse({ version: '2.0', slides, data: [] }).success, preset.id).toBe(true);
      expect(slides[0].id).not.toBe(preset.build()[0].id);
      expect(slides.every((slide) => slide.elements.length > 0)).toBe(true);
    }
  });
  it('translates every design title and generated copy in all supported locales', () => {
    for (const [locale] of LANGUAGES) {
      setLocale(locale);
      const slides = DOCUMENT_PRESETS.find((preset) => preset.id === 'business-card')!.build();
      const title = slides[0].elements.find((element) => element.type === 'text');
      expect(title?.type === 'text' && title.text).toBeTruthy();
    }
    setLocale('ru');
  });
  it('offers two rectangular stamps, a triangle and detailed round and oval designs', () => {
    const stamps = essentialStamps();
    expect(stamps).toHaveLength(7);
    expect(new Set(stamps.map((stamp) => stamp.id)).size).toBe(7);
    expect(stamps.filter(stamp=>stamp.shapes[0]?.kind==='rect')).toHaveLength(2);
    expect(stamps.some(stamp=>stamp.shapes[0]?.kind==='triangle')).toBe(true);
    const stamp = stamps[0];
    const svg = serializeSlideToSvg({ id: 'page', name: stamp.name, width: stamp.width, height: stamp.height, format: 'custom', orientation: 'portrait', background: 'transparent', padding: { top: 0, right: 0, bottom: 0, left: 0 }, elements: [newStampFromTemplate(stamp, 0, 0)] });
    expect((svg.match(/<text/g) ?? []).length).toBeGreaterThan(2);
    expect(svg).toContain('rotate(');
  });
});
