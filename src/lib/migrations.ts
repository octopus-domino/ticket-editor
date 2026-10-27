// src/lib/migrations.ts
import { DocumentSchema } from '@/shared/schemas';
import type { Slide, DataRoot } from '@/shared/types';

export const CURRENT_VERSION = '2.0';

export interface MigratedDocument {
  slides: Slide[];
  data: DataRoot[];
  activeSlideId?: string;
}

/**
 * Пересчитывает bounds всех групп из их детей.
 * Поддерживает вложенные группы (несколько проходов).
 * Трогает только группы, где расхождение > 0.5px.
 */
export function fixGroupBoundsInPlace(elements: any[]): void {
  if (!Array.isArray(elements) || elements.length === 0) return;

  for (let iter = 0; iter < 5; iter++) {
    let changed = false;
    const byId = new Map<string, any>();
    for (const el of elements) {
      if (el && typeof el.id === 'string') byId.set(el.id, el);
    }

    for (const el of elements) {
      if (!el || el.type !== 'group' || !Array.isArray(el.children) || el.children.length === 0) {
        continue;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const cid of el.children) {
        const child = byId.get(cid);
        if (!child) continue;
        if (typeof child.x !== 'number' || typeof child.y !== 'number') continue;
        if (typeof child.width !== 'number' || typeof child.height !== 'number') continue;
        if (child.x < minX) minX = child.x;
        if (child.y < minY) minY = child.y;
        if (child.x + child.width > maxX) maxX = child.x + child.width;
        if (child.y + child.height > maxY) maxY = child.y + child.height;
      }

      if (minX === Infinity) continue;

      const newW = Math.max(1, maxX - minX);
      const newH = Math.max(1, maxY - minY);

      if (
        Math.abs(el.x - minX) > 0.5 ||
        Math.abs(el.y - minY) > 0.5 ||
        Math.abs(el.width - newW) > 0.5 ||
        Math.abs(el.height - newH) > 0.5
      ) {
        el.x = minX;
        el.y = minY;
        el.width = newW;
        el.height = newH;
        changed = true;
      }
    }

    if (!changed) break;
  }
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

  // NEW: пересчитываем bounds всех групп из их детей
  for (const slide of doc.slides || []) {
    if (Array.isArray(slide.elements)) {
      fixGroupBoundsInPlace(slide.elements);
    }
  }

  const result = DocumentSchema.safeParse(doc);
  if (!result.success) {
    throw new Error(`Document validation failed: ${result.error.message}`);
  }

  return {
    slides: result.data.slides as unknown as Slide[],
    data: result.data.data as unknown as DataRoot[],
    activeSlideId: result.data.activeSlideId,
  };
}