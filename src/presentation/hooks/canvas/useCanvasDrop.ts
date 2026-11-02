import { useCallback } from 'react';
import type { RefObject } from 'react';
import type Konva from 'konva';
import type { DocumentStore } from '@/infra/state/DocumentStore';
import {
  makeArrayTable, makePlaceholder, newText, newSimpleText, newFooter,
  newTable, newLine, newShape, newPath, newChart, newQr,
  newDiagram,
} from '@/lib/factories';
import { newStampFromTemplate } from '@/lib/stamps/factories';
import { getAllStamps } from '@/lib/stamps/library';
import type { StampTemplate } from '@/lib/stamps/library';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { getByPath, appendPlaceholderPatch } from '@/lib/modelBinding';
import type { CanvasElement } from '@/shared/types';

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

    /* ============================================================
       Array → TableElement
       ============================================================ */
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

    /* ============================================================
       Field: drop на существующий или новый элемент
       ============================================================ */
    if (payload.kind === 'field') {
      let sample = payload.sample ?? '';
      const mState = modelStore.getState();
      const activeModel = mState.models.find((m) => m.id === mState.selectedId);
      if (activeModel) {
        const v = getByPath(activeModel.values, payload.path);
        if (v !== undefined && v !== null) sample = String(v);
      }

      const state = docStore.getState();
      const slide = state.slides.find((s) => s.id === state.activeId);
      if (!slide) return;

      const hits: CanvasElement[] = [];
      for (let i = slide.elements.length - 1; i >= 0; i--) {
        const el = slide.elements[i];
        if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) {
          hits.push(el);
        }
      }
      const target = hits.find((el) =>
        el.type === 'text' || el.type === 'shape' || el.type === 'footer' || el.type === 'placeholder',
      );

      if (target && target.type === 'placeholder') {
        docStore.commit((draft) => {
          const s = draft.slides.find((xx) => xx.id === draft.activeId);
          const t = s?.elements.find((e) => e.id === target.id);
          if (t && t.type === 'placeholder') {
            t.fieldPath = payload.path;
            t.label = payload.path;
            t.sample = sample;
          }
        }, `drop-field-replace-${target.id}`);
        return;
      }

      if (target && (target.type === 'text' || target.type === 'shape' || target.type === 'footer')) {
        const localX = x - target.x;
        const localY = y - target.y;
        const patch = appendPlaceholderPatch(target, payload.path, { localX, localY });
        if (Object.keys(patch).length > 0) {
          docStore.commit((draft) => {
            const s = draft.slides.find((xx) => xx.id === draft.activeId);
            const t = s?.elements.find((e) => e.id === target.id);
            if (t) Object.assign(t, patch);
          }, `drop-field-insert-${target.id}`);
          return;
        }
      }

      if (payload.fieldType === 'image') {
        const ph = makePlaceholder(x, y, payload.path, 'image', sample);
        docStore.commit((draft) => {
          const s = draft.slides.find((xx) => xx.id === draft.activeId);
          if (s) s.elements.push(ph);
        }, 'drop-field-image');
        return;
      }

      const text = newText(x, y);
      text.text = `{{${payload.path}}}`;
      text.html = `<p>{{${payload.path}}}</p>`;
      text.width = Math.max(140, Math.min(400, payload.path.length * 12 + 60));
      docStore.commit((draft) => {
        const s = draft.slides.find((xx) => xx.id === draft.activeId);
        if (s) s.elements.push(text);
      }, 'drop-field-text');
      return;
    }

    /* ============================================================
       Stamp template — ИСПРАВЛЕНО
       payload = { kind: 'stamp-template', template: StampTemplate }
       ============================================================ */
    if (payload.kind === 'stamp-template') {
      const inline: StampTemplate | undefined = payload.template;
      const tpl =
        inline && inline.id && inline.shapes && inline.texts
          ? inline
          : (inline?.id ? getAllStamps().find((t) => t.id === inline.id) : undefined);

      if (!tpl) {
        console.warn('[drop] stamp-template: missing payload.template');
        return;
      }

      const stamp = newStampFromTemplate(tpl, x, y);
      docStore.commit((draft) => {
        const s = draft.slides.find((xx) => xx.id === draft.activeId);
        if (s) s.elements.push(stamp);
      }, 'drop-stamp');
      return;
    }

    /* ============================================================
       Generic new-element (все элементы из LeftPanel)
       ============================================================ */
    if (payload.kind === 'new-element') {
      const cx = Math.max(0, x - 100);
      const cy = Math.max(0, y - 60);
      let el: CanvasElement | null = null;
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
        case 'diagram': el = newDiagram(cx, cy); break;
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