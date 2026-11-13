import { useEffect, useRef } from 'react';


/** Pointer capture confines touch sorting to the handle, leaving inputs and map gestures alone. */
export function PointerReorderHandle({ index, onMove, disabled, label, itemAttribute, className }: {
  index: number; onMove: (from: number, to: number) => void; disabled: boolean; label: string; itemAttribute: string; className: string;
}) {
  const drag = useRef<{ from: number; to: number; pointer: number; x: number; y: number; list: HTMLElement; scroller: HTMLElement; button: HTMLButtonElement } | null>(null);
  const frame = useRef(0);
  const cleanup = () => {
    cancelAnimationFrame(frame.current);
    const active = drag.current;
    if (active) {
      active.list.querySelectorAll('[data-drop-target]').forEach(item => item.removeAttribute('data-drop-target'));
      active.button.removeAttribute('data-dragging');
    }
    drag.current = null;
  };
  useEffect(() => cleanup, []);
  return <button type="button" className={className} disabled={disabled}
    aria-label={label}
    onKeyDown={event => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault(); onMove(index, index + (event.key === 'ArrowUp' ? -1 : 1));
      }
    }}
    onPointerDown={event => {
      if (event.button !== 0) return;
      const list = event.currentTarget.closest('ol'); if (!list) return;
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      let scroller: HTMLElement | null = list;
      while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
      drag.current = { from: index, to: index, pointer: event.pointerId, x: event.clientX, y: event.clientY, list, scroller: scroller ?? document.scrollingElement as HTMLElement, button: event.currentTarget };
      event.currentTarget.setAttribute('data-dragging', 'true');
      const scroll = () => {
        const active = drag.current; if (!active) return;
        const bounds = active.scroller === document.scrollingElement ? { top: 0, bottom: innerHeight } : active.scroller.getBoundingClientRect();
        if (active.y < Math.max(0, bounds.top) + 48) active.scroller.scrollTop -= 9;
        if (active.y > Math.min(innerHeight, bounds.bottom) - 48) active.scroller.scrollTop += 9;
        const target = document.elementFromPoint(active.x, active.y)?.closest<HTMLElement>(`[${itemAttribute}]`);
        if (target && active.list.contains(target)) {
          active.to = Number(target.getAttribute(itemAttribute));
          active.list.querySelectorAll('[data-drop-target]').forEach(item => item.removeAttribute('data-drop-target'));
          target.setAttribute('data-drop-target', 'true');
        }
        frame.current = requestAnimationFrame(scroll);
      }; frame.current = requestAnimationFrame(scroll);
    }}
    onPointerMove={event => {
      const active = drag.current; if (!active || active.pointer !== event.pointerId) return;
      active.y = event.clientY;
      active.x = event.clientX;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(`[${itemAttribute}]`);
      if (target && active.list.contains(target)) {
        active.to = Number(target.getAttribute(itemAttribute));
        active.list.querySelectorAll('[data-drop-target]').forEach(item => item.removeAttribute('data-drop-target'));
        target.setAttribute('data-drop-target', 'true');
      }
    }}
    onPointerUp={event => {
      const active = drag.current; if (!active || active.pointer !== event.pointerId) return;
      const { from, to } = active; cleanup(); onMove(from, to);
    }} onPointerCancel={cleanup} onLostPointerCapture={cleanup}>⠿</button>;
}
