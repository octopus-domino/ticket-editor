import { useState, useCallback } from 'react';
import type { Slide, CanvasElement, DocFormat, Orientation } from '../types';
import { getFormatSize } from '../types';
import { newSlide } from '../lib/factories';

export function useSlides() {
  const [slides, setSlides] = useState<Slide[]>(() => [newSlide(1)]);
  const [activeId, setActiveId] = useState(() => slides[0].id);
  const [customSize, setCustomSize] = useState({ w: 794, h: 1123 });

  const activeSlide = slides.find((s) => s.id === activeId)!;

  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>) => {
    setSlides((prev) =>
      prev.map((s) =>
        s.id !== activeId
          ? s
          : { ...s, elements: s.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as CanvasElement) : el)) },
      ),
    );
  }, [activeId]);

  const updateSlide = useCallback((patch: Partial<Slide>, _history = false) => {
    setSlides((prev) => prev.map((s) => (s.id === activeId ? { ...s, ...patch } : s)));
  }, [activeId]);

  const addElement = useCallback((el: CanvasElement) => {
    setSlides((prev) =>
      prev.map((s) => (s.id !== activeId ? s : { ...s, elements: [...s.elements, el] })),
    );
  }, [activeId]);

  const removeElements = useCallback((ids: string[]) => {
    setSlides((prev) =>
      prev.map((s) =>
        s.id !== activeId ? s : { ...s, elements: s.elements.filter((e) => !ids.includes(e.id)) },
      ),
    );
  }, [activeId]);

  const moveLayer = useCallback((id: string, dir: 1 | -1) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s;
        const idx = s.elements.findIndex((e) => e.id === id);
        if (idx < 0) return s;
        const target = idx + dir;
        if (target < 0 || target >= s.elements.length) return s;
        const arr = [...s.elements];
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        return { ...s, elements: arr };
      }),
    );
  }, [activeId]);

  const addSlide = useCallback(() => {
    setSlides((prev) => {
      const s = newSlide(prev.length + 1, activeSlide.format, activeSlide.orientation);
      s.padding = { ...activeSlide.padding };
      setActiveId(s.id);
      return [...prev, s];
    });
  }, [activeSlide]);

  const removeSlide = useCallback((id: string) => {
    setSlides((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((s) => s.id !== id);
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  }, [activeId]);

  const changeFormat = useCallback((format: DocFormat) => {
    const { w, h } = getFormatSize(format, activeSlide.orientation, format === 'custom' ? customSize : undefined);
    setSlides((prev) =>
      prev.map((s) => (s.id === activeId ? { ...s, format, width: w, height: h } : s)),
    );
  }, [activeId, activeSlide.orientation, customSize]);

  const changeOrientation = useCallback((orientation: Orientation) => {
    const { w, h } = getFormatSize(activeSlide.format, orientation, activeSlide.format === 'custom' ? customSize : undefined);
    setSlides((prev) =>
      prev.map((s) => (s.id === activeId ? { ...s, orientation, width: w, height: h } : s)),
    );
  }, [activeId, activeSlide.format, customSize]);

  const changeCustomSize = useCallback((w: number, h: number) => {
    setCustomSize({ w, h });
    if (activeSlide.format !== 'custom') return;
    setSlides((prev) =>
      prev.map((s) =>
        s.id !== activeId
          ? s
          : {
              ...s,
              width: s.orientation === 'portrait' ? w : h,
              height: s.orientation === 'portrait' ? h : w,
            },
      ),
    );
  }, [activeId, activeSlide.format]);

  return {
    slides, setSlides,
    activeId, setActiveId,
    activeSlide,
    customSize, changeCustomSize,
    updateElement, updateSlide,
    addElement, removeElements, moveLayer,
    addSlide, removeSlide,
    changeFormat, changeOrientation,
  };
}