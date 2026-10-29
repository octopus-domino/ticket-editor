// src/presentation/components/canvas/CanvasPreviewLayer.tsx
import React, { useSyncExternalStore } from 'react';
import { Layer, Line, Rect, Circle } from 'react-konva';
import type { CanvasElement, AnchorSide } from '@/shared/types';
import type { Rect as RectType } from '@/lib/connectors';
import { getAnchorPoint } from '@/lib/connectors';
import { guidesStore } from '@/ui/stores/GuidesStore';
import { hoverStore } from '@/ui/stores/HoverStore';
import { GroupBBoxOverlay } from './GroupBBoxOverlay';

interface DraftState {
  fromId: string;
  fromSide: AnchorSide;
  toX: number;
  toY: number;
}

interface RubberBandBox {
  x1: number; y1: number; x2: number; y2: number;
}

interface Props {
  zoom: number;
  fillPoints: number[];
  draft: DraftState | null;
  elements: CanvasElement[];
  rubberBand: RubberBandBox | null;
  onStartDraft: (id: string, side: AnchorSide, clientX: number, clientY: number) => void;
  ghostRect: RectType | null;
  selectedIds: string[];
  slideWidth: number;
  slideHeight: number;
  listening?: boolean;
  editorMode?: 'print' | 'schema';
}

export const CanvasPreviewLayer: React.FC<Props> = ({
  zoom, fillPoints, draft, elements, rubberBand,
  onStartDraft, ghostRect, selectedIds, slideWidth, slideHeight, listening = true,
  editorMode = 'print',
}) => {
  const hoveredId = useSyncExternalStore(hoverStore.subscribe, hoverStore.getSnapshot);
  const guides = useSyncExternalStore(guidesStore.subscribe, guidesStore.getSnapshot);

  const from = draft ? elements.find((x) => x.id === draft.fromId) : null;
  const fromPoint = from && draft ? getAnchorPoint(from, draft.fromSide) : null;
  const hoveredEl = hoveredId ? elements.find((x) => x.id === hoveredId) ?? null : null;
  const isPolygon = hoveredEl?.type === 'shape' && (hoveredEl as any).shape === 'polygon';

  const showAnchors =
    editorMode === 'schema' &&
    !!hoveredEl &&
    hoveredEl.type !== 'group' &&
    !isPolygon &&
    !draft &&
    !rubberBand &&
    !selectedIds.includes(hoveredEl.id);

  return (
    <Layer listening={listening}>
      {guides.v.map((x, i) => (
        <Line key={`gv-${i}`} points={[x, 0, x, slideHeight]} stroke="#ef4444" strokeWidth={1 / zoom} dash={[4 / zoom, 4 / zoom]} listening={false} perfectDrawEnabled={false} />
      ))}
      {guides.h.map((y, i) => (
        <Line key={`gh-${i}`} points={[0, y, slideWidth, y]} stroke="#ef4444" strokeWidth={1 / zoom} dash={[4 / zoom, 4 / zoom]} listening={false} perfectDrawEnabled={false} />
      ))}

      {selectedIds.length > 1 && (
        <GroupBBoxOverlay selectedIds={selectedIds} elements={elements} zoom={zoom} />
      )}

      {fillPoints.length >= 2 && (
        <Line points={fillPoints} stroke="#6366f1" strokeWidth={1.5 / zoom} dash={[6 / zoom, 4 / zoom]} listening={false} perfectDrawEnabled={false} />
      )}
      {fillPoints.length >= 2 && Array.from({ length: fillPoints.length / 2 }).map((_, i) => (
        <Rect key={`fp-${i}`} x={(fillPoints[i * 2] ?? 0) - 3 / zoom} y={(fillPoints[i * 2 + 1] ?? 0) - 3 / zoom} width={6 / zoom} height={6 / zoom} fill="#6366f1" listening={false} perfectDrawEnabled={false} />
      ))}

      {draft && fromPoint && (
        <Line points={[fromPoint.x, fromPoint.y, draft.toX, draft.toY]} stroke="#6366f1" strokeWidth={1.5 / zoom} dash={[6 / zoom, 4 / zoom]} listening={false} perfectDrawEnabled={false} />
      )}

      {ghostRect && (
        <Rect x={ghostRect.x} y={ghostRect.y} width={ghostRect.width} height={ghostRect.height} stroke="#6366f1" strokeWidth={2 / zoom} dash={[6 / zoom, 4 / zoom]} fill="rgba(99,102,241,0.1)" listening={false} perfectDrawEnabled={false} />
      )}

      {showAnchors && (['top', 'right', 'bottom', 'left'] as AnchorSide[]).map((side) => {
        const pos = getAnchorPoint(hoveredEl!, side);
        return (
          <Circle key={side} x={pos.x} y={pos.y} radius={6 / zoom} fill="#fbbf24" stroke="#f59e0b" strokeWidth={1.5 / zoom}
            onMouseDown={(e) => { e.cancelBubble = true; onStartDraft(hoveredEl!.id, side, e.evt.clientX, e.evt.clientY); }}
            onMouseEnter={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'crosshair'; }}
            onMouseLeave={(e) => { const stage = e.target.getStage(); if (stage) stage.container().style.cursor = 'default'; }}
          />
        );
      })}

      {rubberBand && (
        <Rect x={Math.min(rubberBand.x1, rubberBand.x2)} y={Math.min(rubberBand.y1, rubberBand.y2)} width={Math.abs(rubberBand.x2 - rubberBand.x1)} height={Math.abs(rubberBand.y2 - rubberBand.y1)} fill="rgba(99,102,241,0.12)" stroke="#6366f1" strokeWidth={1.5 / zoom} dash={[6 / zoom, 4 / zoom]} listening={false} perfectDrawEnabled={false} />
      )}
    </Layer>
  );
};