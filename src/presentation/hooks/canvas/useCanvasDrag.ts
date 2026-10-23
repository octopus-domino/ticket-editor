import { useCallback, useRef } from 'react';
import type Konva from 'konva';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { SelectionStore } from '@/ui/stores/SelectionStore';
import type { ModalsStore } from '@/ui/stores/ModalsStore';
import type { Slide, CanvasElement } from '@/shared/types';
import { guidesStore } from '@/ui/stores/GuidesStore';
import { dragLiveStore } from '@/ui/stores/DragLiveStore';
import { SNAP_THRESHOLD, GRID_SIZE } from '@/shared/constants';

const MIN_MOVE_PX = 1;

interface SnapCache {
  xs: number[];
  ys: number[];
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  orig: Record<string, { x: number; y: number }>;
  layer: Konva.Layer | null;
  pendingX: number;
  pendingY: number;
  rafId: number | null;
  lastEvt: MouseEvent | undefined;
  snappedX: number | null;
  snappedY: number | null;
  snapCache: SnapCache;
}

export function useCanvasDrag(params: {
  docStore: DocumentStore;
  selStore: SelectionStore;
  modalsStore: ModalsStore;
  slide: Slide;
}) {
  const { docStore, selStore, modalsStore, slide } = params;
  const state = useRef<DragState | null>(null);

  const slideRef = useRef(slide);
  slideRef.current = slide;

  const onDragStart = useCallback((el: CanvasElement, e: any) => {
    modalsStore.setFloatingPos(null);

    const current = selStore.getState().selectedIds;
    const ids = current.includes(el.id) ? current : [el.id];
    if (!current.includes(el.id)) selStore.setIds([el.id]);

    const orig: Record<string, { x: number; y: number }> = {};
    for (const ee of slideRef.current.elements) {
      if (!ids.includes(ee.id)) continue;
      if (ee.type === 'connector') continue;
      orig[ee.id] = { x: ee.x, y: ee.y };
    }

    const origEl = orig[el.id];
    const startX = origEl ? origEl.x : e.target.x();
    const startY = origEl ? origEl.y : e.target.y();
    if (!isFinite(startX) || !isFinite(startY)) return;

    const layer = (e.target.getLayer?.() as Konva.Layer | null) ?? null;

    const xs: number[] = [];
    const ys: number[] = [];
    
    // Slide bounds
    xs.push(0, slideRef.current.width / 2, slideRef.current.width);
    ys.push(0, slideRef.current.height / 2, slideRef.current.height);
    xs.push(slideRef.current.padding.left, slideRef.current.width - slideRef.current.padding.right);
    ys.push(slideRef.current.padding.top, slideRef.current.height - slideRef.current.padding.bottom);

    // Other elements
    for (const other of slideRef.current.elements) {
      if (ids.includes(other.id) || other.locked) continue;
      xs.push(other.x, other.x + other.width / 2, other.x + other.width);
      ys.push(other.y, other.y + other.height / 2, other.y + other.height);
    }

    state.current = {
      id: el.id,
      startX,
      startY,
      orig,
      layer,
      pendingX: startX,
      pendingY: startY,
      rafId: null,
      lastEvt: e.evt,
      snappedX: null,
      snappedY: null,
      snapCache: { xs, ys },
    };
  }, [selStore, modalsStore]);

  const onDragMove = useCallback((e: any) => {
    const curr = state.current;
    if (!curr) return;
    curr.lastEvt = e.evt;

    const rawX = e.target.x();
    const rawY = e.target.y();

    const isCtrl = !!(e.evt?.ctrlKey || e.evt?.metaKey);
    let finalX = rawX;
    let finalY = rawY;
    let bestX = { v: rawX, d: SNAP_THRESHOLD, guide: 0 };
    let bestY = { v: rawY, d: SNAP_THRESHOLD, guide: 0 };

    if (!isCtrl) {
      const checkX = (val: number) => {
        const d = Math.abs(rawX - val);
        if (d < bestX.d) { bestX = { v: val, d, guide: val }; }
      };
      const checkY = (val: number) => {
        const d = Math.abs(rawY - val);
        if (d < bestY.d) { bestY = { v: val, d, guide: val }; }
      };

      // Grid
      checkX(Math.round(rawX / GRID_SIZE) * GRID_SIZE);
      checkY(Math.round(rawY / GRID_SIZE) * GRID_SIZE);

      // Cached lines
      for (const val of curr.snapCache.xs) checkX(val);
      for (const val of curr.snapCache.ys) checkY(val);

      // Hysteresis X
      if (curr.snappedX !== null) {
        if (Math.abs(rawX - curr.snappedX) < SNAP_THRESHOLD * 2) {
          finalX = curr.snappedX;
        } else {
          curr.snappedX = null;
        }
      }
      if (curr.snappedX === null && bestX.d < SNAP_THRESHOLD) {
        finalX = bestX.v;
        curr.snappedX = bestX.v;
      }

      // Hysteresis Y
      if (curr.snappedY !== null) {
        if (Math.abs(rawY - curr.snappedY) < SNAP_THRESHOLD * 2) {
          finalY = curr.snappedY;
        } else {
          curr.snappedY = null;
        }
      }
      if (curr.snappedY === null && bestY.d < SNAP_THRESHOLD) {
        finalY = bestY.v;
        curr.snappedY = bestY.v;
      }
    } else {
      curr.snappedX = null;
      curr.snappedY = null;
    }

    if (finalX !== rawX) e.target.x(finalX);
    if (finalY !== rawY) e.target.y(finalY);

    const dx = finalX - curr.startX;
    const dy = finalY - curr.startY;

    // Move other top-level elements (multi-select)
    if (curr.layer) {
      for (const [id, o] of Object.entries(curr.orig)) {
        if (id === curr.id) continue;
        const el = slideRef.current.elements.find(e => e.id === id);
        if (el?.type === 'group') continue;
        const node = curr.layer.findOne('#' + id);
        if (node) { node.x(o.x + dx); node.y(o.y + dy); }
      }
      curr.layer.batchDraw();
    }

    curr.pendingX = finalX;
    curr.pendingY = finalY;

    if (curr.rafId === null) {
      curr.rafId = requestAnimationFrame(() => {
        const c = state.current;
        if (!c) return;
        c.rafId = null;

        // Collect guides (only L/C/R of dragging element against all cached lines)
        const gv: number[] = [];
        const gh: number[] = [];
        if (!isCtrl) {
          const lx = c.pendingX;
          const rx = c.pendingX + (c.orig[c.id]
            ? (slideRef.current.elements.find(e => e.id === c.id)?.width ?? 0)
            : 0);
          for (const val of c.snapCache.xs) {
            if (Math.abs(lx - val) < SNAP_THRESHOLD) gv.push(val);
            if (Math.abs(rx - val) < SNAP_THRESHOLD) gv.push(val);
          }
          const ty = c.pendingY;
          const by = c.pendingY + (c.orig[c.id]
            ? (slideRef.current.elements.find(e => e.id === c.id)?.height ?? 0)
            : 0);
          for (const val of c.snapCache.ys) {
            if (Math.abs(ty - val) < SNAP_THRESHOLD) gh.push(val);
            if (Math.abs(by - val) < SNAP_THRESHOLD) gh.push(val);
          }
        }
        guidesStore.set(Array.from(new Set(gv)), Array.from(new Set(gh)));

        const ddx = c.pendingX - c.startX;
        const ddy = c.pendingY - c.startY;
        const live: Record<string, { x: number; y: number }> = {};
        for (const [id, o] of Object.entries(c.orig)) {
          live[id] = { x: o.x + ddx, y: o.y + ddy };
        }
        dragLiveStore.set(live);
      });
    }
  }, []);

  const onDragEnd = useCallback((_e: any) => {
    const s = state.current;
    if (!s) return;
    if (s.rafId !== null) cancelAnimationFrame(s.rafId);
    state.current = null;
    guidesStore.clear();
    dragLiveStore.clear();

    const dx = s.pendingX - s.startX;
    const dy = s.pendingY - s.startY;

    if (Math.abs(dx) < MIN_MOVE_PX && Math.abs(dy) < MIN_MOVE_PX) return;

    docStore.commit((draft) => {
      const sl = draft.slides.find((x) => x.id === draft.activeId);
      if (!sl) return;

      // 1. Move all elements in orig by dx/dy (including groups)
      for (const [id, o] of Object.entries(s.orig)) {
        const el = sl.elements.find((e) => e.id === id);
        if (!el || el.type === 'connector') continue;
        el.x = o.x + dx;
        el.y = o.y + dy;
      }

      // 2. If any group was moved, move its children by dx/dy
      for (const [id] of Object.entries(s.orig)) {
        const el = sl.elements.find((e) => e.id === id);
        if (!el || el.type !== 'group') continue;
        for (const childId of el.children) {
          if (s.orig[childId]) continue; // already moved in step 1
          const child = sl.elements.find((e) => e.id === childId);
          if (child) {
            child.x += dx;
            child.y += dy;
          }
        }
      }
    }, 'move-group');
  }, [docStore]);

  return { onDragStart, onDragMove, onDragEnd };
}