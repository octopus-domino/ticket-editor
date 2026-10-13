import { useCallback } from 'react';
import type { Slide, CanvasElement, DataRoot } from '../types';
import { getFormatSize, A4 } from '../types';
import { DEFAULT_PADDING } from '../lib/constants';
import { buildSvg } from '../services/svgExport';
import { uid } from '../lib/uid';
import { download } from '../lib/download';

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
          else throw new Error('Не найден массив slides');
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

  /* ---------- SVG ---------- */

  const exportSvg = useCallback(() => {
    const svg = buildSvg(activeSlide);
    download(svg, `${activeSlide.name || 'page'}.svg`, 'image/svg+xml');
  }, [activeSlide]);

  /* ---------- Картинки ---------- */

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        addElementWithHistory({
          id: uid(),
          type: 'image',
          x: 100, y: 100, width: 200, height: 200, rotation: 0,
          src: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [addElementWithHistory]);

  /* ---------- Фон холста ---------- */

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
    addImage,
    setBackgroundImage,
    removeBackgroundImage,
  };
}