// src/lib/embedImages.ts
import type { Slide } from '@/shared/types';

const REMOTE_URL_RE = /^https?:\/\//i;
const MAX_CONCURRENT = 8;

function isRemoteUrl(url: unknown): url is string {
  return typeof url === 'string' && REMOTE_URL_RE.test(url);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
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
  } catch {
    // F-EI-02: CORS/сеть — оставляем исходный URL
    return url;
  }
}

async function mapConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
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

export async function embedImagesInSlide(slide: Slide): Promise<Slide> {
  const copy = JSON.parse(JSON.stringify(slide)) as Slide;

  const urls = new Set<string>();

  if (isRemoteUrl(copy.backgroundImage)) urls.add(copy.backgroundImage);

  for (const el of copy.elements) {
    if (el.type === 'image' && isRemoteUrl(el.src)) urls.add(el.src);
    if (el.type === 'placeholder' && el.fieldType === 'image' && isRemoteUrl(el.sample)) urls.add(el.sample);
    if (el.type === 'stamp' && Array.isArray(el.images)) {
      for (const im of el.images) {
        if (isRemoteUrl(im.src)) urls.add(im.src);
      }
    }
  }

  if (urls.size === 0) return copy;

  const urlArray = Array.from(urls);
  const dataUrls = await mapConcurrent(urlArray, MAX_CONCURRENT, toDataUrl);
  const urlMap = new Map(urlArray.map((url, i) => [url, dataUrls[i]]));

  if (copy.backgroundImage && urlMap.has(copy.backgroundImage)) {
    copy.backgroundImage = urlMap.get(copy.backgroundImage);
  }

  for (const el of copy.elements) {
    if (el.type === 'image' && urlMap.has(el.src)) {
      el.src = urlMap.get(el.src)!;
    }
    if (el.type === 'placeholder' && urlMap.has(el.sample)) {
      el.sample = urlMap.get(el.sample)!;
    }
    if (el.type === 'stamp' && Array.isArray(el.images)) {
      for (const im of el.images) {
        if (urlMap.has(im.src)) {
          im.src = urlMap.get(im.src)!;
        }
      }
    }
  }

  return copy;
}