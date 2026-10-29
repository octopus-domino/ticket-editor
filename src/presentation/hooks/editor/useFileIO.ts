// src/presentation/hooks/editor/useFileIO.ts
import { useCallback } from 'react';
import {
  useDocumentStore, useSelectionStore, useModalsStore,
} from '../../providers/EditorProvider';
import { migrateDocument } from '@/lib/migrations';
import {
  exportSvgServer as doExportSvgServer,
  exportPdfaServer as doExportPdfaServer,
  exportPdfServer as doExportPdfServer,
} from '@/lib/serverExport';
import { prepareQrForExport } from '@/lib/qr';
import { CONFIG } from '@/shared/config';

/* ---------- helpers ---------- */

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function triggerDownload(content: Blob | string, filename: string, mime: string): void {
  const blob = typeof content === 'string'
    ? new Blob([content], { type: mime })
    : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function genId(): string {
  return Math.random().toString(36).slice(2, 12);
}

/* ---------- hook ---------- */

export function useFileIO() {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();
  const modalsStore = useModalsStore();

  const getActiveSlide = useCallback(() => {
    const state = docStore.getState();
    return state.slides.find((s) => s.id === state.activeId) ?? null;
  }, [docStore]);

  const clearUiState = useCallback(() => {
    selStore.clear();
    modalsStore.closeEditor();
    modalsStore.setFloatingPos(null);
    modalsStore.setContextMenu(null);
    modalsStore.setFillPoints([]);
  }, [selStore, modalsStore]);

  const exportJson = useCallback(() => {
    const state = docStore.getState();
    const payload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      slides: state.slides,
      data: state.data,
    };
    triggerDownload(
      JSON.stringify(payload, null, 2),
      `ticket-editor-${Date.now()}.json`,
      'application/json',
    );
    try { localStorage.removeItem('ticket-editor:autosave'); } catch { /* ignore */ }
  }, [docStore]);

  const importJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      if (file.size > CONFIG.MAX_IMPORT_SIZE) {
        const mb = (CONFIG.MAX_IMPORT_SIZE / 1024 / 1024).toFixed(0);
        alert(`Файл слишком большой (макс. ${mb} MB)`);
        return;
      }

      try {
        const text = await readFileAsText(file);
        const parsed = JSON.parse(text);

        if (
          parsed && typeof parsed === 'object'
          && !Array.isArray(parsed)
          && 'type' in parsed
          && typeof (parsed as { type?: unknown }).type === 'string'
        ) {
          const el = parsed as Record<string, unknown>;
          if (!el.id) el.id = genId();
          if (typeof el.x !== 'number') el.x = 100;
          if (typeof el.y !== 'number') el.y = 100;
          if (typeof el.width !== 'number') el.width = 100;
          if (typeof el.height !== 'number') el.height = 100;
          if (typeof el.rotation !== 'number') el.rotation = 0;

          docStore.commit((draft) => {
            const s = draft.slides.find((x) => x.id === draft.activeId);
            if (!s) return;
            s.elements.push(el as never);
          }, 'import-element');
          clearUiState();
          selStore.setIds([String(el.id)]);
          return;
        }

        if (Array.isArray(parsed)) {
          const ids: string[] = [];
          docStore.commit((draft) => {
            const s = draft.slides.find((x) => x.id === draft.activeId);
            if (!s) return;
            for (const raw of parsed) {
              if (!raw || typeof raw !== 'object' || !('type' in raw)) continue;
              const clone = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
              if (!clone.id) clone.id = genId();
              if (typeof clone.x !== 'number') clone.x = 100;
              if (typeof clone.y !== 'number') clone.y = 100;
              if (typeof clone.width !== 'number') clone.width = 100;
              if (typeof clone.height !== 'number') clone.height = 100;
              if (typeof clone.rotation !== 'number') clone.rotation = 0;
              s.elements.push(clone as never);
              ids.push(String(clone.id));
            }
          }, 'import-elements');
          clearUiState();
          selStore.setIds(ids);
          return;
        }

        const migrated = migrateDocument(parsed);
        const validActiveId =
          migrated.slides.find((s) => s.id === migrated.activeSlideId)?.id
          ?? migrated.slides[0].id;

        docStore.commit((draft) => {
          draft.slides = migrated.slides;
          draft.activeId = validActiveId;
          draft.data = migrated.data;
        }, 'import-json');

        clearUiState();
      } catch (err) {
        alert(`Ошибка импорта: ${(err as Error).message}`);
      }
    };
    input.click();
  }, [docStore, selStore, clearUiState]);

  const exportSvgLocal = useCallback(async () => {
    const active = getActiveSlide();
    if (!active) return;

    // Подтягиваем QR-картинки с сервера. Если /api/qr недоступен — toSvgQr
    // нарисует пунктирную рамку-заглушку вместо картинки.
    const [prepared] = await prepareQrForExport([active], '');

    const { serializeSlideToSvg } = await import('@/lib/svg/serialize');
    const svg = serializeSlideToSvg(prepared);
    const safeName = (active.name || 'slide').replace(/[^\w.-]+/g, '_');
    triggerDownload(svg, `${safeName}.svg`, 'image/svg+xml');
  }, [getActiveSlide]);

  const exportSvgServer = useCallback(async () => {
    const active = getActiveSlide();
    if (!active) return;
    await doExportSvgServer(active);
  }, [getActiveSlide]);

  const exportPdfaServer = useCallback(async () => {
    const state = docStore.getState();
    if (!state.slides || state.slides.length === 0) return;
    await doExportPdfaServer(state.slides);
  }, [docStore]);

  const exportPdfServer = useCallback(async () => {
    const state = docStore.getState();
    if (!state.slides || state.slides.length === 0) return;
    await doExportPdfServer(state.slides);
  }, [docStore]);

  const addImage = useCallback((opts: { centered?: boolean } = {}) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        const src = await readFileAsDataUrl(file);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = src;
        });

        const active = getActiveSlide();
        if (!active) return;

        const maxRatio = opts.centered ? 0.7 : 1;
        const k = Math.min(
          1,
          (active.width * maxRatio) / img.width,
          (active.height * maxRatio) / img.height,
        );
        const w = Math.max(20, Math.round(img.width * k));
        const h = Math.max(20, Math.round(img.height * k));
        const x = opts.centered ? Math.round((active.width - w) / 2) : 100;
        const y = opts.centered ? Math.round((active.height - h) / 2) : 100;

        docStore.commit((draft) => {
          const s = draft.slides.find((sl) => sl.id === draft.activeId);
          if (s) {
            s.elements.push({
              id: genId(),
              type: 'image',
              x, y, width: w, height: h, rotation: 0,
              src,
            });
          }
        }, 'add-image');
      } catch (err) {
        alert(`Не удалось загрузить картинку: ${(err as Error).message}`);
      }
    };
    input.click();
  }, [docStore, getActiveSlide]);

  const setBackgroundImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const src = await readFileAsDataUrl(file);
        docStore.commit((draft) => {
          const s = draft.slides.find((sl) => sl.id === draft.activeId);
          if (s) s.backgroundImage = src;
        }, 'set-bg');
      } catch (err) {
        alert(`Не удалось установить фон: ${(err as Error).message}`);
      }
    };
    input.click();
  }, [docStore]);

  const removeBackgroundImage = useCallback(() => {
    docStore.commit((draft) => {
      const s = draft.slides.find((sl) => sl.id === draft.activeId);
      if (s) s.backgroundImage = undefined;
    }, 'remove-bg');
  }, [docStore]);

  return {
    exportJson,
    importJson,
    exportSvgLocal,
    exportSvgServer,
    exportPdfaServer,
    exportPdfServer,
    addImage,
    setBackgroundImage,
    removeBackgroundImage,
  };
}