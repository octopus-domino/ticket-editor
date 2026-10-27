import React, { createContext, useContext } from 'react';

export interface ZoomApi {
  zoom: number;
  displayZoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
}

const Ctx = createContext<ZoomApi | null>(null);

export const ZoomProvider = Ctx.Provider;

export function useZoomContext(): ZoomApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('[editor] useZoomContext outside provider');
  return ctx;
}