import { SimpleStore, useStore } from '@/shared/store/store';
export type MobilePanel = 'documents' | 'tools' | 'properties' | null;
const panels = new SimpleStore<MobilePanel>(null);
export const useMobilePanel = () => useStore(panels, (value) => value);
export function toggleMobilePanel(panel: MobilePanel) { panels.setState((value) => value === panel ? null : panel); }
export function closeMobilePanel() { panels.setState(null); }
