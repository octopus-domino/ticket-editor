import { useState, useEffect, useRef } from 'react';
import type { DataRoot, Slide } from '../types';
import { resolveSample } from '../lib/resolveSample';

export function useDataModel(
  slides: Slide[],
  setSlides: React.Dispatch<React.SetStateAction<Slide[]>>,
) {
  const [data, setData] = useState<DataRoot[]>([]);
  const initialised = useRef(false);

  useEffect(() => {
    if (!data.length) return;
    setSlides((prev) => {
      let anyChanged = false;
      const next = prev.map((s) => {
        let changed = false;
        const elements = s.elements.map((el) => {
          if (el.type === 'placeholder' && el.fieldPath) {
            const resolved = resolveSample(data, el.fieldPath);
            if (resolved !== null && resolved !== el.sample) {
              changed = true;
              return { ...el, sample: resolved };
            }
          }
          return el;
        });
        if (!changed) return s;
        anyChanged = true;
        return { ...s, elements };
      });
      return anyChanged ? next : prev;
    });
  }, [data, setSlides]);

  useEffect(() => { initialised.current = true; }, []);

  return { data, setData };
}