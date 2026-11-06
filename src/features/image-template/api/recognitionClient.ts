import { authFetch } from '@/shared/api/client';
import { recognizedSlide } from '../domain/recognizedLayout';

/** Keep the prepared pixels when fidelity is more important than editable text. */
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
) {
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
  } catch {
    throw new Error('recognition.invalid_result');
  }
}

export async function prepareImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
    throw new Error('recognition.invalid_image');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 32 || bitmap.height < 32 || bitmap.width * bitmap.height > 30_000_000)
      throw new Error('recognition.invalid_image');
    const ratio = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
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
