import { t as __tr } from '@/shared/i18n';
// src/presentation/hooks/editor/useFileIO.ts
import { useCallback } from 'react';
import {
  useDocumentStore,
  useSelectionStore,
  useModalsStore,
} from '../../providers/EditorProvider';
import { migrateDocument } from '@/lib/migrations';
import {
  exportSvgServer as doExportSvgServer,
  exportPdfaServer as doExportPdfaServer,
  exportPdfServer as doExportPdfServer,
} from '@/lib/serverExport';
import { prepareQrForExport } from '@/lib/qr';
import { CONFIG } from '@/shared/config';
import { toast } from '@/presentation/components/toast';
import { importElements } from '@/application/use-cases/importElements';
import { measureEditorExport } from '@/shared/analytics/GenerationMetrics';
import { modelStore } from '@/features/data-models/state/ModelStore';
import { materializeSlide } from '@/lib/materialize';
import { loadBackground } from '@/shared/backgrounds/loadBackground';

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
  const blob = typeof content === 'string' ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

  const exportJson = useCallback(async () => {
    const state = docStore.getState();
    const embedded = new Map<string, string>();
    const slides = [];
    for (const slide of state.slides) {
      if (!slide.backgroundPreset) { slides.push(slide); continue; }
      const id = slide.backgroundPreset;
      if (!embedded.has(id)) embedded.set(id, await loadBackground(id));
      slides.push({ ...slide, backgroundPreset: undefined, backgroundImage: embedded.get(id) });
    }
    const payload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      slides,
      data: state.data,
      bindings: state.bindings,
      activeSlideId: state.activeId,
    };
    triggerDownload(
      JSON.stringify(payload, null, 2),
      `ticket-editor-${Date.now()}.json`,
      'application/json',
    );
    try {
      localStorage.removeItem('ticket-editor:autosave');
    } catch {
      /* ignore */
    }
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
        toast.error(__tr('Файл слишком большой'), __tr('Максимум {0} MB', mb));
        return;
      }

      try {
        const text = await readFileAsText(file);
        const parsed = JSON.parse(text);

        const state = docStore.getState();
        const active = state.slides.find((slide) => slide.id === state.activeId);
        const elements = importElements(parsed, active?.elements.length ?? 0);
        if (elements) {
          docStore.commit((draft) => {
            const slide = draft.slides.find((item) => item.id === draft.activeId);
            if (slide) slide.elements.push(...elements);
          }, 'import-elements');
          clearUiState();
          selStore.setIds(elements.map((element) => element.id));
          return;
        }

        const migrated = migrateDocument(parsed);
        const validActiveId =
          migrated.slides.find((s) => s.id === migrated.activeSlideId)?.id ?? migrated.slides[0].id;

        docStore.commit((draft) => {
          draft.slides = migrated.slides;
          draft.activeId = validActiveId;
          draft.data = migrated.data;
          draft.bindings = migrated.bindings;
        }, 'import-json');

        clearUiState();
        toast.success(__tr('Документ импортирован'));
      } catch (err) {
        toast.error(__tr('Ошибка импорта'), (err as Error).message);
      }
    };
    input.click();
  }, [docStore, selStore, clearUiState]);

  const exportSvgLocal = useCallback(async () => {
    const active = getActiveSlide();
    if (!active) return;

    await measureEditorExport('svg', 'local', async () => {
      const [prepared] = await prepareQrForExport([active], '');
      if (prepared.backgroundPreset) {
        prepared.backgroundImage = await loadBackground(prepared.backgroundPreset);
        prepared.backgroundPreset = undefined;
      }

      const { serializeSlideToSvg } = await import('@/lib/svg/serialize');
      const svg = serializeSlideToSvg(prepared);
      const safeName = (active.name || 'slide').replace(/[^\w.-]+/g, '_');
      triggerDownload(svg, `${safeName}.svg`, 'image/svg+xml');
    });
  }, [getActiveSlide]);

  const exportSvgServer = useCallback(async () => {
    const active = getActiveSlide();
    if (!active) return;
    await measureEditorExport('svg', 'sync', () => doExportSvgServer(active));
  }, [getActiveSlide]);

  const exportPdfaServer = useCallback(async () => {
    const state = docStore.getState();
    if (!state.slides || state.slides.length === 0) return;
    const models = modelStore.getState();
    const model = models.models.find((item) => item.id === models.selectedId);
    const slides = model
      ? state.slides.map((slide) => materializeSlide(slide, model.values, state.bindings))
      : state.slides;
    await measureEditorExport('pdfa', 'sync', () => doExportPdfaServer(slides));
  }, [docStore]);

  const exportPdfServer = useCallback(async () => {
    const state = docStore.getState();
    if (!state.slides || state.slides.length === 0) return;
    const models = modelStore.getState();
    const model = models.models.find((item) => item.id === models.selectedId);
    const slides = model
      ? state.slides.map((slide) => materializeSlide(slide, model.values, state.bindings))
      : state.slides;
    await measureEditorExport('pdf', 'sync', () => doExportPdfServer(slides));
  }, [docStore]);

  const addImage = useCallback(
    (opts: { centered?: boolean } = {}) => {
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
                id: crypto.randomUUID(),
                type: 'image',
                x,
                y,
                width: w,
                height: h,
                rotation: 0,
                src,
              });
            }
          }, 'add-image');
        } catch (err) {
          toast.error(__tr('Не удалось загрузить картинку'), (err as Error).message);
        }
      };
      input.click();
    },
    [docStore, getActiveSlide],
  );

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
          if (s) { s.backgroundImage = src; s.backgroundPreset = undefined; }
        }, 'set-bg');
      } catch (err) {
        toast.error(__tr('Не удалось установить фон'), (err as Error).message);
      }
    };
    input.click();
  }, [docStore]);

  const removeBackgroundImage = useCallback(() => {
    docStore.commit((draft) => {
      const s = draft.slides.find((sl) => sl.id === draft.activeId);
      if (s) { s.backgroundImage = undefined; s.backgroundPreset = undefined; }
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
