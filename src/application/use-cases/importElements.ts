import { CanvasElementSchema, SCHEMA_LIMITS } from '@/shared/schemas/document';
import type { CanvasElement } from '@/shared/types';

/** Validate an entire import before any mutation, remapping all internal references together. */
export function importElements(raw: unknown, existingCount: number): CanvasElement[] | null {
  if (!Array.isArray(raw) && (!raw || typeof raw !== 'object' || !('type' in raw))) return null;
  const incoming = Array.isArray(raw) ? raw : [raw];
  if (existingCount + incoming.length > SCHEMA_LIMITS.MAX_ELEMENTS_PER_SLIDE)
    throw new Error('Too many elements');
  const parsed = incoming.map((element: unknown) => {
    if (!element || typeof element !== 'object') throw new Error('Invalid element');
    return CanvasElementSchema.parse({
      id: crypto.randomUUID(),
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      rotation: 0,
      ...element,
    });
  });
  if (new Set(parsed.map((element) => element.id)).size !== parsed.length)
    throw new Error('Duplicate element IDs');
  const ids = new Map(parsed.map((element) => [element.id, crypto.randomUUID()]));
  return parsed.map((element) => {
    const copy = { ...element, id: ids.get(element.id)! } as CanvasElement;
    if (copy.clipPathId) copy.clipPathId = ids.get(copy.clipPathId) ?? null;
    if (copy.type === 'group')
      copy.children = copy.children.map((id) => {
        const mapped = ids.get(id);
        if (!mapped) throw new Error('Missing group child');
        return mapped;
      });
    if (copy.type === 'connector') {
      const from = ids.get(copy.fromId),
        to = ids.get(copy.toId);
      if (!from || !to) throw new Error('Missing connector endpoint');
      copy.fromId = from;
      copy.toId = to;
    }
    return copy;
  });
}
