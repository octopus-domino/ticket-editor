/**
 * Grid Layer Component - Presentation Layer
 * Renders canvas grid
 */

import React from 'react';
import { Shape } from 'react-konva';
import { GRID_SIZE } from '@/shared/constants';

interface GridLayerProps {
  width: number;
  height: number;
}

export const GridLayer: React.FC<GridLayerProps> = ({ width, height }) => {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx, shape) => {
        const context = ctx._context as CanvasRenderingContext2D;
        context.beginPath();

        // Vertical lines
        for (let x = 0; x <= width; x += GRID_SIZE) {
          context.moveTo(x, 0);
          context.lineTo(x, height);
        }

        // Horizontal lines
        for (let y = 0; y <= height; y += GRID_SIZE) {
          context.moveTo(0, y);
          context.lineTo(width, y);
        }

        context.strokeStyle = '#eef2f7';
        context.lineWidth = 1;
        context.stroke();

        ctx.strokeShape(shape);
      }}
    />
  );
};

GridLayer.displayName = 'GridLayer';
