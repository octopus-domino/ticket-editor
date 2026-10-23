// src/lib/migrations.ts
import { DocumentSchema } from '@/shared/schemas';
import type { Slide, DataRoot } from '@/shared/types';

export const CURRENT_VERSION = '2.0';

/**
 * Возвращаемый тип — НАШ доменный, а не `ValidatedDocument` из zod.
 * Zod используется только как валидатор (runtime-check), типы берём из
 * `shared/types`, чтобы `DocumentStore` (immer/WritableDraft) принял результат.
 */
export interface MigratedDocument {
  slides: Slide[];
  data: DataRoot[];
  activeSlideId?: string;
}

/* ---------- миграции ---------- */

function migrate_1_0_to_1_5(doc: any): any {
  return {
    ...doc,
    version: '1.5',
    data: doc.data || [],
  };
}

function migrate_1_5_to_2_0(doc: any): any {
  const slides = (doc.slides || []).map((slide: any) => {
    const elements = (slide.elements || []).map((el: any) => {
      const next = { ...el };

      if (el.type === 'connector') {
        next.dash = el.dash || 'solid';
        next.isArrow = el.isArrow !== undefined ? el.isArrow : true;
        next.routing = el.routing || 'orthogonal';
        next.stroke = el.stroke || '#374151';
        next.strokeWidth = el.strokeWidth || 2;
      }

      if (el.type === 'text' || el.type === 'placeholder') {
        next.verticalAlign = el.verticalAlign || 'top';
        next.lineHeight = el.lineHeight || 1.2;
        next.padding = el.padding || { top: 4, right: 4, bottom: 4, left: 4 };
        next.background = el.background || 'transparent';
      }

      if (el.type === 'stamp') {
        next.images = el.images || [];
        next.shapes = el.shapes || [];
        next.texts = el.texts || [];
      }

      return next;
    });

    return { ...slide, elements };
  });

  return {
    ...doc,
    version: '2.0',
    slides,
    data: doc.data || [],
  };
}

/**
 * Финальные дефолты — применяются ПОСЛЕ всех миграций, но ДО zod-парсинга.
 * Это гарантия, что zod-output совпадёт с доменным типом по всем
 * обязательным полям, которые в zod объявлены `.optional()`.
 *
 * Сейчас — только `TextElement.richText` (в типе `boolean`, в zod `boolean?`).
 */
function applyFinalDefaults(doc: any): any {
  const slides = (doc.slides || []).map((slide: any) => ({
    ...slide,
    elements: (slide.elements || []).map((el: any) => {
      if (el.type === 'text' && el.richText === undefined) {
        return { ...el, richText: true };
      }
      return el;
    }),
  }));
  return { ...doc, slides };
}

/* ---------- публичная точка ---------- */

/**
 * F-MIG-01..10: Пошаговая миграция документа к CURRENT_VERSION.
 * Бросает Error, если версия не поддерживается (F-MIG-09).
 *
 * Возвращает доменный тип `MigratedDocument`, не `ValidatedDocument`.
 */
export function migrateDocument(raw: unknown): MigratedDocument {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid document: not an object');
  }

  let doc = JSON.parse(JSON.stringify(raw)) as any;
  let version = doc.version || '1.0';

  for (let i = 0; i < 20; i++) {
    if (version === CURRENT_VERSION) break;

    if (version === '1.0') {
      doc = migrate_1_0_to_1_5(doc);
      version = '1.5';
    } else if (version === '1.5') {
      doc = migrate_1_5_to_2_0(doc);
      version = '2.0';
    } else {
      throw new Error(`Unsupported document version: ${version}`);
    }
  }

  doc = applyFinalDefaults(doc);

  const result = DocumentSchema.safeParse(doc);
  if (!result.success) {
    throw new Error(`Document validation failed: ${result.error.message}`);
  }

  // Safe cast: zod-валидация уже гарантирует структуру, defaults применены.
  // Расхождения между zod-output и доменным типом:
  //   1) passthrough сохраняет лишние поля (не мешает),
  //   2) DataRoot.fields в zod — `unknown[]` из-за рекурсии (z.ZodType),
  //      но структурно — это `DataField[]`,
  //   3) все `.optional()` поля с `.default()` после парсинга заполнены,
  //   4) `richText` заполнен через applyFinalDefaults.
  return {
    slides: result.data.slides as unknown as Slide[],
    data: result.data.data as unknown as DataRoot[],
    activeSlideId: result.data.activeSlideId,
  };
}