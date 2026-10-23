/* ============================================================
   presentation/hooks/stamps/useStampFillMode.ts
   F-STMP-E-10, F-SGEO-11. NFR-OBS-03.
   ============================================================ */

import { useCallback, useState } from 'react';
import type {
  StampShapeItem,
  StampTextItem,
  StampImageItem,
} from '@/shared/types';
import { findShapesContaining } from '@/lib/stamps/geometry';
import { uid } from '@/lib/uid';
import { logger } from '@/shared/logger';

interface Args {
  shapes: StampShapeItem[];
  texts: StampTextItem[];
  images: StampImageItem[];
  width: number;
  height: number;
  commit: (s: StampShapeItem[], t: StampTextItem[], i: StampImageItem[]) => void;
  select: (id: string | null, type: 'shape' | 'text' | 'image') => void;
}

export function useStampFillMode({
  shapes, texts, images, width, height, commit, select,
}: Args) {
  const [fillMode, setFillMode] = useState(false);
  const [fillColor, setFillColor] = useState('#fbbf24');

  const handleCanvasClick = useCallback((px: number, py: number) => {
    if (!fillMode) return;

    const containing = findShapesContaining(px, py, shapes);
    if (containing.length === 0) {
      logger.debug('stamp.fill.no_target', { px, py });
      return;
    }

    const target = containing.reduce((a, b) =>
      a.width * a.height <= b.width * b.height ? a : b,
    );

    const localX = (px - target.x) / Math.max(1, target.width);
    const localY = (py - target.y) / Math.max(1, target.height);

    const fill: StampShapeItem = {
      id: uid(),
      kind: 'fill',
      x: 0, y: 0,
      width, height,
      rotation: 0, cornerRadius: 0,
      stroke: '', strokeWidth: 0, dash: 'solid',
      fill: fillColor,
      fillTargetShapeId: target.id,
      fillAnchorLocal: { x: localX, y: localY },
      name: 'Заливка области',
    };

    logger.info('stamp.fill.created', {
      shapeId: target.id,
      kind: target.kind,
      color: fillColor,
    });

    commit([...shapes, fill], texts, images);
    select(fill.id, 'shape');
    setFillMode(false);
  }, [fillMode, fillColor, shapes, texts, images, width, height, commit, select]);

  return { fillMode, setFillMode, fillColor, setFillColor, handleCanvasClick };
}