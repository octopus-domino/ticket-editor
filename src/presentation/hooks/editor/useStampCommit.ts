import { useCallback } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { StampElement } from '@/shared/types';

/**
 * Применяет patch к StampElement в активном слайде.
 * Поддерживает name / width / height / shapes / texts / images.
 */
export function useStampCommit(docStore: DocumentStore) {
  return useCallback((elementId: string, patch: Partial<StampElement>) => {
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      const el = s?.elements.find((e) => e.id === elementId);
      if (!el || el.type !== 'stamp') return;
      if (patch.name !== undefined) el.name = patch.name;
      if (patch.width !== undefined) el.width = patch.width;
      if (patch.height !== undefined) el.height = patch.height;
      if (patch.shapes !== undefined) el.shapes = patch.shapes.map((x) => ({ ...x }));
      if (patch.texts !== undefined) el.texts = patch.texts.map((x) => ({ ...x }));
      if (patch.images !== undefined) el.images = patch.images.map((x) => ({ ...x }));
    }, `stamp-${elementId}`);
  }, [docStore]);
}