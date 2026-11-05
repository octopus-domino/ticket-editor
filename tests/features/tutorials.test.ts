import { describe, expect, it } from 'vitest';
import { buildTutorialBrochure, buildTutorialStamp, tutorialFocusBounds } from '../../src/templates/tutorials';
import { DocumentSchema } from '@/shared/schemas/document';
import { lessons } from '../../src/features/learning/lessons';
import { LANGUAGES, setLocale, t } from '@/shared/i18n';
import { arcGlyphLayout } from '@/lib/stamps/render';
import { newSimpleText } from '@/lib/factories';
import { appendPlaceholderPatch } from '@/lib/modelBinding';

describe('editable tutorial examples', () => {
  it('keeps every training stage and its focus outline within printable margins', () => {
    for (const [locale] of LANGUAGES) {
      setLocale(locale);
      for (const step of lessons().document.steps) {
        for (const slide of buildTutorialBrochure(step.stage)) {
          for (const element of slide.elements) {
            expect(element.x, `${locale}/${step.stage}/${element.type}`).toBeGreaterThanOrEqual(slide.padding.left);
            expect(element.y).toBeGreaterThanOrEqual(slide.padding.top);
            expect(element.x + element.width).toBeLessThanOrEqual(slide.width-slide.padding.right+.01);
            expect(element.y + element.height).toBeLessThanOrEqual(slide.height-slide.padding.bottom+.01);
          }
        }
        if (step.focus) {
          const [x,y,w,h] = tutorialFocusBounds(step.focus);
          expect(x-2.5).toBeGreaterThanOrEqual(28);
          expect(y-2.5).toBeGreaterThanOrEqual(28);
          expect(x+w+2.5).toBeLessThanOrEqual(1123-28);
          expect(y+h+2.5).toBeLessThanOrEqual(794-28);
        }
      }
    }
    setLocale('ru');
  });
  it('opens a valid two-page brochure in every language with the promised object types', () => {
    for (const [locale] of LANGUAGES) {
      setLocale(locale);
      const slides = buildTutorialBrochure();
      const parsed = DocumentSchema.safeParse({ version: '2.0', slides, data: [] });
      expect(parsed.success, locale + ': ' + (parsed.success ? '' : parsed.error.message)).toBe(
        true,
      );
      const types = new Set(
        slides.flatMap((slide) => slide.elements.map((element) => element.type)),
      );
      for (const type of [
        'text',
        'shape',
        'image',
        'path',
        'stamp',
        'footer',
        'table',
        'chart',
        'qr',
        'diagram',
      ] as const)
        expect(types.has(type), type).toBe(true);
      expect(lessons().document.steps).toHaveLength(25);
      expect(lessons().document.steps.some(step=>step.interaction==='drag')).toBe(true);
      expect(buildTutorialStamp().images).toHaveLength(1);
    }
  });
  it('keeps complete labels separate from punctuation fragments', () => {
    setLocale('ru');
    expect(t('Shapes')).toBe('Фигуры');
    expect(t('Layers')).toBe('Слои');
    setLocale('en');
    expect(t('Фигуры')).toBe('Shapes');
    expect(t('Layers')).toBe('Layers');
  });
  it('replaces localized placeholder labels with data bindings, including after a language switch', () => {
    for (const [locale] of LANGUAGES) {
      setLocale(locale);
      const element = newSimpleText();
      setLocale('ru');
      expect(appendPlaceholderPatch(element, 'name').text).toBe('{{name}}');
    }
  });
  it('keeps lower arc text upright and caches geometry for repeated renders', () => {
    const lower = arcGlyphLayout('A', 85, 85, 155, 25);
    expect(lower[0].y).toBeCloseTo(85);
    expect(lower[0].rotation).toBeCloseTo(0);
    expect(arcGlyphLayout('A', 85, 85, 155, 25)).toBe(lower);
    expect(arcGlyphLayout('A', 85, 85, -160, -20)[0].rotation).toBeCloseTo(0);
  });
});
