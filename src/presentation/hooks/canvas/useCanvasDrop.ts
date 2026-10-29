import { useCallback } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import {
  makeArrayTable, makePlaceholder, newText, newSimpleText, newFooter,
  newTable, newLine, newShape, newPath, newChart, newQr,
} from '@/lib/factories';
import { resolveSample } from '@/lib/resolveSample';
import { newStampFromTemplate } from '@/lib/stamps/factories';
import { getAllStamps } from '@/lib/stamps/library';

export function useCanvasDrop(params: {
  docStore: DocumentStore;
  stageRef: RefObject<Konva.Stage>;
  zoom: number;
}) {
  const { docStore, stageRef, zoom } = params;

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    let payload: any;
    try { payload = JSON.parse(raw); } catch { return; }

    const rect = stage.container().getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (payload.kind === 'array') {
      const tbl = makeArrayTable(x, y, payload);
      docStore.commit((draft) => {
        const s = draft.slides.find((xx) => xx.id === draft.activeId);
        if (s) s.elements.push(tbl);
      }, 'drop-array');
      return;
    }

    if (payload.kind === 'chart') {
      const chart = newChart(payload.chartKind === 'donut' ? 'donut' : 'bar', x, y);
      chart.dataPath = payload.path ?? null;
      chart.valueField = payload.valueField;
      docStore.commit((draft) => {
        const s = draft.slides.find((xx) => xx.id === draft.activeId);
        if (s) s.elements.push(chart);
      }, 'drop-chart');
      return;
    }

    if (payload.kind === 'field') {
      const data = docStore.getState().data;
      const sample = resolveSample(data, payload.path) ?? payload.sample ?? '';
      const ph = makePlaceholder(x, y, payload.path, payload.fieldType, sample);
      docStore.commit((draft) => {
        const s = draft.slides.find((xx) => xx.id === draft.activeId);
        if (s) s.elements.push(ph);
      }, 'drop-field');
      return;
    }

    if (payload.kind === 'stamp-template') {
      const tpl = getAllStamps().find((t) => t.id === payload.templateId);
      if (!tpl) return;
      const stamp = newStampFromTemplate(tpl, x, y);
      docStore.commit((draft) => {
        const s = draft.slides.find((xx) => xx.id === draft.activeId);
        if (s) s.elements.push(stamp);
      }, 'drop-stamp');
      return;
    }

    if (payload.kind === 'new-element') {
      const cx = Math.max(0, x - 100);
      const cy = Math.max(0, y - 60);
      let el: any = null;
      switch (payload.elementType) {
        case 'text': el = newText(cx, cy); break;
        case 'simple-text': el = newSimpleText(cx, cy); break;
        case 'footer': {
          const state = docStore.getState();
          const active = state.slides.find((s) => s.id === state.activeId);
          if (!active) return;
          const f = newFooter(active);
          const minY = active.padding.top;
          const maxY = active.height - active.padding.bottom - f.height;
          f.y = Math.min(maxY, Math.max(minY, y));
          el = f;
          break;
        }
        case 'table': el = newTable(cx, cy); break;
        case 'line': el = newLine(cx, cy); break;
        case 'line-arrow': { const l = newLine(cx, cy); l.isArrow = true; el = l; break; }
        case 'rect': el = newShape('rect', cx, cy); break;
        case 'roundRect': el = newShape('roundRect', cx, cy); break;
        case 'circle': el = newShape('circle', cx, cy); break;
        case 'triangle': el = newShape('triangle', cx, cy); break;
        case 'star': el = newShape('star', cx, cy); break;
        case 'arc': el = newShape('arc', cx, cy); break;
        case 'path': el = newPath(cx, cy); break;
        case 'chart-bar': el = newChart('bar', cx, cy); break;
        case 'chart-donut': el = newChart('donut', cx, cy); break;
        case 'qr': el = newQr(cx, cy); break;
        default: return;
      }
      if (el) {
        docStore.commit((draft) => {
          const s = draft.slides.find((xx) => xx.id === draft.activeId);
          if (s) s.elements.push(el);
        }, 'drop-new-element');
      }
    }
  }, [docStore, stageRef, zoom]);

  return { onDragOver, onDrop };
}