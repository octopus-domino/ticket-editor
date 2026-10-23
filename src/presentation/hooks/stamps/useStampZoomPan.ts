import { useCallback, useState } from 'react';
import type Konva from 'konva';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6;

export function useStampZoomPan(stageRef: React.RefObject<Konva.Stage>) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const onWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const dir = e.evt.deltaY < 0 ? 1 : -1;
    const stage = stageRef.current;
    if (!stage) return;
    const oldZoom = zoom;
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(oldZoom + dir * 0.08).toFixed(3)));
    if (next === oldZoom) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) { setZoom(next); return; }
    const mx = (pointer.x - pan.x) / oldZoom;
    const my = (pointer.y - pan.y) / oldZoom;
    setPan({ x: pointer.x - mx * next, y: pointer.y - my * next });
    setZoom(next);
  }, [stageRef, zoom, pan]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.1).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.1).toFixed(2))), []);
  
  const zoomFit = useCallback((wrapW: number, wrapH: number, stampW: number, stampH: number) => {
    const fitX = (wrapW - 60) / stampW;
    const fitY = (wrapH - 60) / stampH;
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(fitX, fitY))));
    setPan({ x: 0, y: 0 });
  }, []);

  return { zoom, pan, setZoom, setPan, onWheel, zoomIn, zoomOut, zoomFit, MIN_ZOOM, MAX_ZOOM };
}