/* ============================================================
   stamps/canvas/CompositeFillLayer.tsx
   F-STMP-N-07, F-STMP-N-11, F-RFILL-12..15, §50.
   React.memo — при стабильных props не перерисовывается.
   ============================================================ */

import React, { useMemo } from 'react';
import { Image as KImage } from 'react-konva';
import type { StampShapeItem } from '@/shared/types';
import type { FillSpec } from '@/lib/stamps/rasterFill';
import { useFillRasterizer } from '../../../hooks/useFillRasterizer';

interface Props {
  width: number;
  height: number;
  shapes: StampShapeItem[];
  enabled?: boolean;
}

function anchorToWorld(
  target: StampShapeItem,
  local: { x: number; y: number },
): { x: number; y: number } {
  const lx = target.x + local.x * target.width;
  const ly = target.y + local.y * target.height;
  const cx = target.x + target.width / 2;
  const cy = target.y + target.height / 2;
  const rot = ((target.rotation || 0) * Math.PI) / 180;
  const dx = lx - cx;
  const dy = ly - cy;

  return {
    x: cx + dx * Math.cos(rot) - dy * Math.sin(rot),
    y: cy + dx * Math.sin(rot) + dy * Math.cos(rot),
  };
}

const CompositeFillLayerInner: React.FC<Props> = ({
  width,
  height,
  shapes,
  enabled = true,
}) => {
  const fills: FillSpec[] = useMemo(() => {
    const out: FillSpec[] = [];
    for (const s of shapes) {
      if (s.kind !== 'fill') continue;
      if (s.hidden) continue;
      if (!s.fillTargetShapeId) continue;

      const target = shapes.find((t) => t.id === s.fillTargetShapeId);
      if (!target) continue;

      const local = s.fillAnchorLocal ?? { x: 0.5, y: 0.5 };
      const { x, y } = anchorToWorld(target, local);

      out.push({
        px: x,
        py: y,
        color: s.fill || '#fbbf24',
        target,
      });
    }
    return out;
  }, [shapes]);

  const signature = useMemo(() => {
    const geo = shapes
      .filter((s) => s.kind !== 'fill' && !s.hidden)
      .map(
        (s) =>
          `${s.kind}:${Math.round(s.x)}|${Math.round(s.y)}|${Math.round(
            s.width,
          )}|${Math.round(s.height)}|${Math.round(s.rotation || 0)}|${(
            s.points || []
          )
            .map((v) => Math.round(v))
            .join(',')}|${s.strokeWidth}`,
      )
      .join('||');

    const f = fills
      .map(
        (x) =>
          `${Math.round(x.px)},${Math.round(x.py)},${x.color},${
            x.target?.id ?? '-'
          }`,
      )
      .join(';');

    return geo + '###' + f;
  }, [shapes, fills]);

  const entry = useFillRasterizer({
    key: signature,
    width,
    height,
    shapes,
    fills,
    enabled: enabled && fills.length > 0,
  });

  const img = entry?.image ?? null;
  if (!img) return null;

  return (
    <KImage
      x={0}
      y={0}
      width={width}
      height={height}
      image={img}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
};

export const CompositeFillLayer = React.memo(CompositeFillLayerInner);