import { migrateDocument } from '@/lib/migrations';
import { createSlide } from '@/domain/slide/operations';
import type { EditorInitialDoc } from '@/presentation/components/Editor';

export interface HydratedDocument extends EditorInitialDoc {
  schemaId?: string;
  legacyModelId?: string;
}
/** Reject corrupt documents; only an explicitly empty new document gets a blank slide. */
export function hydrateDocument(content: string): HydratedDocument {
  const parsed: unknown = JSON.parse(content || '{}');
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('Invalid document');
  const raw = parsed as Record<string, unknown>;
  if (raw.slides === undefined || (Array.isArray(raw.slides) && raw.slides.length === 0)) {
    const slide = createSlide(1);
    return { slides: [slide], activeId: slide.id, data: [] };
  }
  const migrated = migrateDocument({ ...raw, version: raw.version ?? '2.0' });
  const activeId =
    typeof raw.activeId === 'string' && migrated.slides.some((slide) => slide.id === raw.activeId)
      ? raw.activeId
      : migrated.slides[0].id;
  return {
    ...migrated,
    activeId,
    bindings: migrated.bindings,
    schemaId: typeof raw.schemaId === 'string' ? raw.schemaId : undefined,
    legacyModelId: typeof raw.legacyModelId === 'string' ? raw.legacyModelId : undefined,
  };
}
