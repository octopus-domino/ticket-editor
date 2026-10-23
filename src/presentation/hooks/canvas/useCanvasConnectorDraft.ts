/* ============================================================
   presentation/hooks/canvas/useCanvasConnectorDraft.ts
   F-DRAFT-01..12.
   ============================================================ */

import { useCallback, useRef, useState } from 'react';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { Slide, AnchorSide, ConnectorElement, CanvasElement } from '@/shared/types';
import {
  findNearestAnchor, computeGhostRect, cloneForConnector,
  oppositeAnchor, type Rect,
} from '@/lib/connectors';
import { generateId } from '@/shared/utils/id';

const ANCHOR_HIT_RADIUS = 30;

interface Draft {
  fromId: string;
  fromSide: AnchorSide;
  toX: number;
  toY: number;
}

export function useCanvasConnectorDraft(params: {
  docStore: DocumentStore;
  slide: Slide;
}) {
  const { docStore, slide } = params;
  const [draft, setDraftState] = useState<Draft | null>(null);
  const [ghostRect, setGhostRect] = useState<Rect | null>(null);
  const draftRef = useRef<Draft | null>(null);

  const setDraft = useCallback((d: Draft | null) => {
    draftRef.current = d;
    setDraftState(d);
    if (!d) setGhostRect(null);
  }, []);

  const startDraft = useCallback(
    (fromId: string, fromSide: AnchorSide, wx: number, wy: number) => {
      setDraft({ fromId, fromSide, toX: wx, toY: wy });
      const source = slide.elements.find((x) => x.id === fromId);
      if (source) {
        const rect = computeGhostRect(source, fromSide, wx, wy);
        setGhostRect(rect);
      }
    },
    [setDraft, slide],
  );

  const update = useCallback((wx: number, wy: number) => {
    const d = draftRef.current;
    if (!d) return;

    const targetEl = slide.elements.find(
      (el) =>
        el.id !== d.fromId &&
        el.type !== 'connector' &&
        !el.locked &&
        wx >= el.x && wx <= el.x + el.width &&
        wy >= el.y && wy <= el.y + el.height,
    );

    if (!targetEl) {
      const source = slide.elements.find((x) => x.id === d.fromId);
      if (source) {
        const rect = computeGhostRect(source, d.fromSide, wx, wy);
        setGhostRect(rect);
      }
    } else {
      setGhostRect(null);
    }

    setDraft({ ...d, toX: wx, toY: wy });
  }, [slide, setDraft]);

  const commit = useCallback((wx: number, wy: number) => {
    const d = draftRef.current;
    if (!d) return;

    const source = slide.elements.find((x) => x.id === d.fromId);
    if (!source) {
      setDraft(null);
      return;
    }

    const nearest = slide.elements
      .filter((el) => el.id !== d.fromId && el.type !== 'connector' && !el.locked)
      .map((el) => ({ el, anchor: findNearestAnchor(el, wx, wy) }))
      .sort((a, b) => a.anchor.distance - b.anchor.distance)[0];

    docStore.commit((draftState) => {
      const s = draftState.slides.find((x) => x.id === draftState.activeId);
      if (!s) return;

      let toId = '';
      let toAnchor: AnchorSide = 'left';

      if (nearest && nearest.anchor.distance <= ANCHOR_HIT_RADIUS) {
        toId = nearest.el.id;
        toAnchor = nearest.anchor.side;
      } else if (ghostRect) {
        const newEl = cloneForConnector(ghostRect, source);
        newEl.id = generateId();
        toId = newEl.id;
        toAnchor = oppositeAnchor(d.fromSide);
        s.elements.push(newEl as CanvasElement);
      } else {
        setDraft(null);
        return;
      }

      const conn: ConnectorElement = {
        id: generateId(), type: 'connector',
        x: 0, y: 0, width: 0, height: 0, rotation: 0,
        fromId: d.fromId, fromAnchor: d.fromSide,
        toId, toAnchor,
        stroke: '#374151', strokeWidth: 2, dash: 'solid',
        isArrow: true, routing: 'orthogonal',
      };
      s.elements.push(conn);
    }, 'draft-commit');
    setDraft(null);
  }, [docStore, slide, ghostRect, setDraft]);

  const cancel = useCallback(() => setDraft(null), [setDraft]);

  return {
    startDraft, update, commit, cancel,
    current: () => draft,
    isDrafting: () => draftRef.current !== null,
    getGhostRect: () => ghostRect,
  };
}