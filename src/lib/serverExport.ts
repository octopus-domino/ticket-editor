// src/lib/serverExport.ts
/* ============================================================
   lib/serverExport.ts
   F-IO-11, F-IO-12, F-EI-01..04, NFR-SEC-06.
   Отправка слайдов на сервер экспорта → Blob → download.
   Использует authFetch — access-токен подставляется автоматически,
   при 401 выполняется refresh и повтор.
   ============================================================ */

import type { Slide } from '../shared/types';
import { CONFIG } from '../shared/config';
import { authFetch } from '@/shared/api/client';
import { embedImagesInSlide } from './embedImages';

const TIMEOUT_MS = 30_000;

function buildPayload(slides: Slide[], extraOptions: Record<string, unknown> = {}) {
  return {
    slides,
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
  const res = await authFetch(url, {
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
 * Экспортирует ОДИН слайд — SVG не поддерживает многостраничность.
 */
export async function exportSvgServer(slide: Slide): Promise<void> {
  const prepared = await embedImagesInSlide(slide);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const blob = await postForBlob(
      `${CONFIG.EXPORT_API}/svg`,
      buildPayload([prepared]),
      controller.signal,
    );
    const filename = `${(slide.name || 'slide').replace(/[^\w.-]+/g, '_')}.svg`;
    downloadBlob(blob, filename);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * F-IO-12: PDF/A-2b всего документа (все слайды) через сервер.
 */
export async function exportPdfaServer(slides: Slide[]): Promise<void> {
  if (!slides.length) return;

  const preparedSlides = await Promise.all(slides.map((s) => embedImagesInSlide(s)));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const blob = await postForBlob(
      `${CONFIG.EXPORT_API}/pdf?mode=pdfa`,
      buildPayload(preparedSlides, { pdfVersion: 'pdf/a-2b' }),
      controller.signal,
    );
    downloadBlob(blob, 'document.pdf');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * PDF (не PDF/A) всего документа.
 */
export async function exportPdfServer(slides: Slide[]): Promise<void> {
  if (!slides.length) return;

  const preparedSlides = await Promise.all(slides.map((s) => embedImagesInSlide(s)));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const blob = await postForBlob(
      `${CONFIG.EXPORT_API}/pdf?mode=pdf`,
      buildPayload(preparedSlides),
      controller.signal,
    );
    downloadBlob(blob, 'document.pdf');
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