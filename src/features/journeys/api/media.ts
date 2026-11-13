import { journeyRequest } from './journeys';
import { API_BASE } from '@/shared/api/client';
import { t } from '@/shared/i18n';

export const mediaUrl = (id: string) => `${API_BASE}/api/journeys/media/${encodeURIComponent(id)}`;

/** Strip metadata and bound pixel count before uploading; logos retain transparency. */
export async function uploadJourneyImage(file: File, logo: boolean): Promise<{ id: string }> {
  const image = await prepareJourneyImage(file, logo);
  return journeyRequest('/api/journeys/media', { method: 'POST', body: JSON.stringify({ image }) });
}
export async function prepareJourneyImage(file: File, logo: boolean, maxSide = logo ? 512 : 1200, maxLength = 1200000): Promise<string> {
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  )
    throw new Error(t('Choose a PNG, JPEG or WebP image up to 12 MB.'));
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
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
    for (const quality of [.85, .75, .65]) {
      const image = canvas.toDataURL(logo ? 'image/png' : 'image/jpeg', quality);
      if (image.length <= maxLength) return image;
    }
    throw new Error(t('Choose a smaller photo.'));
  } finally {
    bitmap.close();
  }
}
