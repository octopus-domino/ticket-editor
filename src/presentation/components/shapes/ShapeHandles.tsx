import React from 'react';
import { Circle } from 'react-konva';
import type { ShapeElement } from '@/shared/types';

interface Props {
  el: ShapeElement;
  points: number[];
  onUpdatePoints: (pts: number[]) => void;
  onCommit: () => void;
  onDragStartHandle: () => void;
  onDragEndHandle: () => void;
}

export const ShapeHandles: React.FC<Props> = ({
  el, points, onUpdatePoints, onCommit, onDragStartHandle, onDragEndHandle,
}) => {
  const w = el.width;
  const h = el.height;

  if (el.shape === 'triangle' || el.shape === 'polygon') {
    return (
      <>
        {points.map((_, i) => {
          if (i % 2 !== 0) return null;

          return (
            <Circle
              key={i}
              x={points[i]}
              y={points[i + 1]}
              radius={5}
              fill="#fff"
              stroke="#6366f1"
              strokeWidth={2}
              draggable
              onMouseDown={(e) => { e.cancelBubble = true; }}
              onDragStart={(e) => {
                e.cancelBubble = true;
                onDragStartHandle();
              }}
              onDragMove={(e) => {
                const stage = e.target.getStage();
                if (!stage) return;
                const pointer = stage.getPointerPosition();
                if (!pointer) return;

                const parent = e.target.getParent();
                if (!parent) return;
                const transform = parent.getAbsoluteTransform().copy().invert();
                const local = transform.point(pointer);

                // Принудительно фиксируем кружок на месте под курсором
                e.target.x(local.x);
                e.target.y(local.y);

                const newPts = [...points];
                newPts[i] = local.x;
                newPts[i + 1] = local.y;

                onUpdatePoints(newPts);
              }}
              onDragEnd={() => {
                onDragEndHandle();
                onCommit();
              }}
            />
          );
        })}
      </>
    );
  }

  if (el.shape === 'star') {
    const outerR = Math.min(w, h) / 2;
    const innerR = outerR * (el.innerRadiusRatio ?? (1 / 2.4));
    
    return (
      <Circle
        x={w / 2}
        y={h / 2 - innerR}
        radius={5}
        fill="#fff"
        stroke="#6366f1"
        strokeWidth={2}
        draggable
        onMouseDown={(e) => { e.cancelBubble = true; }}
        onDragStart={(e) => {
          e.cancelBubble = true;
          onDragStartHandle();
        }}
        onDragMove={(e) => {
          const stage = e.target.getStage();
          if (!stage) return;
          const pointer = stage.getPointerPosition();
          if (!pointer) return;
          
          const parent = e.target.getParent();
          if (!parent) return;
          const transform = parent.getAbsoluteTransform().copy().invert();
          const local = transform.point(pointer);

          const cy = h / 2;
          const dist = Math.abs(local.y - cy);
          const ratio = Math.max(0.05, Math.min(0.95, dist / outerR));

          // Фиксируем кружок на новом радиусе
          e.target.x(w / 2);
          e.target.y(h / 2 - outerR * ratio);

          onUpdatePoints([ratio]);
        }}
        onDragEnd={() => {
          onDragEndHandle();
          onCommit();
        }}
      />
    );
  }

  return null;
};