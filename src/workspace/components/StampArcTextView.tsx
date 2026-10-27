import React, { useRef, useMemo } from 'react';
import { Group, Rect, Line, Shape } from 'react-konva';
import type Konva from 'konva';
import type { StampTextItem, StampShapeItem } from '../../types';
import { canvasFont, drawArcText } from '../../lib/stamps/render';
import {
  arcTextBBox,
  findNearestShapeByCursor,
  computeArcParamsForAngle,
  closestPointOnHostPerimeter,
  drawPerimeterText,
  DEFAULT_ARC_OFFSET,
  DEFAULT_ARC_SPAN_DEG,
} from './stampSnap';

interface Props {
  text: StampTextItem;
  shapes: StampShapeItem[];
  snapEnabled: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDblClick: () => void;
  onUpdate: (patch: Partial<StampTextItem>) => void;
}

/* ============================================================
   Определение эффективных радиусов дуги
   ============================================================
   1. Если на тексте явно заданы arcRx/arcRy — используем их.
   2. Иначе, если host — эллипс и rx != ry, берём радиусы host
      с учётом знака «снаружи/внутри».
   3. Иначе — круговой arcRadius.
*/
function resolveArcRadii(
  text: StampTextItem,
  host: StampShapeItem | null,
  arcOffset: number,
): { rx: number; ry: number } {
  if (text.arcRx != null || text.arcRy != null) {
    return {
      rx: text.arcRx ?? text.arcRadius,
      ry: text.arcRy ?? text.arcRadius,
    };
  }
  if (host && host.kind === 'ellipse' && host.width !== host.height) {
    const sign = text.arcOutside ? 1 : -1;
    const minR = text.fontSize * 0.8;
    return {
      rx: Math.max(minR, host.width / 2 + sign * arcOffset),
      ry: Math.max(minR, host.height / 2 + sign * arcOffset),
    };
  }
  return { rx: text.arcRadius, ry: text.arcRadius };
}

export const StampArcTextView: React.FC<Props> = ({
  text, shapes, snapEnabled, draggable,
  onSelect, onDblClick, onUpdate,
}) => {
  const groupRef = useRef<Konva.Group>(null);

  const host = text.arcHostId
    ? shapes.find((s) => s.id === text.arcHostId) || null
    : shapes.find((s) => {
        if (s.hidden || s.kind === 'line' || s.kind === 'fill') return false;
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        return Math.abs(cx - text.arcCx) < 1 && Math.abs(cy - text.arcCy) < 1;
      }) || null;

  const arcOffset = text.arcOffset ?? DEFAULT_ARC_OFFSET;
  const isOutside = !!text.arcOutside;
  const spanDeg = text.arcSpanDeg
    ?? Math.abs(text.arcEndDeg - text.arcStartDeg)
    ?? DEFAULT_ARC_SPAN_DEG;
  const centerDeg = (text.arcStartDeg + text.arcEndDeg) / 2;

  const onPerimeter = !!host && (host.kind === 'rect' || host.kind === 'triangle');

  /* Эффективные радиусы дуги */
  const { rx, ry } = resolveArcRadii(text, host, arcOffset);

  const bbox = arcTextBBox({
    text: text.text,
    arcCx: text.arcCx, arcCy: text.arcCy,
    arcRadius: text.arcRadius,
    arcRx: rx, arcRy: ry,
    arcStartDeg: text.arcStartDeg, arcEndDeg: text.arcEndDeg,
    fontSize: text.fontSize,
  });

  const arcHitPoints = useMemo(() => {
    if (onPerimeter) return [] as number[];
    const steps = 64;
    const start = (text.arcStartDeg * Math.PI) / 180;
    const end = (text.arcEndDeg * Math.PI) / 180;
    const out: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = start + (end - start) * (i / steps);
      out.push(
        text.arcCx + Math.cos(a) * rx,
        text.arcCy + Math.sin(a) * ry,
      );
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPerimeter, text.arcCx, text.arcCy, rx, ry, text.arcStartDeg, text.arcEndDeg]);

  const handlers = {
    onClick: (e: any) => { e.cancelBubble = true; onSelect(); },
    onTap: (e: any) => { e.cancelBubble = true; onSelect(); },
    onDblClick: (e: any) => { e.cancelBubble = true; onDblClick(); },
    onDblTap: (e: any) => { e.cancelBubble = true; onDblClick(); },
  };

  const handleDragEnd = (e: any) => {
    const g = groupRef.current;
    if (!g) return;

    const dx = g.x();
    const dy = g.y();
    g.x(0);
    g.y(0);

    const nx = text.arcCx + dx;
    const ny = text.arcCy + dy;

    if (snapEnabled) {
      const stage = e.target.getStage();
      const pos = stage?.getRelativePointerPosition?.();

      if (pos) {
        const target = findNearestShapeByCursor(pos.x, pos.y, shapes, 260);

        if (target) {
          const signed = target.isOutside ? -arcOffset : arcOffset;
          const [cpx, cpy] = closestPointOnHostPerimeter(
            target.host, signed, pos.x, pos.y,
          );
          const hostCx = target.host.x + target.host.width / 2;
          const hostCy = target.host.y + target.host.height / 2;
          const angleRad = Math.atan2(cpy - hostCy, cpx - hostCx);

          const params = computeArcParamsForAngle(
            target.host, angleRad, text.fontSize,
            target.isOutside, spanDeg, arcOffset,
          );

          onUpdate({
            ...params,
            arcHostId: target.host.id,
            arcOutside: target.isOutside,
          });
          return;
        }
      }
    }

    onUpdate({ arcCx: Math.round(nx), arcCy: Math.round(ny) });
  };

  let hitPoints: number[] = [];
  if (host) {
    if (host.kind === 'rect') {
      hitPoints = [
        host.x, host.y,
        host.x + host.width, host.y,
        host.x + host.width, host.y + host.height,
        host.x, host.y + host.height,
      ];
    } else if (host.kind === 'triangle') {
      hitPoints = [
        host.x + host.width / 2, host.y,
        host.x + host.width, host.y + host.height,
        host.x, host.y + host.height,
      ];
    }
  }

  return (
    <Group
      ref={groupRef}
      id={text.id}
      name="text-arc"
      x={0}
      y={0}
      draggable={draggable}
      onDragEnd={handleDragEnd}
      {...handlers}
    >
      {onPerimeter && host ? (
        <>
          <Group x={host.x} y={host.y} listening={false}>
            <Shape
              listening={false}
              sceneFunc={(ctx) => {
                const c = (ctx as any)._context as CanvasRenderingContext2D;
                drawPerimeterText(c, {
                  host, arcOffset, isOutside, centerDeg,
                  text: text.text,
                  fontSize: text.fontSize,
                  fontFamily: text.fontFamily,
                  fontStyle: text.fontStyle,
                  fill: text.fill,
                });
              }}
            />
          </Group>

          <Line
            points={hitPoints}
            closed
            stroke="rgba(0,0,0,0.001)"
            strokeWidth={1}
            hitStrokeWidth={Math.max(12, text.fontSize * 1.2)}
            lineJoin="round"
            lineCap="round"
            listening={true}
          />
        </>
      ) : (
        <>
          <Shape
            listening={false}
            sceneFunc={(ctx) => {
              const c = (ctx as any)._context as CanvasRenderingContext2D;
              drawArcText(c, {
                text: text.text,
                cx: text.arcCx, cy: text.arcCy,
                radius: text.arcRadius,
                radiusX: rx,
                radiusY: ry,
                startDeg: text.arcStartDeg,
                endDeg: text.arcEndDeg,
                flip: text.arcFlip,
                font: canvasFont(text.fontFamily, text.fontStyle, text.fontSize),
                fill: text.fill,
              });
            }}
          />

          <Line
            points={arcHitPoints}
            stroke="rgba(0,0,0,0.001)"
            strokeWidth={1}
            hitStrokeWidth={Math.max(14, text.fontSize * 1.5)}
            lineCap="round"
            lineJoin="round"
            listening={true}
          />

          <Rect
            x={bbox.x + bbox.width / 2 - 8}
            y={bbox.y + bbox.height / 2 - 8}
            width={16}
            height={16}
            fill="rgba(0,0,0,0.001)"
            listening={true}
          />
        </>
      )}
    </Group>
  );
};