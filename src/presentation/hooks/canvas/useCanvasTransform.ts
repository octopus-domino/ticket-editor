import { useCallback } from 'react';
import type Konva from 'konva';
import type { RefObject } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { CanvasElement } from '@/shared/types';

/** Commit one completed selection transform, independent of the event's target. */
export function useCanvasTransform(
  docStore: DocumentStore,
  transformer: RefObject<Konva.Transformer>,
) {
  return useCallback(() => {
    const changes = (transformer.current?.nodes() ?? []).map((node) => ({
      node,
      id: node.id(),
      x: node.x(),
      y: node.y(),
      sx: node.scaleX(),
      sy: node.scaleY(),
      rotation: node.rotation(),
    }));
    if (!changes.length) return;
    changes.forEach(({ node }) => node.scale({ x: 1, y: 1 }));
    docStore.commit((draft) => {
      const slide = draft.slides.find((page) => page.id === draft.activeId);
      if (!slide) return;
      const selected = new Set(changes.map((change) => change.id));
      const byId = new Map(slide.elements.map((element) => [element.id, element]));
      const children = new Set(
        slide.elements
          .filter((element) => selected.has(element.id) && element.type === 'group')
          .flatMap((element) => (element.type === 'group' ? element.children : [])),
      );
      for (const change of changes) {
        if (children.has(change.id)) continue;
        const element = byId.get(change.id);
        if (!element || element.locked) continue;
        const oldX = element.x,
          oldY = element.y;
        const oldAngle = ((element.rotation ?? 0) * Math.PI) / 180;
        const newAngle = (change.rotation * Math.PI) / 180;
        const descendants = new Set<string>();
        const collect = (item: CanvasElement) => {
          if (
            item.clipPathId &&
            item.clipPathId !== change.id &&
            !selected.has(item.clipPathId) &&
            !descendants.has(item.clipPathId)
          ) {
            descendants.add(item.clipPathId);
            const clipper = byId.get(item.clipPathId);
            if (clipper) collect(clipper);
          }
          if (item.type !== 'group') return;
          for (const id of item.children) {
            if (descendants.has(id)) continue;
            descendants.add(id);
            const child = byId.get(id);
            if (child) collect(child);
          }
        };
        collect(element);
        for (const id of descendants) {
          const child = byId.get(id);
          if (!child) continue;
          const dx = child.x - oldX,
            dy = child.y - oldY;
          const x = (Math.cos(oldAngle) * dx + Math.sin(oldAngle) * dy) * change.sx;
          const y = (-Math.sin(oldAngle) * dx + Math.cos(oldAngle) * dy) * change.sy;
          child.x = change.x + Math.cos(newAngle) * x - Math.sin(newAngle) * y;
          child.y = change.y + Math.sin(newAngle) * x + Math.cos(newAngle) * y;
          child.rotation = (child.rotation ?? 0) + change.rotation - (element.rotation ?? 0);
          scaleGeometry(child, change.sx, change.sy);
        }
        element.x = change.x;
        element.y = change.y;
        element.rotation = change.rotation;
        scaleGeometry(element, change.sx, change.sy);
      }
    }, 'transform-selection');
  }, [docStore, transformer]);
}

function scaleGeometry(element: CanvasElement, sx: number, sy: number) {
  const minimum =
    element.type === 'table'
      ? { w: 100, h: 60 }
      : element.type === 'stamp'
        ? { w: 40, h: 40 }
        : { w: 20, h: 20 };
  element.width = Math.max(minimum.w, element.width * sx);
  if (element.type !== 'footer') element.height = Math.max(minimum.h, element.height * sy);
  if (element.type === 'line')
    element.points = element.points.map((point, index) => point * (index % 2 === 0 ? sx : sy));
  if (element.type === 'shape') {
    element.polygonPoints = element.polygonPoints?.map(
      (point, index) => point * (index % 2 === 0 ? sx : sy),
    );
    element.polygonSubpaths = element.polygonSubpaths?.map((ring) =>
      ring.map((point, index) => point * (index % 2 === 0 ? sx : sy)),
    );
  }
}
