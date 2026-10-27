import React, { createContext, useContext } from 'react';

export interface FillModeApi {
  fillMode: boolean;
  setFillMode: (v: boolean) => void;
  fillColor: string;
  setFillColor: (c: string) => void;
  fillPoints: number[];
  handleFillClick: (onEmpty: () => void) => boolean;
  closePolygon: () => void;
}

const Ctx = createContext<FillModeApi | null>(null);
export const FillModeProvider = Ctx.Provider;

export function useFillModeContext(): FillModeApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('[editor] useFillModeContext outside provider');
  return ctx;
}