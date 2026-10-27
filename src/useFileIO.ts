import { useCallback } from 'react';
import type { Slide, CanvasElement, DataRoot } from '../types';
import { A4 } from '../types';
import { DEFAULT_PADDING } from '../lib/constants';
import { buildSvg } from '../services/svgExport';
import { uid } from '../lib/uid';
import { download } from '../lib/download';
import { loadImage, makeImageTransparent, fitImageSize } from '../lib/imageTools';
import { embedImagesInSlide } from '../services/embedImages';
import { clearAutoSave } from './useAutoSave';

const EXPORT_API = 'http://localhost:8080/api/export';

interface Args {
  slides: Slide[];
  setSlides: React.Dispatch<React.SetStateAction<Slide[]>>;
  activeId: string;
  setActiveId: (id: string) => void;
  activeSlide: Slide;
  data: DataRoot[];
  setData: (d: DataRoot[]) => void;
  addElementWithHistory: (el: CanvasElement) => void;
  onImported?: () => void;
}

export interface AddImageOptions {
  centered?: boolean;
  transparent?: boolean;
  keyColor?: string | 'auto';
  tolerance?: number;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useFileIO({
  slides, setSlides, activeId, setActiveId, activeSlide,
  data, setData, addElementWithHistory, onImported,
}: Args) {

  /* ---------- JSON ---------- */

  const exportJson = useCallback(() => {
    const payload = {
      version: '1.5',
      exportedAt: new Date().toISOString(),
      data,
      slides,
    };
    download(JSON.stringify(payload, null, 2), 'template.json', 'application/json');
    clearAutoSave();
  }, [slides, data]);

  const importJson = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          let importedSlides: Slide[];
          if (Array.isArray(parsed)) importedSlides = parsed;
          else if (parsed && Array.isArray(parsed.slides)) importedSlides = parsed.slides;
          else throw new Error('Не найдены slides');
          if (!importedSlides.length) throw new Error('Файл пустой');

          importedSlides = importedSlides.map((s: any) => ({
            id: s.id || uid(),
            name: s.name || 'Страница',
            format: s.format || 'a4',
            orientation: s.orientation || 'portrait',
            width: s.width || A4.width,
            height: s.height || A4.height,
            background: s.background || '#ffffff',
            backgroundImage: s.backgroundImage,
            padding: s.padding || { ...DEFAULT_PADDING },
            elements: Array.isArray(s.elements)
              ? s.elements.map((el: any) => {
                  if (el.type === 'stamp') {
                    return {
                      ...el,
                      topFontSize: el.topFontSize ?? 14,
                      centerFontSize: el.centerFontSize ?? 20,
                      bottomFontSize: el.bottomFontSize ?? 12,
                    };
                  }
                  if (el.type === 'text' || el.type === 'placeholder') {
                    return {
                      ...el,
                      verticalAlign: el.verticalAlign || 'top',
                      lineHeight: el.lineHeight || 1.2,
                      padding: el.padding || { top: 4, right: 4, bottom: 4, left: 4 },
                      background: el.background || 'transparent',
                    };
                  }
                  return el;
                })
              : [],
          }));

          setSlides(importedSlides);
          setActiveId(importedSlides[0].id);
          if (parsed.data && Array.isArray(parsed.data)) setData(parsed.data);
          onImported?.();
        } catch (e: any) {
          alert('Ошибка импорта: ' + (e?.message || e));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setSlides, setActiveId, setData, onImported]);

  /* ---------- SVG локально (fallback) ---------- */

  const exportSvg = useCallback(() => {
    const svg = buildSvg(activeSlide);
    download(svg, `${activeSlide.name || 'page'}.svg`, 'image/svg+xml');
  }, [activeSlide]);

  /* ---------- SVG через сервер ---------- */

  const exportSvgServer = useCallback(async () => {
    const preparedSlide = await embedImagesInSlide(activeSlide);

    const payload = {
      slides: [preparedSlide],
      options: {
        embedImages: true,
        prettyPrint: false,
      },
    };

    const res = await fetch(`${EXPORT_API}/svg`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`SVG export failed: ${res.status}. ${errText}`);
    }

    const blob = await res.blob();
    downloadBlob(blob, `${activeSlide.name || 'page'}.svg`);
  }, [activeSlide]);

  /* ---------- PDF/A через сервер ---------- */

  const exportPdfaServer = useCallback(async () => {
    const preparedSlide = await embedImagesInSlide(activeSlide);

    const payload = {
      slides: [preparedSlide],
      options: {
        embedImages: true,
        pdfVersion: 'pdf/a-2b',
      },
    };

    const res = await fetch(`${EXPORT_API}/pdf?mode=pdfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`PDF/A export failed: ${res.status}. ${errText}`);
    }

    const blob = await res.blob();
    downloadBlob(blob, `${activeSlide.name || 'page'}.pdf`);
  }, [activeSlide]);

  /* ---------- Изображения ---------- */

  const addImage = useCallback((opts: AddImageOptions = {}) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        let src = reader.result as string;

        if (opts.transparent) {
          try {
            src = await makeImageTransparent(src, {
              keyColor: opts.keyColor ?? 'auto',
              tolerance: opts.tolerance ?? 30,
            });
          } catch (e) {
            console.warn('Transparent conversion failed, inserting original.', e);
          }
        }

        let nw = 200;
        let nh = 200;
        try {
          const img = await loadImage(src);
          nw = img.naturalWidth || 200;
          nh = img.naturalHeight || 200;
        } catch { /* ignore */ }

        const { width, height } = fitImageSize(
          nw, nh,
          activeSlide.width, activeSlide.height,
          opts.centered ? 0.7 : 1,
        );

        const x = opts.centered
          ? Math.round((activeSlide.width - width) / 2)
          : 100;
        const y = opts.centered
          ? Math.round((activeSlide.height - height) / 2)
          : 100;

        addElementWithHistory({
          id: uid(),
          type: 'image',
          x, y,
          width, height,
          rotation: 0,
          src,
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [addElementWithHistory, activeSlide]);

  const setBackgroundImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setSlides((prev) =>
          prev.map((s) =>
            s.id !== activeId ? s : { ...s, backgroundImage: reader.result as string },
          ),
        );
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [activeId, setSlides]);

  const removeBackgroundImage = useCallback(() => {
    if (!activeSlide.backgroundImage) return;
    setSlides((prev) =>
      prev.map((s) =>
        s.id !== activeId ? s : { ...s, backgroundImage: undefined },
      ),
    );
  }, [activeId, activeSlide.backgroundImage, setSlides]);

  return {
    exportJson,
    importJson,
    exportSvg,
    exportSvgServer,
    exportPdfaServer,
    addImage,
    setBackgroundImage,
    removeBackgroundImage,
  };
}