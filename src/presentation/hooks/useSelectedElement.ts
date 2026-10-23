import { useStore } from '@/shared/store/store';
import { useDocumentStore, useSelectionStore } from '../providers/EditorProvider';

export function useSelectedElement() {
  const docStore = useDocumentStore();
  const selStore = useSelectionStore();

  const activeId = useStore(docStore, (s) => s.activeId);
  const slides = useStore(docStore, (s) => s.slides);
  const selectedIds = useStore(selStore, (s) => s.selectedIds);

  if (selectedIds.length !== 1) return null;
  const slide = slides.find((s) => s.id === activeId);
  return slide?.elements.find((e) => e.id === selectedIds[0]) ?? null;
}