import type { DragEvent } from 'react';

/** Shares the canvas drop contract between the compact toolbar and tool library. */
export function startToolDrag(event: DragEvent, elementType: string): void {
  event.dataTransfer.setData('application/json', JSON.stringify({ kind: 'new-element', elementType }));
  event.dataTransfer.effectAllowed = 'copy';
  document.body.classList.add('canvas-tool-dragging');
  event.currentTarget.addEventListener('dragend', finishToolDrag, { once: true });
}

export function finishToolDrag(): void {
  document.body.classList.remove('canvas-tool-dragging');
}
