import React from 'react';
import { Layer, Rect, Line, Shape } from 'react-konva';
import { GRID_SIZE } from '@/shared/constants';

interface Props {
  width: number;
  height: number;
  zoom: number;
  showGrid: boolean;
}

export const StampBackgroundLayer: React.FC<Props> = ({
  width, height, zoom, showGrid,
}) => {
  const strokeWidth = Math.max(0.75, 1 / zoom);

  return (
    <Layer>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#ffffff"
        shadowColor="#000"
        shadowBlur={14}
        shadowOpacity={0.12}
        listening={false}
      />

      {showGrid && (
        <Shape
          listening={false}
          sceneFunc={(ctx) => {
            const c = (ctx as any)._context as CanvasRenderingContext2D;
            c.beginPath();

            // Малые линии каждые GRID_SIZE
            for (let x = 0; x <= width; x += GRID_SIZE) {
              c.moveTo(x, 0);
              c.lineTo(x, height);
            }
            for (let y = 0; y <= height; y += GRID_SIZE) {
              c.moveTo(0, y);
              c.lineTo(width, y);
            }
            c.strokeStyle = '#d5dbe3';
            c.lineWidth = strokeWidth;
            c.stroke();

            // Усиленные линии каждые 5×GRID_SIZE — визуальный ориентир
            c.beginPath();
            for (let x = 0; x <= width; x += GRID_SIZE * 5) {
              c.moveTo(x, 0);
              c.lineTo(x, height);
            }
            for (let y = 0; y <= height; y += GRID_SIZE * 5) {
              c.moveTo(0, y);
              c.lineTo(width, y);
            }
            c.strokeStyle = '#b8c2cf';
            c.lineWidth = strokeWidth * 1.25;
            c.stroke();
          }}
        />
      )}

      {/* Cross-hairs по центру */}
      <Line
        points={[width / 2, 0, width / 2, height]}
        stroke="#93c5fd"
        strokeWidth={Math.max(0.75, 1 / zoom)}
        dash={[4 / zoom, 4 / zoom]}
        listening={false}
      />
      <Line
        points={[0, height / 2, width, height / 2]}
        stroke="#93c5fd"
        strokeWidth={Math.max(0.75, 1 / zoom)}
        dash={[4 / zoom, 4 / zoom]}
        listening={false}
      />

      {/* Внешняя граница */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        stroke="#94a3b8"
        strokeWidth={Math.max(1, 1.5 / zoom)}
        listening={false}
      />
    </Layer>
  );
};