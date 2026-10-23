import React from 'react';
import { Line, Circle } from 'react-konva';
import { STAMP_DASH_MAP as DASH_MAP } from '@/lib/stamps/render';
import type { DashType } from '@/shared/types';

export interface PolylineRendererProps {
  points: number[];
  stroke: string;
  strokeWidth: number;
  dash?: DashType;
  isArrow?: boolean;
  isSelected?: boolean;
  hitStrokeWidth?: number;
  handleRadius?: number;
  onPointMove?: (index: number, x: number, y: number) => void;
  onPointMoveEnd?: (index: number, x: number, y: number) => void;
  onPointContextMenu?: (index: number, e: any) => void;
}

export const PolylineRenderer: React.FC<PolylineRendererProps> = ({
  points,
  stroke,
  strokeWidth,
  dash = 'solid',
  isArrow = false,
  isSelected = false,
  hitStrokeWidth = 20,
  handleRadius = 6,
  onPointMove,
  onPointMoveEnd,
  onPointContextMenu,
}) => {
  if (!points || points.length < 4) return null;

  const dashArr = DASH_MAP[dash];

  const arrowNode = (() => {
    if (!isArrow || points.length < 4) return null;
    const n = points.length;
    const x1 = points[n - 4], y1 = points[n - 3];
    const x2 = points[n - 2], y2 = points[n - 1];
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = 14;
    const a1 = angle + Math.PI - 0.35;
    const a2 = angle + Math.PI + 0.35;
    return (
      <Line
        points={[
          x2 + len * Math.cos(a1), y2 + len * Math.sin(a1),
          x2, y2,
          x2 + len * Math.cos(a2), y2 + len * Math.sin(a2),
        ]}
        stroke={stroke}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
    );
  })();

  const pointCount = points.length / 2;

  return (
    <>
      <Line
        points={points}
        stroke="rgba(0,0,0,0.001)"
        strokeWidth={hitStrokeWidth}
        lineCap="round"
        lineJoin="round"
        listening={true}
      />
      <Line
        points={points}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dashArr}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
      {arrowNode}
      {isSelected && Array.from({ length: pointCount }).map((_, i) => {
        const px = points[i * 2];
        const py = points[i * 2 + 1];
        return (
          <Circle
            key={i}
            x={px}
            y={py}
            radius={handleRadius}
            fill="#fbbf24"
            stroke="#f59e0b"
            strokeWidth={1.5}
            draggable
            onMouseDown={(e) => { e.cancelBubble = true; }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              onPointMove?.(i, e.target.x(), e.target.y());
            }}
            onDragEnd={(e) => {
              e.cancelBubble = true;
              onPointMoveEnd?.(i, e.target.x(), e.target.y());
            }}
            onContextMenu={(e) => {
              if (!onPointContextMenu) return;
              e.evt.preventDefault();
              e.cancelBubble = true;
              onPointContextMenu(i, e);
            }}
          />
        );
      })}
    </>
  );
};