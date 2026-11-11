import { SimpleStore, useStore } from '@/shared/store/store';
const mode = new SimpleStore({ fullscreen: false, multiselect: false });
export const useCanvasMode = () => useStore(mode, (value) => value);
export const canvasMode = mode;
export function toggleCanvasFullscreen(root?: HTMLElement | null) {
  const next = !mode.getState().fullscreen;
  mode.setState((value) => ({ ...value, fullscreen: next }));
  if (next && root?.requestFullscreen) void root.requestFullscreen().catch(() => {});
  else if (!next && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}
