/* ============================================================
   lib/drawio/embedImagesInSvg.ts

   Превращает внешние http(s)-ссылки в <image> внутрь SVG в data URL.
   Нужно для PDF/PDF-A: бэкенд не умеет скачивать картинки из drawio-SVG
   (nested SVG он разворачивает, но внешние URL — нет).

   F-DG-07.
   ============================================================ */

const REMOTE_URL_RE = /^https?:\/\//i;
const MAX_CONCURRENT = 6;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

function isRemote(href: string | null | undefined): href is string {
  return typeof href === 'string' && REMOTE_URL_RE.test(href);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function toDataUrl(href: string): Promise<string> {
  try {
    const res = await fetch(href, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return href;
    const blob = await res.blob();
    if (blob.size > MAX_IMAGE_BYTES) return href;
    return await blobToDataUrl(blob);
  } catch {
    // CORS или сеть — оставляем как есть
    return href;
  }
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Заменяет href/xlink:href у всех <image> с http(s) на data URL.
 * Не падает: если не удалось — оставляет исходный URL.
 */
export async function embedImagesInSvg(svg: string): Promise<string> {
  if (!svg.includes('<image')) return svg;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  } catch {
    return svg;
  }

  // Если DOMParser вернул parsererror — возвращаем как есть.
  if (doc.querySelector('parsererror')) return svg;

  const images = Array.from(doc.querySelectorAll('image'));
  if (images.length === 0) return svg;

  // Собираем все внешние ссылки.
  const hrefs = new Set<string>();
  for (const img of images) {
    const href =
      img.getAttribute('href') ||
      img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (isRemote(href)) hrefs.add(href);
  }

  if (hrefs.size === 0) return svg;

  // Скачиваем параллельно.
  const hrefArray = Array.from(hrefs);
  const dataUrls = await mapConcurrent(hrefArray, MAX_CONCURRENT, toDataUrl);
  const urlMap = new Map(hrefArray.map((h, i) => [h, dataUrls[i]]));

  // Подменяем.
  let changed = false;
  for (const img of images) {
    const href = img.getAttribute('href');
    const xhref = img.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    const original = href || xhref;
    if (!isRemote(original)) continue;
    const dataUrl = urlMap.get(original);
    if (!dataUrl || dataUrl === original) continue;
    img.setAttribute('href', dataUrl);
    if (img.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl);
    }
    changed = true;
  }

  if (!changed) return svg;

  try {
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return svg;
  }
}