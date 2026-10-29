import type { Slide, QrElement, CanvasElement } from '@/shared/types';

export async function prepareQrForExport(
  slides: Slide[],
  apiBase: string,
): Promise<Slide[]> {
  const promises: Promise<void>[] = [];

  const next = slides.map((slide) => {
    const elements = slide.elements.map((el) => {
      if (el.type !== 'qr') return el;
      const q = el as QrElement;
      if (!q.text) return el;

      const copy: QrElement = { ...q };

      promises.push((async () => {
        try {
          const params = new URLSearchParams({
            text: q.text,
            size: String(Math.max(100, Math.round(Math.max(q.width, q.height)))),
            fg: q.fgColor || '#000000',
            bg: q.bgColor || '#ffffff',
            margin: String(q.margin ?? 4),
            ecc: q.ecc || 'M',
            format: q.format || 'QR',
          });
          const res = await fetch(`${apiBase}/api/qr?${params.toString()}`);
          if (!res.ok) {
            copy._qrDataUrl = undefined;
            return;
          }
          const blob = await res.blob();
          const dataUrl = await blobToDataUrl(blob);
          copy._qrDataUrl = dataUrl;
        } catch {
          copy._qrDataUrl = undefined;
        }
      })());

      return copy;
    });
    return { ...slide, elements: elements as CanvasElement[] };
  });

  await Promise.all(promises);
  return next;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}