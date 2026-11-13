import { authFetch } from '@/shared/api/client';
import { RecognitionError } from '../domain/RecognitionError';
import { recognizedSlide, type RecognizedSlideResult } from '../domain/recognizedLayout';

/**
 * Keep the prepared pixels when fidelity is more important than editable text.
 */
export async function originalImageSlide(source: string, name: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return recognizedSlide(
    {
      width: image.naturalWidth,
      height: image.naturalHeight,
      elements: [
        {
          type: 'image',
          x: 0,
          y: 0,
          width: image.naturalWidth,
          height: image.naturalHeight,
          properties: { src: source },
        },
      ],
      warnings: [],
      engine: 'ocr',
    },
    name,
  ).slide;
}

export async function recognizeImage(
  image: string,
  language: string,
  engine: string,
  name: string,
  signal: AbortSignal,
): Promise<RecognizedSlideResult> {
  const response = await authFetch('/api/recognition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, language, engine }),
    signal,
  });
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error((payload as { error?: string }).error ?? 'recognition.failed');

  try {
    return recognizedSlide(payload, name);
  } catch (error) {
    // Boundary: preserve the domain `RecognitionError`, otherwise wrap the
    // unexpected throw so the cause survives. `console.error` gives the
    // developer the exact field that failed; the UI still shows a friendly code.
    const detail = error instanceof Error ? error.message : String(error);
    console.error('[recognition] result rejected', { detail, error });
    if (error instanceof RecognitionError) throw error;
    throw new RecognitionError('recognition.invalid_result', detail, error);
  }
}

export async function prepareImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
    throw new Error('recognition.invalid_image');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 32 || bitmap.height < 32 || bitmap.width * bitmap.height > 30_000_000)
      throw new Error('recognition.invalid_image');
    const ratio = Math.min(
      1,
      4096 / Math.max(bitmap.width, bitmap.height),
      Math.sqrt(6_000_000 / (bitmap.width * bitmap.height)),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.floor(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('recognition.failed');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    bitmap.close();
  }
}

export async function preparePdfPage(file: File, page: number, signal: AbortSignal): Promise<{ image: string; pages: number }> {
  if (file.size > 8 * 1024 * 1024) throw new Error('recognition.invalid_pdf');
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  const response = await authFetch('/api/recognition/pdf-page', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pdf: btoa(binary), page }), signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'recognition.invalid_pdf');
  return result;
}
