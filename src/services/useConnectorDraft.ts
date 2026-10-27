import { useState, useCallback } from 'react';
import type { CanvasElement, AnchorSide, ConnectorElement } from '../types';
import {
  findElementAt,
  findNearestAnchor,
  getAnchorPoint,
  computeGhostRect,
  nearestAnchorForSource,
  cloneForConnector,
  type Rect,
} from '../lib/connectors';
import { uid } from '../lib/uid';

export interface ConnectorDraft {
  fromId: string;
  fromAnchor: AnchorSide;
  mouseX: number;
  mouseY: number;
  hoverTargetId: string | null;
  hoverTargetAnchor: AnchorSide | null;
}

interface Args {
  elements: CanvasElement[];
  /** Добавить один или несколько элементов без выделения (один setSlides). */
  addElementsSilently: (els: CanvasElement[]) => void;
  /** Кастомная фабрика нового элемента. По умолчанию — cloneForConnector. */
  makeNewElement?: (rect: Rect, source: CanvasElement) => CanvasElement;
}

export function useConnectorDraft({
  elements,
  addElementsSilently,
  makeNewElement,
}: Args) {
  const [draft, setDraft] = useState<ConnectorDraft | null>(null);

  const startDraft = useCallback(
    (fromId: string, fromAnchor: AnchorSide, worldX: number, worldY: number) => {
      setDraft({
        fromId,
        fromAnchor,
        mouseX: worldX,
        mouseY: worldY,
        hoverTargetId: null,
        hoverTargetAnchor: null,
      });
    },
    [],
  );

  const moveDraft = useCallback(
    (worldX: number, worldY: number) => {
      setDraft((d) => {
        if (!d) return d;
        const target = findElementAt(elements, worldX, worldY, [d.fromId]);
        if (!target) {
          return {
            ...d,
            mouseX: worldX, mouseY: worldY,
            hoverTargetId: null,
            hoverTargetAnchor: null,
          };
        }
        const near = findNearestAnchor(target, worldX, worldY);
        return {
          ...d,
          mouseX: worldX, mouseY: worldY,
          hoverTargetId: target.id,
          hoverTargetAnchor: near.side,
        };
      });
    },
    [elements],
  );

  const commitDraft = useCallback(() => {
    setDraft((d) => {
      if (!d) return null;

      // ---- Ветка 1: связь с существующим элементом ----
      if (d.hoverTargetId && d.hoverTargetAnchor) {
        const conn: ConnectorElement = {
          id: uid(),
          type: 'connector',
          x: 0, y: 0, width: 0, height: 0, rotation: 0,
          fromId: d.fromId,
          fromAnchor: d.fromAnchor,
          toId: d.hoverTargetId,
          toAnchor: d.hoverTargetAnchor,
          stroke: '#1e40af',
          strokeWidth: 2,
          dash: 'solid',
          isArrow: true,
          routing: 'orthogonal',
        };
        addElementsSilently([conn]);
        return null;
      }

      // ---- Ветка 2: pull-to-create ----
      const source = elements.find((e) => e.id === d.fromId);
      if (!source) return null;

      const rect = computeGhostRect(source, d.fromAnchor, d.mouseX, d.mouseY);
      const newEl = makeNewElement
        ? makeNewElement(rect, source)
        : cloneForConnector(rect, source);

      const newSide = nearestAnchorForSource(rect, source);

      const conn: ConnectorElement = {
        id: uid(),
        type: 'connector',
        x: 0, y: 0, width: 0, height: 0, rotation: 0,
        fromId: d.fromId,
        fromAnchor: d.fromAnchor,
        toId: newEl.id,
        toAnchor: newSide,
        stroke: '#1e40af',
        strokeWidth: 2,
        dash: 'solid',
        isArrow: true,
        routing: 'orthogonal',
      };

      // Один батч — один setSlides → одна запись в истории.
      addElementsSilently([newEl, conn]);
      return null;
    });
  }, [elements, addElementsSilently, makeNewElement]);

  const cancelDraft = useCallback(() => setDraft(null), []);

  return { draft, startDraft, moveDraft, commitDraft, cancelDraft };
}

/* ============================================================
   Хелперы для рендера превью
   ============================================================ */

export function previewPoints(
  draft: ConnectorDraft,
  elements: CanvasElement[],
): number[] | null {
  const from = elements.find((e) => e.id === draft.fromId);
  if (!from) return null;

  const a = getAnchorPoint(from, draft.fromAnchor);

  let bx = draft.mouseX;
  let by = draft.mouseY;

  if (draft.hoverTargetId && draft.hoverTargetAnchor) {
    const target = elements.find((e) => e.id === draft.hoverTargetId);
    if (target) {
      const p = getAnchorPoint(target, draft.hoverTargetAnchor);
      bx = p.x;
      by = p.y;
    }
  }

  return [a.x, a.y, bx, by];
}

export function ghostRectForDraft(
  draft: ConnectorDraft,
  elements: CanvasElement[],
): Rect | null {
  if (draft.hoverTargetId) return null;
  const source = elements.find((e) => e.id === draft.fromId);
  if (!source) return null;
  return computeGhostRect(source, draft.fromAnchor, draft.mouseX, draft.mouseY);
}