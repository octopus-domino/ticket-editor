import React, { useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Transformer, Image as KImage, Line as KLine } from 'react-konva';
import type { EditorApi } from '../../hooks/useEditor';
import type { CanvasElement } from '../../types';
import { GRID_SIZE } from '../../types';
import {
  TextEl, ImageEl, ShapeEl, LineEl, TableEl, FooterEl, PlaceholderEl, FillEl,
} from '../elements';

import { Stamp } from '../../Stamp';

interface Props {
  editor: EditorApi;
  wrapRef: React.RefObject<HTMLDivElement>;
}

export const EditorStage: React.FC<Props> = ({ editor, wrapRef }) => {
  const { activeSlide, zoom, selectedIds, editing } = editor;
  const fillsLayerRef = useRef<any>(null);

  /* ---------- Привязка Transformer ---------- */
  useEffect(() => {
    const tr = editor.trRef.current;
    const layer = editor.layerRef.current;
    if (!tr || !layer) return;

    if (!selectedIds.length) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const nodes = selectedIds
      .map((id) => layer.findOne('#' + id))
      .filter((n): n is any => !!n);

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, activeSlide, editor.trRef, editor.layerRef]);

  /* ---------- Общая прозрачность заливок (без удвоения) ---------- */
  useEffect(() => {
    const layer = fillsLayerRef.current;
    if (!layer) return;
    const canvas = layer.getCanvas?.()?._canvas as HTMLCanvasElement | undefined;
    if (canvas) canvas.style.opacity = '0.6';
  }, [activeSlide.id, activeSlide.elements]);

  const handleStageMouseDown = (e: any) => {
    if (editor.fillMode) {
      editor.handleFillClick(() => { /* onEmpty внутри */ });
      return;
    }
    if (e.target !== e.target.getStage()) return;
    if (editing) { editor.commitEdit(); return; }

    editor.clearSelection();
    editor.setFloatingPos(null);
    editor.setShowTextToolbar(false);
    editor.rubberBandStart();
  };

  const handleContextMenu = (e: any, elementId: string | null) => {
    e.evt.preventDefault();
    if (elementId && !selectedIds.includes(elementId)) editor.setSelectedIds([elementId]);
    editor.setContextMenu({ x: e.evt.clientX, y: e.evt.clientY, elementId });
    editor.setFloatingPos(null);
  };

  const commonHandlers = (el: CanvasElement) => ({
    onSelect: (e?: any) => {
      if (editor.fillMode) {
        if (el.type === 'shape' || el.type === 'fill') {
          editor.updateWithHistory(el.id, { fill: editor.fillColor });
        }
        return;
      }
      if (editing && editing.id !== el.id) editor.commitEdit();

      const shift = !!(e?.evt?.shiftKey || e?.evt?.metaKey || e?.evt?.ctrlKey);
      if (shift) {
        const ids = selectedIds.includes(el.id)
          ? selectedIds.filter((id) => id !== el.id)
          : [...selectedIds, el.id];
        editor.setSelectedIds(ids);
      } else if (!selectedIds.includes(el.id)) {
        editor.setSelectedIds([el.id]);
      }

      if (!editing || editing.id !== el.id) editor.setShowTextToolbar(false);
      if (e?.evt && e.evt.button === 0) editor.setFloatingPos({ x: e.evt.clientX, y: e.evt.clientY });
    },
    onUpdate: (p: any) => editor.updateWithHistory(el.id, p),
    onDragStart: (e: any) => editor.handleElDragStart(el, e),
    onDragMove: (e: any) => editor.handleElDragMove(el, e),
    onDragEnd: (e: any) => editor.handleElDragEnd(el, e),
    onContextMenu: (e: any) => handleContextMenu(e, el.id),
    isSelected: selectedIds.includes(el.id),
  });

  return (
    <Stage
      ref={editor.stageRef as any}
      width={activeSlide.width * zoom}
      height={activeSlide.height * zoom}
      scaleX={zoom}
      scaleY={zoom}
      onMouseDown={handleStageMouseDown}
      onMouseMove={editor.rubberBandMove}
      onMouseUp={editor.rubberBandEnd}
      onDblClick={() => {
        if (editor.fillMode && editor.fillPoints.length >= 6) editor.closePolygon();
      }}
      onDblTap={() => {
        if (editor.fillMode && editor.fillPoints.length >= 6) editor.closePolygon();
      }}
      onContextMenu={(e) => handleContextMenu(e, null)}
    >
      <Layer>
        <Rect
          x={0} y={0}
          width={activeSlide.width}
          height={activeSlide.height}
          fill={activeSlide.background}
          listening={false}
          shadowColor="#000" shadowBlur={10} shadowOpacity={0.18} shadowOffsetY={2}
        />
        {activeSlide.backgroundImage && (
          <BgImage src={activeSlide.backgroundImage} w={activeSlide.width} h={activeSlide.height} />
        )}
        {editor.showGrid && <GridLayer w={activeSlide.width} h={activeSlide.height} />}
        {editor.showMargins && (
          <Rect
            x={activeSlide.padding.left}
            y={activeSlide.padding.top}
            width={Math.max(0, activeSlide.width - activeSlide.padding.left - activeSlide.padding.right)}
            height={Math.max(0, activeSlide.height - activeSlide.padding.top - activeSlide.padding.bottom)}
            stroke="#3b82f6" strokeWidth={1} dash={[6, 4]} listening={false}
          />
        )}
        {editor.fillMode && editor.fillPoints.length >= 2 && (
          <KLine points={editor.fillPoints} stroke={editor.fillColor} strokeWidth={2} dash={[6, 4]} listening={false} />
        )}
        {editor.fillMode && editor.fillPoints.map((_, i) => {
          if (i % 2 !== 0) return null;
          return (
            <Rect key={i} x={editor.fillPoints[i] - 3} y={editor.fillPoints[i + 1] - 3}
              width={6} height={6} fill="#6366f1" cornerRadius={3} listening={false} />
          );
        })}
        {editor.rubberBand && (() => {
          const b = editor.rubberBand!;
          const x = Math.min(b.x1, b.x2);
          const y = Math.min(b.y1, b.y2);
          const w = Math.abs(b.x2 - b.x1);
          const h = Math.abs(b.y2 - b.y1);
          if (w < 2 && h < 2) return null;
          return (
            <Rect x={x} y={y} width={w} height={h}
              fill="rgba(99,102,241,0.12)" stroke="#6366f1" strokeWidth={1.5} dash={[6, 4]} listening={false} />
          );
        })()}
      </Layer>

      <Layer ref={fillsLayerRef}>
        {activeSlide.elements.filter((el) => el.type === 'fill').map((el) => (
          <FillEl key={el.id} el={el as any} {...commonHandlers(el)} />
        ))}
      </Layer>

      <Layer ref={editor.layerRef as any}>
        {activeSlide.elements.filter((el) => el.type !== 'fill').map((el) => {
          switch (el.type) {
            case 'text':
              return <TextEl key={el.id} el={el} {...commonHandlers(el)} onDblClick={() => editor.openEditor(el, 'text')} />;
            case 'image':
              return <ImageEl key={el.id} el={el} {...commonHandlers(el)} />;
            case 'shape':
              return <ShapeEl key={el.id} el={el} {...commonHandlers(el)} onDblClick={() => editor.openEditor(el, 'shapeText')} />;
            case 'line':
              return (
                <LineEl
                  key={el.id} el={el} {...commonHandlers(el)}
                  onDblClick={(sx, sy) => {
                    const localX = sx - el.x;
                    const localY = sy - el.y;
                    const pts = el.points && el.points.length >= 4 ? el.points : [0, el.height / 2, el.width, el.height / 2];
                    let bestIdx = 2;
                    let bestDist = Infinity;
                    for (let i = 0; i + 3 < pts.length; i += 2) {
                      const x1 = pts[i], y1 = pts[i + 1];
                      const x2 = pts[i + 2], y2 = pts[i + 3];
                      const dx = x2 - x1, dy = y2 - y1;
                      const len2 = dx * dx + dy * dy || 1;
                      const t = Math.max(0, Math.min(1, ((localX - x1) * dx + (localY - y1) * dy) / len2));
                      const px = x1 + t * dx, py = y1 + t * dy;
                      const d = Math.hypot(localX - px, localY - py);
                      if (d < bestDist) { bestDist = d; bestIdx = i + 2; }
                    }
                    const newPts = [...pts.slice(0, bestIdx), localX, localY, ...pts.slice(bestIdx)];
                    editor.updateWithHistory(el.id, { points: newPts });
                  }}
                />
              );
            case 'table':
              return <TableEl key={el.id} el={el} {...commonHandlers(el)} onCellDblClick={(r, c) => editor.openCellEditor(el, r, c)} />;
            case 'footer':
              return <FooterEl key={el.id} el={el} {...commonHandlers(el)} onDblClick={() => editor.openEditor(el, 'footerText')} />;
            case 'placeholder':
              return <PlaceholderEl key={el.id} el={el} {...commonHandlers(el)} />;
            case 'stamp':
              return (
                <Stamp key={el.id} el={el}
                  onSelect={commonHandlers(el).onSelect}
                  onUpdate={commonHandlers(el).onUpdate}
                  onDragStart={commonHandlers(el).onDragStart}
                  onDragMove={commonHandlers(el).onDragMove}
                  onDragEnd={commonHandlers(el).onDragEnd}
                  onContextMenu={commonHandlers(el).onContextMenu}
                  onDblClick={(zone) => {
                    const field = zone === 'center' ? 'centerText' : zone === 'top' ? 'topText' : 'bottomText';
                    editor.openEditor(el, field as any);
                  }}
                />
              );
            default:
              return null;
          }
        })}

        {editor.guides.v.map((x, i) => (
          <Rect key={`gv-${i}`} x={x} y={0} width={1} height={activeSlide.height} fill="#ef4444" opacity={0.7} listening={false} />
        ))}
        {editor.guides.h.map((y, i) => (
          <Rect key={`gh-${i}`} x={0} y={y} width={activeSlide.width} height={1} fill="#ef4444" opacity={0.7} listening={false} />
        ))}

        <Transformer
          ref={editor.trRef as any}
          rotateEnabled
          borderStroke="#f59e0b"
          anchorStroke="#f59e0b"
          anchorFill="#fbbf24"
          anchorSize={10}
          anchorCornerRadius={2}
          boundBoxFunc={(o, n) => (n.width < 20 || n.height < 20 ? o : n)}
        />
      </Layer>
    </Stage>
  );
};

const BgImage: React.FC<{ src: string; w: number; h: number }> = ({ src, w, h }) => {
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);
  React.useEffect(() => {
    const i = new window.Image();
    i.src = src;
    i.onload = () => setImg(i);
  }, [src]);
  if (!img) return null;
  return <KImage x={0} y={0} width={w} height={h} image={img} listening={false} />;
};

const GridLayer: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const lines: React.ReactNode[] = [];
  for (let x = 0; x <= w; x += GRID_SIZE) {
    lines.push(<Rect key={`gx-${x}`} x={x} y={0} width={0.5} height={h} fill="#e5e7eb" listening={false} />);
  }
  for (let y = 0; y <= h; y += GRID_SIZE) {
    lines.push(<Rect key={`gy-${y}`} x={0} y={y} width={w} height={0.5} fill="#e5e7eb" listening={false} />);
  }
  return <>{lines}</>;
};