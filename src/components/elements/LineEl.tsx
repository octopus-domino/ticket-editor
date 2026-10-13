import React from 'react';
import { Group, Rect, Circle, Line } from 'react-konva';
import type { LineElement } from '../../types';
import { DASH_MAP } from './dashMap';
import type { CommonProps } from './types';

interface Props extends CommonProps {
  el: LineElement;
  onUpdate: (p: Partial<LineElement>) => void;
  onDblClick?: (stageX: number, stageY: number) => void;
}

export const LineEl: React.FC<Props> = ({
  el, onSelect, onUpdate, onDblClick,
  onDragStart, onDragMove, onDragEnd, onContextMenu, isSelected,
}) => {
  const points = el.points && el.points.length >= 4
    ? el.points
    : [0, el.height / 2, el.width, el.height / 2];

  const updatePoint = (idx: number, x: number, y: number) => {
    const np = [...points];
    np[idx * 2] = x;
    np[idx * 2 + 1] = y;
    onUpdate({ points: np });
  };

  const handleDblClick = (e: any) => {
    e.cancelBubble = true;
    if (!onDblClick) return;
    const stage = e.target.getStage();
    const p = stage?.getPointerPosition();
    if (!p || !stage) return;
    onDblClick(p.x / stage.scaleX(), p.y / stage.scaleY());
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
    >
      {/* Невидимая жирная линия для захвата */}
      <Line points={points} stroke="rgba(0,0,0,0.001)" strokeWidth={20} lineCap="round" listening={true} />

      {/* Видимая линия */}
      <Line
        points={points}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        dash={DASH_MAP[el.dash]}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />

      {/* Стрелка */}
      {el.isArrow && points.length >= 4 && (() => {
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
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        );
      })()}

      {/* Опорные точки */}
      {isSelected && points.map((_, i) => {
        if (i % 2 !== 0) return null;
        const px = points[i], py = points[i + 1];
        return (
          <Circle
            key={i}
            x={px} y={py}
            radius={6}
            fill="#fbbf24"
            stroke="#f59e0b"
            strokeWidth={1.5}
            draggable
            onMouseDown={(e) => { e.cancelBubble = true; }}
            onDragMove={(e) => {
              e.cancelBubble = true;
              updatePoint(i / 2, e.target.x(), e.target.y());
            }}
            onDragEnd={(e) => { e.cancelBubble = true; }}
          />
        );
      })}
    </Group>
  );
};