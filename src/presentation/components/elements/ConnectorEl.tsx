import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { Group, Line, Text as KonvaText, Circle } from 'react-konva';
import type { ConnectorElement, CanvasElement } from '@/shared/types';
import type { CommonProps } from './types';
import { STAMP_DASH_MAP } from '@/lib/stamps/render';
import {
  routeConnector, midpointOfPath, resolveConnectorEnds, findNearestAnchor,
} from '@/lib/connectors';
import { dragLiveStore } from '../../stores/DragLiveStore';

interface Props extends CommonProps<ConnectorElement> {
  el: ConnectorElement;
  elements: CanvasElement[];
  onUpdate: (patch: Partial<ConnectorElement>) => void;
}

export const ConnectorEl: React.FC<Props> = ({
  el, elements, onSelect, onContextMenu, isSelected, onUpdate,
}) => {
  const dragVersion = useSyncExternalStore(dragLiveStore.subscribe, dragLiveStore.getSnapshot);

  const { from, to } = useMemo(
    () => resolveConnectorEnds(el, elements),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [el.fromId, el.toId, elements],
  );

  const obstacles = useMemo(
    () => elements.filter((e) =>
      // Исключаем группы, коннекторы, заливки и линии
      e.type !== 'connector' && e.type !== 'fill' && e.type !== 'line' && e.type !== 'group' && !e.locked
    ),
    [elements],
  );

  const [dragState, setDragState] = useState<{ endpoint: 'from' | 'to'; x: number; y: number } | null>(null);

  const points = useMemo(() => {
    if (!from || !to) return null;

    const liveFrom = dragLiveStore.get(el.fromId);
    const liveTo = dragLiveStore.get(el.toId);
    const fromEff = liveFrom ? { ...from, ...liveFrom } : from;
    const toEff = liveTo ? { ...to, ...liveTo } : to;

    let pts = routeConnector(fromEff, el.fromAnchor, toEff, el.toAnchor, el.routing, obstacles);

    if (dragState) {
      pts = [...pts];
      if (dragState.endpoint === 'from') { pts[0] = dragState.x; pts[1] = dragState.y; }
      else { pts[pts.length - 2] = dragState.x; pts[pts.length - 1] = dragState.y; }
    }
    return pts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, el.routing, el.fromAnchor, el.toAnchor, obstacles, dragState, el.fromId, el.toId, dragVersion]);

  const arrowHead = useMemo(() => {
    if (!el.isArrow || !points) return null;
    const n = points.length;
    const x2 = points[n - 2], y2 = points[n - 1];
    let i = n - 4;
    while (i > 0 && Math.hypot(x2 - points[i], y2 - points[i + 1]) < 2) i -= 2;
    const x1 = points[i], y1 = points[i + 1];
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = 14, spread = 0.4;
    return [
      x2 + len * Math.cos(angle + Math.PI - spread), y2 + len * Math.sin(angle + Math.PI - spread),
      x2, y2,
      x2 + len * Math.cos(angle + Math.PI + spread), y2 + len * Math.sin(angle + Math.PI + spread),
    ];
  }, [el.isArrow, points]);

  const labelPos = useMemo(() => {
    if (!el.label || !points) return null;
    const m = midpointOfPath(points);
    return { x: m.x + (el.labelOffsetX || 0), y: m.y + (el.labelOffsetY || 0) };
  }, [el.label, el.labelOffsetX, el.labelOffsetY, points]);

  if (!points || !from || !to) return null;

  const dashArr = STAMP_DASH_MAP[el.dash];
  const startX = points[0], startY = points[1];
  const endX = points[points.length - 2], endY = points[points.length - 1];

  const handleDragMove = (endpoint: 'from' | 'to', e: any) => {
    setDragState({ endpoint, x: e.target.x(), y: e.target.y() });
  };

  const handleDragEnd = (endpoint: 'from' | 'to', e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) { setDragState(null); return; }
    const transform = stage.getAbsoluteTransform().copy().invert();
    const pos = transform.point(pointer);
    const wx = pos.x, wy = pos.y;
    const targetEl = elements.find(
      (e) => e.id !== (endpoint === 'from' ? el.toId : el.fromId) && e.type !== 'connector' && e.type !== 'group' && !e.locked &&
      wx >= e.x && wx <= e.x + e.width && wy >= e.y && wy <= e.y + e.height
    );
    if (targetEl) {
      const nearest = findNearestAnchor(targetEl, wx, wy);
      if (nearest.distance < 40) {
        if (endpoint === 'from') onUpdate({ fromId: targetEl.id, fromAnchor: nearest.side });
        else onUpdate({ toId: targetEl.id, toAnchor: nearest.side });
      }
    }
    setDragState(null);
  };

  return (
    <Group id={el.id} name="element" onMouseDown={(e) => { e.cancelBubble = true; onSelect(e); }} onContextMenu={onContextMenu}>
      <Line points={points} stroke="rgba(0,0,0,0.001)" strokeWidth={20} lineCap="round" lineJoin="round" listening />
      <Line points={points} stroke={el.stroke} strokeWidth={el.strokeWidth} dash={dashArr} lineCap="round" lineJoin="round" listening={false} />
      {arrowHead && <Line points={arrowHead} stroke={el.stroke} strokeWidth={el.strokeWidth} lineCap="round" lineJoin="round" listening={false} />}
      {labelPos && el.label && (
        <KonvaText x={labelPos.x} y={labelPos.y} text={el.label} fontSize={el.labelFontSize || 12} fontFamily="Arial" fill={el.labelFill || el.stroke} offsetX={el.label.length * (el.labelFontSize || 12) * 0.3} offsetY={(el.labelFontSize || 12) / 2} listening={false} />
      )}
      {isSelected && (
        <>
          <Circle x={startX} y={startY} radius={8} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} draggable
            onMouseDown={(e) => { e.cancelBubble = true; }}
            onDragStart={(e) => handleDragMove('from', e)} onDragMove={(e) => handleDragMove('from', e)} onDragEnd={(e) => handleDragEnd('from', e)} />
          <Circle x={endX} y={endY} radius={8} fill="#fbbf24" stroke="#f59e0b" strokeWidth={2} draggable
            onMouseDown={(e) => { e.cancelBubble = true; }}
            onDragStart={(e) => handleDragMove('to', e)} onDragMove={(e) => handleDragMove('to', e)} onDragEnd={(e) => handleDragEnd('to', e)} />
        </>
      )}
    </Group>
  );
};