import { t } from '@/shared/i18n';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DECODED_PIXELS = 30_000_000;
const AVATAR_SIZE = 256;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Resize locally so the profile request never contains the original photograph. */
export async function prepareProfileImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) {
    throw new Error(t('Choose a PNG, JPEG or WebP image up to 8 MB.'));
  }

  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > MAX_DECODED_PIXELS) {
    bitmap.close();
    throw new Error(t('The image is too large.'));
  }

  const canvas = document.createElement('canvas');
  const scale = Math.min(1, AVATAR_SIZE / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  // JPEG has no alpha channel; paint transparent source pixels white explicitly.
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'white';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.9);
}
