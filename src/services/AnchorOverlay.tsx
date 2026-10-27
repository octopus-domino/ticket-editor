import React from 'react';
import { Group, Circle } from 'react-konva';
import type { CanvasElement, AnchorSide } from '../../types';
import { getAnchorPoint } from '../../lib/connectors';

interface Props {
  element: CanvasElement | null;
  zoom: number;
  onStartDraft: (side: AnchorSide, e: any) => void;
}

const SIDES: AnchorSide[] = ['top', 'right', 'bottom', 'left'];

const HIT_R = 12;   // screen-px: невидимая зона захвата
const VIS_R = 6;    // screen-px: видимый кружок

export const AnchorOverlay: React.FC<Props> = ({ element, zoom, onStartDraft }) => {
  if (!element) return null;
  if (element.type === 'connector' || element.type === 'line') return null;

  return (
    <Group>
      {SIDES.map((side) => {
        const p = getAnchorPoint(element, side);
        return (
          <Group key={side}>
            {/* Невидимая hit-зона — ловит клики и мышь */}
            <Circle
              x={p.x}
              y={p.y}
              radius={HIT_R / zoom}
              fill="rgba(0,0,0,0.001)"
              listening={true}
              onMouseDown={(e) => {
                e.cancelBubble = true;
                onStartDraft(side, e);
              }}
              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'crosshair';
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'default';
              }}
            />
            {/* Видимый кружок — не слушает события, только рисуется */}
            <Circle
              x={p.x}
              y={p.y}
              radius={VIS_R / zoom}
              fill="#ffffff"
              stroke="#6366f1"
              strokeWidth={2 / zoom}
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
};