// src/lib/serverExport.ts
/* ============================================================
   lib/serverExport.ts
   F-IO-11, F-IO-12, F-EI-01..04, NFR-SEC-06.
   Отправка слайда на сервер экспорта → Blob → download.
   ============================================================ */

import type { Slide } from '../shared/types';
import { CONFIG } from '../shared/config';
import { embedImagesInSlide } from './embedImages';

const TIMEOUT_MS = 30_000;

function buildPayload(slide: Slide, extraOptions: Record<string, unknown> = {}) {
  return {
    slides: [slide],
    options: {
      embedImages: true,
      prettyPrint: false,
      ...extraOptions,
    },
  };
}

async function postForBlob(
  url: string,
  body: unknown,
  signal: AbortSignal,
): Promise<Blob> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Server returned ${res.status}. ${errText}`);
  }
  return res.blob();
}

/**
 * F-IO-11: SVG через сервер (с embed images).
 */
export async function exportSvgServer(slide: Slide): Promise<void> {
  const prepared = await embedImagesInSlide(slide);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const blob = await postForBlob(
      `${CONFIG.EXPORT_API}/svg`,
      buildPayload(prepared),
      controller.signal,
    );
    const filename = `${(slide.name || 'slide').replace(/[^\w.-]+/g, '_')}.svg`;
    downloadBlob(blob, filename);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * F-IO-12: PDF/A-2b через сервер (с embed images).
 */
export async function exportPdfaServer(slide: Slide): Promise<void> {
  const prepared = await embedImagesInSlide(slide);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const blob = await postForBlob(
      `${CONFIG.EXPORT_API}/pdf?mode=pdfa`,
      buildPayload(prepared, { pdfVersion: 'pdf/a-2b' }),
      controller.signal,
    );
    const filename = `${(slide.name || 'slide').replace(/[^\w.-]+/g, '_')}.pdf`;
    downloadBlob(blob, filename);
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ---------- download ---------- */

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}