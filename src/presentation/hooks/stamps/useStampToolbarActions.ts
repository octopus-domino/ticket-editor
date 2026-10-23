import { useCallback, useMemo } from 'react';
import type { StampShapeItem, StampTextItem, StampShapeKind, StampImageItem } from '@/shared/types';
import { createShape, createStraightText, createArcText, type FactoryContext } from '@/lib/stamps/factories';
import type { PlacementMode } from '@/lib/stamps/geometry';

type SelectionType = 'shape' | 'text' | 'image' | null;

interface Args {
  shapes: StampShapeItem[]; texts: StampTextItem[]; images: StampImageItem[];
  width: number; height: number; placementMode: PlacementMode;
  selectedId: string | null; selectedType: SelectionType;
  commit: (s: StampShapeItem[], t: StampTextItem[], i: StampImageItem[]) => void;
  select: (id: string | null, type: SelectionType) => void;
}

export function useStampToolbarActions({
  shapes, texts, images, width, height, placementMode, selectedId, selectedType, commit, select,
}: Args) {
  const ctx: FactoryContext = useMemo(() => ({
    shapes, selectedId, selectedType, stampW: width, stampH: height, placementMode,
  }), [shapes, selectedId, selectedType, width, height, placementMode]);

  const addShape = useCallback((kind: StampShapeKind) => {
    const s = createShape(kind, ctx);
    commit([...shapes, s], texts, images);
    select(s.id, 'shape');
  }, [ctx, shapes, texts, images, commit, select]);

  const addStraightText = useCallback(() => {
    const t = createStraightText(ctx);
    commit(shapes, [...texts, t], images);
    select(t.id, 'text');
  }, [ctx, shapes, texts, images, commit, select]);

  const addArcText = useCallback(() => {
    const t = createArcText(ctx);
    commit(shapes, [...texts, t], images);
    select(t.id, 'text');
  }, [ctx, shapes, texts, images, commit, select]);

  return { addShape, addStraightText, addArcText };
}