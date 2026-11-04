import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type Konva from 'konva';

interface PendingScroll {
  mx: number;
  my: number;
  oldScrollLeft: number;
  oldScrollTop: number;
  oldZoom: number;
}

interface Args {
  wrapRef: React.RefObject<HTMLDivElement>;
  zoom: number;
  onZoomChange: (z: number | ((prev: number) => number)) => void;
  stageRef: React.RefObject<Konva.Stage>;
  minZoom?: number;
  maxZoom?: number;
}

const STEP = 0.05;

export function useCanvasViewport({
  wrapRef,
  zoom,
  onZoomChange,
  stageRef: _stageRef,
  minZoom = 0.2,
  maxZoom = 10,
}: Args) {
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const pendingScrollRef = useRef<PendingScroll | null>(null);
  const pendingDeltaRef = useRef(0);
  const pendingMouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const pinching = useRef(false);
  const pinchTarget = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  useLayoutEffect(() => {
    const target = pinchTarget.current, wrap = wrapRef.current;
    if (target && wrap) {
      wrap.scrollLeft = target.originX * zoom - target.x;
      wrap.scrollTop = target.originY * zoom - target.y;
    }
  }, [zoom, wrapRef]);
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let gesture: { distance: number; zoom: number; originX: number; originY: number } | null = null;
    let frame: number | null = null;
    const point = (event: TouchEvent) => {
      const [a, b] = [event.touches[0], event.touches[1]], rect = wrap.getBoundingClientRect();
      return { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top };
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      _stageRef.current?.find((node: Konva.Node) => node.isDragging()).forEach((node) => node.stopDrag());
      const p = point(event);
      gesture = { distance: Math.max(1, p.distance), zoom: zoomRef.current, originX: (wrap.scrollLeft + p.x) / zoomRef.current, originY: (wrap.scrollTop + p.y) / zoomRef.current };
      pinching.current = true;
    };
    const move = (event: TouchEvent) => {
      if (!gesture || event.touches.length !== 2) return;
      event.preventDefault();
      const p = point(event), next = Math.max(minZoom, Math.min(maxZoom, gesture.zoom * p.distance / gesture.distance));
      pinchTarget.current = { x: p.x, y: p.y, originX: gesture.originX, originY: gesture.originY };
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        onZoomChange(next);
        const target = pinchTarget.current;
        if (target) { wrap.scrollLeft = target.originX * next - target.x; wrap.scrollTop = target.originY * next - target.y; }
      });
    };
    const end = (event: TouchEvent) => {
      if (event.touches.length >= 2) return;
      gesture = null; pinching.current = false;
      // Keep the last frame until layout has applied the final zoom.
      if (!event.touches.length) requestAnimationFrame(() => { pinchTarget.current = null; });
    };
    wrap.addEventListener('touchstart', start, { passive: false, capture: true });
    wrap.addEventListener('touchmove', move, { passive: false, capture: true });
    wrap.addEventListener('touchend', end); wrap.addEventListener('touchcancel', end);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      wrap.removeEventListener('touchstart', start, true); wrap.removeEventListener('touchmove', move, true);
      wrap.removeEventListener('touchend', end); wrap.removeEventListener('touchcancel', end);
      pinchTarget.current = null; pinching.current = false;
    };
  }, [wrapRef, _stageRef, onZoomChange, minZoom, maxZoom]);

  useLayoutEffect(() => {
    const pending = pendingScrollRef.current;
    if (!pending) return;
    pendingScrollRef.current = null;

    const wrap = wrapRef.current;
    if (!wrap) return;

    void wrap.scrollWidth;
    void wrap.clientWidth;

    const ratio = zoomRef.current / pending.oldZoom;
    const maxX = Math.max(0, wrap.scrollWidth - wrap.clientWidth);
    const maxY = Math.max(0, wrap.scrollHeight - wrap.clientHeight);
    if (maxX === 0 && maxY === 0) return;

    const contentX = pending.oldScrollLeft + pending.mx;
    const contentY = pending.oldScrollTop + pending.my;

    let newScrollLeft = contentX * ratio - pending.mx;
    let newScrollTop = contentY * ratio - pending.my;

    newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxX));
    newScrollTop = Math.max(0, Math.min(newScrollTop, maxY));

    const fx = Math.round(newScrollLeft);
    const fy = Math.round(newScrollTop);

    if (wrap.scrollLeft !== fx) wrap.scrollLeft = fx;
    if (wrap.scrollTop !== fy) wrap.scrollTop = fy;
  }, [zoom, wrapRef]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const flush = () => {
      rafRef.current = null;
      const delta = pendingDeltaRef.current;
      if (delta === 0) return;
      pendingDeltaRef.current = 0;

      const oldZoom = zoomRef.current;
      const direction = delta < 0 ? 1 : -1;

      const steps = Math.max(1, Math.min(4, Math.round(Math.abs(delta) / 100)));
      const raw = oldZoom + direction * STEP * steps;
      const next = Math.max(minZoom, Math.min(maxZoom, +raw.toFixed(3)));
      if (next === oldZoom) return;

      const rect = el.getBoundingClientRect();

      pendingScrollRef.current = {
        mx: pendingMouseRef.current.x - rect.left,
        my: pendingMouseRef.current.y - rect.top,
        oldScrollLeft: el.scrollLeft,
        oldScrollTop: el.scrollTop,
        oldZoom,
      };

      onZoomChange(next);
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();

      pendingDeltaRef.current += e.deltaY;
      pendingMouseRef.current = { x: e.clientX, y: e.clientY };

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    };

    const onGesture = (e: Event) => e.preventDefault();

    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    el.addEventListener('gesturestart', onGesture as any, { passive: false });
    el.addEventListener('gesturechange', onGesture as any, { passive: false });

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      el.removeEventListener('wheel', onWheel, { capture: true } as any);
      el.removeEventListener('gesturestart', onGesture as any);
      el.removeEventListener('gesturechange', onGesture as any);
    };
  }, [wrapRef, onZoomChange, minZoom, maxZoom]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.code === 'Space' && !e.repeat && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
        setIsPanning(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsPanning(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent | any) => {
    if (!isPanning) return;
    const container = wrapRef.current;
    if (!container) return;

    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - panStart.current.x;
      const dy = moveEvent.clientY - panStart.current.y;
      container.scrollLeft = panStart.current.scrollLeft - dx;
      container.scrollTop = panStart.current.scrollTop - dy;
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isPanning, wrapRef]);

  return { isPanning, handleMouseDown, isPinching: () => pinching.current };
}
