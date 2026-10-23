import { useCallback } from 'react';
import type Konva from 'konva';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { ModalsStore } from '../../stores/ModalsStore';
import type { Slide, FillElement } from '@/shared/types';
import { generateId } from '@/shared/utils/id';
import { hitShapeEl } from '@/lib/geometry';
import { rasterizeFloodFill } from '@/lib/canvas/floodFill';

interface Params {
  docStore: DocumentStore;
  modalsStore: ModalsStore;
  slide: Slide;
  stageRef: React.RefObject<Konva.Stage>;
}

export function useCanvasFillMode({ docStore, modalsStore, slide, stageRef }: Params) {
  const applyFill = useCallback((wx: number, wy: number) => {
    const state = modalsStore.getState();
    const color = state.fillColor;

    const hit = slide.elements.slice().reverse().find((el) => hitShapeEl(el, wx, wy));

    if (hit && hit.type === 'fill') {
      docStore.commit((draft) => {
        const s = draft.slides.find((x) => x.id === draft.activeId);
        const t = s?.elements.find((x) => x.id === hit.id);
        if (t && t.type === 'fill') t.fill = color;
      }, `fill-${hit.id}`);
      return;
    }

    if (hit && hit.type === 'shape') {
      const stage = stageRef.current;
      if (stage) {
        // Растеризуем область с учетом всех пересечений
        const result = rasterizeFloodFill(
          stage, 'elements-layer',
          wx, wy,
          slide.width, slide.height,
          color,
        );
        if (result) {
          docStore.commit((draft) => {
            const s = draft.slides.find((x) => x.id === draft.activeId);
            const t = s?.elements.find((x) => x.id === hit.id);
            if (t && t.type === 'shape') {
              // Сохраняем координаты относительно фигуры (0..1)
              t.rasterFill = {
                src: result.dataUrl,
                relX: (result.x - t.x) / t.width,
                relY: (result.y - t.y) / t.height,
                relW: result.width / t.width,
                relH: result.height / t.height,
              };
              t.fill = 'transparent'; // Сбрасываем обычную заливку
            }
          }, `fill-raster-${hit.id}`);
          return;
        }
      }

      // Fallback
      docStore.commit((draft) => {
        const s = draft.slides.find((x) => x.id === draft.activeId);
        const t = s?.elements.find((x) => x.id === hit.id);
        if (t && t.type === 'shape') {
          t.fill = color;
          t.rasterFill = undefined;
        }
      }, `fill-shape-${hit.id}`);
      return;
    }

    modalsStore.setFillPoints([...state.fillPoints, wx, wy]);
  }, [docStore, modalsStore, slide, stageRef]);

  const closePolygon = useCallback(() => {
    const state = modalsStore.getState();
    const pts = state.fillPoints;
    if (pts.length < 6) return;

    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < pts.length; i += 2) { xs.push(pts[i]); ys.push(pts[i + 1]); }
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    docStore.commit((draft) => {
      const s = draft.slides.find((x) => x.id === draft.activeId);
      if (!s) return;
      const el: FillElement = {
        id: generateId(), type: 'fill',
        x: minX, y: minY,
        width: Math.max(1, maxX - minX),
        height: Math.max(1, maxY - minY),
        rotation: 0,
        points: pts.map((v, i) => (i % 2 === 0 ? v - minX : v - minY)),
        fill: state.fillColor, stroke: '', strokeWidth: 0, opacity: 1,
      };
      s.elements.push(el);
    });
    modalsStore.setFillPoints([]);
  }, [docStore, modalsStore]);

  return {
    applyFill, closePolygon,
    points: () => modalsStore.getState().fillPoints,
  };
}