import React from 'react';
import { Group } from 'react-konva';
import type { LineElement } from '@/shared/types';
import type { CommonProps } from './types';
import { PolylineRenderer } from '../shapes/PolylineRenderer';
import { ensureMinimalPoints } from '@/lib/polyline';

interface Props extends Omit<CommonProps<LineElement>, 'onDblClick'> {
  el: LineElement;
  onUpdate: (p: Partial<LineElement>) => void;
  onDblClick?: (stageX: number, stageY: number) => void;
}

export const LineEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onDblClick,
  onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => {
  const points = ensureMinimalPoints(el.points, el.width, el.height);

  const handleDblClick = (e: any) => {
    e.cancelBubble = true;
    if (!onDblClick) return;
    const stage = e.target.getStage();
    const p = stage?.getPointerPosition();
    if (!p || !stage) return;

    const sx = p.x / stage.scaleX();
    const sy = p.y / stage.scaleY();
    const localX = sx - el.x;
    const localY = sy - el.y;

    let bestIdx = 2, bestDist = Infinity;
    for (let i = 0; i + 3 < points.length; i += 2) {
      const x1 = points[i], y1 = points[i + 1];
      const x2 = points[i + 2], y2 = points[i + 3];
      const dx = x2 - x1, dy = y2 - y1;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((localX - x1) * dx + (localY - y1) * dy) / len2));
      const px = x1 + t * dx, py = y1 + t * dy;
      const d = Math.hypot(localX - px, localY - py);
      if (d < bestDist) { bestDist = d; bestIdx = i + 2; }
    }
    onUpdate({ points: [...points.slice(0, bestIdx), localX, localY, ...points.slice(bestIdx)] });
  };

  const handlePointMove = (index: number, x: number, y: number) => {
    const np = [...points];
    np[index * 2] = x;
    np[index * 2 + 1] = y;
    onUpdate({ points: np });
  };

  const handlePointContextMenu = (index: number) => {
    if (points.length <= 4) return;
    const np = [...points];
    np.splice(index * 2, 2);
    onUpdate({ points: np });
  };

  const handleTransformEnd = (e: any) => {
    const n = e.target;
    const sx = n.scaleX();
    const sy = n.scaleY();
    n.scaleX(1);
    n.scaleY(1);

    const scaledPoints = points.map((v, i) => (i % 2 === 0 ? v * sx : v * sy));

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < scaledPoints.length; i += 2) {
      const px = scaledPoints[i] ?? 0;
      const py = scaledPoints[i + 1] ?? 0;
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    const newW = Math.max(10, maxX - minX);
    const newH = Math.max(10, maxY - minY);

    onUpdate({
      x: n.x(), y: n.y(), rotation: n.rotation(),
      width: newW, height: newH, points: scaledPoints,
    });
  };

  return (
    <Group
      id={el.id}
      name="element"
      x={el.x} y={el.y} rotation={el.rotation}
      draggable
      onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(e); }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={(e) => { onUpdate({ x: e.target.x(), y: e.target.y() }); onDragEnd?.(e); }}
      onContextMenu={onContextMenu}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onTransformEnd={handleTransformEnd}
    >
      <PolylineRenderer
        points={points}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        dash={el.dash}
        isArrow={el.isArrow}
        isSelected={!!isSelected}
        onPointMove={handlePointMove}
        onPointContextMenu={handlePointContextMenu}
      />
    </Group>
  );
};