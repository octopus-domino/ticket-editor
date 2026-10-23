import React, { createContext, useContext } from 'react';
import { DocumentStore } from '@/infra/state/DocumentStore';
import { SelectionStore } from '../stores/SelectionStore';
import { ModalsStore } from '../stores/ModalsStore';
import { GraphicsStore } from '../stores/GraphicsStore';

export interface EditorStores {
  document: DocumentStore;
  selection: SelectionStore;
  modals: ModalsStore;
  graphics: GraphicsStore;
}

const EditorContext = createContext<EditorStores | null>(null);

export const EditorProvider: React.FC<{ stores: EditorStores; children: React.ReactNode }> = ({ stores, children }) => (
  <EditorContext.Provider value={stores}>{children}</EditorContext.Provider>
);

export function useStores(): EditorStores {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useStores must be used within EditorProvider');
  return ctx;
}

export const useDocumentStore = () => useStores().document;
export const useSelectionStore = () => useStores().selection;
export const useModalsStore = () => useStores().modals;
export const useGraphicsStore = () => useStores().graphics;