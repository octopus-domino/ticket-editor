import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const VIEWPORT_GAP = 8;

/** Renders outside scroll containers so editor toolbars cannot clip table controls. */
export function RichTextPopover({ anchor, panelRef, children }: {
  anchor: HTMLElement | null; panelRef: RefObject<HTMLDivElement>; children: ReactNode;
}) {
  const [position, setPosition] = useState({ top: VIEWPORT_GAP, left: VIEWPORT_GAP });
  useLayoutEffect(() => {
    if (!anchor || !panelRef.current) return;
    const place = () => {
      const box = anchor.getBoundingClientRect(), panel = panelRef.current!.getBoundingClientRect();
      const below = box.bottom + VIEWPORT_GAP;
      const top = below + panel.height <= innerHeight - VIEWPORT_GAP ? below : Math.max(VIEWPORT_GAP, box.top - panel.height - VIEWPORT_GAP);
      const left = Math.max(VIEWPORT_GAP, Math.min(box.left, innerWidth - panel.width - VIEWPORT_GAP));
      setPosition(value => value.top === top && value.left === left ? value : { top, left });
    };
    place();
    const observer = new ResizeObserver(place); observer.observe(panelRef.current);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchor, panelRef]);
  return createPortal(<div ref={panelRef} className="rt-floating-popover" data-richtext-popover
    style={{ position: 'fixed', ...position, zIndex: 10050 }}>{children}</div>, document.body);
}
