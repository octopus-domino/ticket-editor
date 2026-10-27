/* ============================================================
   services/embedImages.ts

   Встраивание внешних изображений в data URL.

   Проблема: при открытии SVG-файла через file:// браузер
   блокирует загрузку внешних https://-картинок из соображений
   безопасности. В итоге вместо QR-кодов и логотипов показывается
   иконка «битая картинка».

   Решение: перед отправкой на бэкенд пройтись по слайду и
   заменить все http(s):// на data:image/...;base64,...
   Тогда SVG становится самодостаточным файлом.
   ============================================================ */

const REMOTE_URL_RE = /^https?:\/\//i;

function isRemoteUrl(url: unknown): url is string {
  return typeof url === 'string' && REMOTE_URL_RE.test(url);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function toDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return url;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch (e) {
    console.warn('[embedImages] failed to fetch', url, e);
    return url;
  }
}

/**
 * Возвращает глубокую копию слайда, в которой все внешние
 * картинки заменены на data URL. Оригинал не мутируется.
 */
export async function embedImagesInSlide(slide: any): Promise<any> {
  const copy = JSON.parse(JSON.stringify(slide));

  if (isRemoteUrl(copy.backgroundImage)) {
    copy.backgroundImage = await toDataUrl(copy.backgroundImage);
  }

  if (Array.isArray(copy.elements)) {
    for (const el of copy.elements) {
      if (el?.type === 'image' && isRemoteUrl(el.src)) {
        el.src = await toDataUrl(el.src);
      }

      if (el?.type === 'placeholder'
          && el.fieldType === 'image'
          && isRemoteUrl(el.sample)) {
        el.sample = await toDataUrl(el.sample);
      }

      if (el?.type === 'stamp' && Array.isArray(el.images)) {
        for (const im of el.images) {
          if (isRemoteUrl(im?.src)) {
            im.src = await toDataUrl(im.src);
          }
        }
      }
    }
  }

  return copy;
}