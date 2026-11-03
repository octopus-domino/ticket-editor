import type { Slide } from '@/shared/types';
/** Keep the immutable document reference for schema inference across SPA navigation. */
let current: { owner: string; slides: Slide[] } | null = null;
export const documentPreview = {
  set(owner: string, slides: Slide[]): void {
    current = { owner, slides };
  },
  read(owner: string): Slide[] {
    return current?.owner === owner ? current.slides : [];
  },
  clear(): void {
    current = null;
  },
};
