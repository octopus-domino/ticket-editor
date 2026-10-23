import { useCallback } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { DiagramElement } from '@/shared/types';

export function useDiagramCommit(docStore: DocumentStore) {
  return useCallback((elementId: string, patch: Partial<DiagramElement>) => {
    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      const el = s?.elements.find((e) => e.id === elementId);
      if (!el || el.type !== 'diagram') return;
      if (patch.svg !== undefined) el.svg = patch.svg;
      if (patch.xml !== undefined) el.xml = patch.xml;
    }, `diagram-${elementId}`);
  }, [docStore]);
}