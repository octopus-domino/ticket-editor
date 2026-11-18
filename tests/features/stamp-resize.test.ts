import { describe, expect, it } from 'vitest';
import { DocumentStore } from '@/infra/state/DocumentStore';
import { newStamp } from '@/lib/factories';
import type { StampElement } from '@/shared/types';

function documentWithStamp() {
  const store = new DocumentStore();
  store.commit(draft => draft.slides[0].elements.push({
    ...newStamp('rect'), id: 'stamp', width: 200, height: 100,
    shapes: [{ id: 'frame', kind: 'rect', x: 10, y: 5, width: 180, height: 90, cornerRadius: 4, stroke: '#134', strokeWidth: 2, dash: 'solid' }],
    images: [{ id: 'logo', src: 'logo.png', x: 50, y: 20, width: 100, height: 60 }],
  }));
  const stamp = () => store.getState().slides[0].elements[0] as StampElement;
  return { store, stamp };
}

describe('stamp geometry follows document bounds', () => {
  it('resizes frame and image with numeric dimensions and undoes them together', () => {
    const { store, stamp } = documentWithStamp();
    store.commit(draft => { draft.slides[0].elements[0].width = 400; draft.slides[0].elements[0].height = 200; });
    expect(stamp().shapes![0]).toMatchObject({ x: 20, y: 10, width: 360, height: 180, strokeWidth: 4 });
    expect(stamp().images![0]).toMatchObject({ x: 100, y: 40, width: 200, height: 120 });
    store.undo();
    expect(stamp().width).toBe(200);
    expect(stamp().shapes![0].width).toBe(180);
    store.redo();
    expect(stamp().shapes![0].width).toBe(360);
  });
  it('preserves the freshly edited drawing instead of resizing it twice', () => {
    const { store, stamp } = documentWithStamp();
    store.commit(draft => {
      const changed = draft.slides[0].elements[0] as StampElement;
      changed.width = 400;
      changed.shapes = [{ ...changed.shapes![0], width: 370 }];
    });
    expect(stamp().shapes![0].width).toBe(370);
  });
});
