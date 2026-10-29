import { useCallback, useRef } from 'react';
import type Konva from 'konva';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import type { SelectionStore } from '@/ui/stores/SelectionStore';
import type { ModalsStore } from '@/ui/stores/ModalsStore';
import type { Slide, CanvasElement, GroupElement } from '@/shared/types';
import { guidesStore } from '@/ui/stores/GuidesStore';
import { dragLiveStore } from '@/ui/stores/DragLiveStore';
import { SNAP_THRESHOLD, GRID_SIZE } from '@/shared/constants';

const MIN_MOVE_PX = 1;

interface SnapCache {
  xs: number[];
  ys: number[];
}

interface OrigData {
  x: number;
  y: number;
  node: Konva.Node | null;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  orig: Record<string, OrigData>;
  origCount: number;
  layer: Konva.Layer | null;
  pendingX: number;
  pendingY: number;
  rafId: number | null;
  lastEvt: MouseEvent | undefined;
  snappedX: number | null;
  snappedY: number | null;
  snapCache: SnapCache | null;
  width: number;
  height: number;
}

function findNearest(arr: number[], target: number, threshold: number): number | null {
  if (arr.length === 0) return null;
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  let best: number | null = null;
  let bestDist = threshold;
  const start = Math.max(0, lo - 3);
  const end = Math.min(arr.length - 1, lo + 3);
  for (let i = start; i <= end; i++) {
    const d = Math.abs(target - arr[i]);
    if (d < bestDist) { bestDist = d; best = arr[i]; }
  }
  return best;
}

function findAllNear(arr: number[], target: number, threshold: number, out: number[]): void {
  if (arr.length === 0) return;
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < target - threshold) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < arr.length; i++) {
    if (arr[i] > target + threshold) break;
    if (Math.abs(arr[i] - target) < threshold) out.push(arr[i]);
  }
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
    const parentGroup = slideRef.current.elements.find(
      (p): p is GroupElement => p.type === 'group' && p.children.includes(el.id)
    );
    const idsToMoveSet = new Set<string>();

    if (parentGroup) {
      if (!current.includes(parentGroup.id)) selStore.setIds([parentGroup.id]);
      idsToMoveSet.add(parentGroup.id);
      parentGroup.children.forEach((cid) => idsToMoveSet.add(cid));
    } else {
      const baseIds = current.includes(el.id) ? current : [el.id];
      if (!current.includes(el.id)) selStore.setIds([el.id]);
      baseIds.forEach((id) => idsToMoveSet.add(id));
      for (const id of baseIds) {
        const target = slideRef.current.elements.find((e2) => e2.id === id);
        if (target && target.type === 'group') {
          target.children.forEach((cid) => idsToMoveSet.add(cid));
        }
      }
    }

    const layer = (e.target.getLayer?.() as Konva.Layer | null) ?? null;
    if (layer) layer.listening(false);

    const orig: Record<string, OrigData> = {};
    for (const ee of slideRef.current.elements) {
      if (!idsToMoveSet.has(ee.id) || ee.type === 'connector') continue;
      // findOne в Konva 9 возвращает Node | undefined — нормализуем в null.
      const node = layer ? (layer.findOne('#' + ee.id) ?? null) : null;
      orig[ee.id] = { x: ee.x, y: ee.y, node };
    }

    const origEl = orig[el.id];
    const startX = origEl ? origEl.x : e.target.x();
    const startY = origEl ? origEl.y : e.target.y();
    if (!isFinite(startX) || !isFinite(startY)) return;

    state.current = {
      id: el.id, startX, startY, orig,
      origCount: Object.keys(orig).length, layer,
      pendingX: startX, pendingY: startY,
      rafId: null, lastEvt: e.evt, snappedX: null, snappedY: null,
      snapCache: null,
      width: el.width, height: el.height,
    };
  }, [selStore, modalsStore]);

  const onDragMove = useCallback((e: any) => {
    const curr = state.current;
    if (!curr) return;
    curr.lastEvt = e.evt;

    if (!curr.snapCache) {
      const xsSet = new Set<number>();
      const ysSet = new Set<number>();
      const sl = slideRef.current;

      xsSet.add(0); xsSet.add(sl.width / 2); xsSet.add(sl.width);
      ysSet.add(0); ysSet.add(sl.height / 2); ysSet.add(sl.height);
      xsSet.add(sl.padding.left);
      xsSet.add(sl.width - sl.padding.right);
      ysSet.add(sl.padding.top);
      ysSet.add(sl.height - sl.padding.bottom);

      for (const other of sl.elements) {
        if (curr.orig[other.id] || other.locked) continue;
        xsSet.add(other.x);
        xsSet.add(other.x + other.width / 2);
        xsSet.add(other.x + other.width);
        ysSet.add(other.y);
        ysSet.add(other.y + other.height / 2);
        ysSet.add(other.y + other.height);
      }

      curr.snapCache = {
        xs: Array.from(xsSet).sort((a, b) => a - b),
        ys: Array.from(ysSet).sort((a, b) => a - b),
      };
    }

    const rawX = e.target.x();
    const rawY = e.target.y();
    const isCtrl = !!(e.evt?.ctrlKey || e.evt?.metaKey);
    let finalX = rawX;
    let finalY = rawY;

    if (!isCtrl) {
      const gridX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
      const gridY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;
      let bestDistX = Math.abs(rawX - gridX);
      let bestDistY = Math.abs(rawY - gridY);
      let bestX = gridX;
      let bestY = gridY;

      const nearX = findNearest(curr.snapCache.xs, rawX, SNAP_THRESHOLD);
      if (nearX !== null) {
        const d = Math.abs(rawX - nearX);
        if (d < bestDistX) { bestX = nearX; bestDistX = d; }
      }
      const nearY = findNearest(curr.snapCache.ys, rawY, SNAP_THRESHOLD);
      if (nearY !== null) {
        const d = Math.abs(rawY - nearY);
        if (d < bestDistY) { bestY = nearY; bestDistY = d; }
      }

      if (curr.snappedX !== null) {
        if (Math.abs(rawX - curr.snappedX) < SNAP_THRESHOLD * 2) finalX = curr.snappedX;
        else curr.snappedX = null;
      }
      if (curr.snappedX === null && bestDistX < SNAP_THRESHOLD) {
        finalX = bestX; curr.snappedX = bestX;
      }

      if (curr.snappedY !== null) {
        if (Math.abs(rawY - curr.snappedY) < SNAP_THRESHOLD * 2) finalY = curr.snappedY;
        else curr.snappedY = null;
      }
      if (curr.snappedY === null && bestDistY < SNAP_THRESHOLD) {
        finalY = bestY; curr.snappedY = bestY;
      }
    } else {
      curr.snappedX = null;
      curr.snappedY = null;
    }

    if (finalX !== rawX) e.target.x(finalX);
    if (finalY !== rawY) e.target.y(finalY);

    const dx = finalX - curr.startX;
    const dy = finalY - curr.startY;

    if (curr.origCount > 1) {
      for (const id in curr.orig) {
        if (id === curr.id) continue;
        const o = curr.orig[id];
        if (o.node) {
          o.node.x(o.x + dx);
          o.node.y(o.y + dy);
        }
      }
    }

    curr.pendingX = finalX;
    curr.pendingY = finalY;

    if (curr.rafId === null) {
      curr.rafId = requestAnimationFrame(() => {
        const c = state.current;
        if (!c || !c.snapCache) return;
        c.rafId = null;

        const gv: number[] = [];
        const gh: number[] = [];
        if (!isCtrl) {
          const lx = c.pendingX;
          const rx = c.pendingX + c.width;
          findAllNear(c.snapCache.xs, lx, SNAP_THRESHOLD, gv);
          findAllNear(c.snapCache.xs, rx, SNAP_THRESHOLD, gv);

          const ty = c.pendingY;
          const by = c.pendingY + c.height;
          findAllNear(c.snapCache.ys, ty, SNAP_THRESHOLD, gh);
          findAllNear(c.snapCache.ys, by, SNAP_THRESHOLD, gh);
        }

        guidesStore.set(Array.from(new Set(gv)), Array.from(new Set(gh)));

        const ddx = c.pendingX - c.startX;
        const ddy = c.pendingY - c.startY;
        const live: Record<string, { x: number; y: number }> = {};
        for (const id in c.orig) {
          const o = c.orig[id];
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

    // Откладываем возврат listening и очистку — отпускание мыши мгновенно
    const layer = s.layer;
    setTimeout(() => {
      if (layer) layer.listening(true);
    }, 0);

    const dx = s.pendingX - s.startX;
    const dy = s.pendingY - s.startY;
    if (Math.abs(dx) < MIN_MOVE_PX && Math.abs(dy) < MIN_MOVE_PX) return;

    docStore.commit((draft) => {
      const sl = draft.slides.find((x) => x.id === draft.activeId);
      if (!sl) return;
      for (const id in s.orig) {
        const el = sl.elements.find((e) => e.id === id);
        if (!el || el.type === 'connector') continue;
        const o = s.orig[id];
        el.x = o.x + dx;
        el.y = o.y + dy;
      }
    }, 'move-group');
  }, [docStore]);

  return { onDragStart, onDragMove, onDragEnd };
}