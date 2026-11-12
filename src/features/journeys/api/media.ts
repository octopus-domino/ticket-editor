import { journeyRequest } from './journeys';
import { API_BASE } from '@/shared/api/client';
import { t } from '@/shared/i18n';

export const mediaUrl = (id: string) => `${API_BASE}/api/journeys/media/${encodeURIComponent(id)}`;

/** Strip metadata and bound pixel count before uploading; logos retain transparency. */
export async function uploadJourneyImage(file: File, logo: boolean): Promise<{ id: string }> {
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  )
    throw new Error(t('Choose a PNG, JPEG or WebP image up to 12 MB.'));
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const ratio = Math.min(1, (logo ? 512 : 1200) / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error(t('Could not prepare the image.'));
    if (!logo) {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL(logo ? 'image/png' : 'image/jpeg', 0.85);
    return await journeyRequest('/api/journeys/media', {
      method: 'POST',
      body: JSON.stringify({ image }),
    });
  } finally {
    bitmap.close();
  }
}
