import React, { createContext, useContext } from 'react';
import type { DataRoot } from '../../types';

export interface DataApi {
  data: DataRoot[];
  setData: (d: DataRoot[]) => void;
}

const Ctx = createContext<DataApi | null>(null);
export const DataProvider = Ctx.Provider;

export function useDataContext(): DataApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('[editor] useDataContext outside provider');
  return ctx;
}