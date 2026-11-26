import { journeyRequest } from './journeys';
import type { RecommendedPlace } from '../domain/cityVisitPlan';
import type { RoutePhoto } from '../domain/route';

const commons = 'https://commons.wikimedia.org/w/api.php';
const text = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const licensed = /^https:\/\/creativecommons\.org\/(?:licenses\/(?:by|by-sa)\/\d\.\d|publicdomain\/(?:zero|mark)\/1\.0)\/(?:deed\.[a-z-]+)?$/;

async function boundedBody(response: Response, limit: number) {
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > limit)
    throw new Error('Photo source unavailable');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) return new Blob(parts);
      bytes += chunk.value.byteLength;
      if (bytes > limit) throw new Error('Photo response is too large');
      parts.push(new Uint8Array(chunk.value));
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** Resolve only explicit OSM Commons/Wikidata references, never an unrelated image search. */
export async function placePhotos(places: (RecommendedPlace & { stopId: string })[], signal?: AbortSignal): Promise<RoutePhoto[]> {
  const photos: RoutePhoto[] = [];
  const abort = AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(20000)]);
  const request = (url: string | URL) => fetch(url, {
    signal: abort, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
  });
  const json = async (url: string) => JSON.parse(await (await boundedBody(await request(url), 1_000_000)).text());
  for (const place of places.slice(0, 7)) {
    signal?.throwIfAborted();
    let reference = place.photoReference ?? '';
    if (!reference) continue;
    try {
      if (/^Q[1-9][0-9]{0,15}$/.test(reference)) {
        const entity = await json(`https://www.wikidata.org/w/api.php?action=wbgetclaims&property=P18&entity=${reference}&format=json&origin=*`);
        const claim = entity.claims?.P18?.find((item: { rank?: string; mainsnak?: { datavalue?: { value?: unknown } } }) => item.rank !== 'deprecated' && typeof item.mainsnak?.datavalue?.value === 'string');
        reference = claim ? `File:${claim.mainsnak.datavalue.value}` : '';
      }
      if (!reference.startsWith('File:') || reference.length > 240 || /[|#]/.test(reference) || [...reference].some(character => character.charCodeAt(0) < 32)) continue;
      const query = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*',
        titles: reference, prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '480', iiurlheight: '320',
        iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|AttributionRequired|Copyrighted' });
      const result = await json(`${commons}?${query}`);
      const info = result.query?.pages?.[0]?.imageinfo?.[0];
      if (!info || !['image/jpeg', 'image/png', 'image/webp'].includes(info.thumbmime ?? info.mime)) continue;
      const author = text(info.extmetadata?.Artist?.value ?? '');
      const license = text(info.extmetadata?.LicenseShortName?.value ?? '');
      let licenseUrl = text(info.extmetadata?.LicenseUrl?.value ?? '');
      if (!licenseUrl && license.toLowerCase() === 'public domain'
          && String(info.extmetadata?.Copyrighted?.value).toLowerCase() === 'false')
        licenseUrl = 'https://creativecommons.org/publicdomain/mark/1.0/';
      if (licenseUrl.startsWith('//')) licenseUrl = `https:${licenseUrl}`;
      if (licenseUrl.startsWith('http://creativecommons.org/')) licenseUrl = licenseUrl.replace('http:', 'https:');
      // Commons also returns canonical licence URLs without a trailing slash.
      licenseUrl = licenseUrl.replace(/(\/\d\.\d)$/, '$1/');
      if (!author || author.length > 500 || !license || license.length > 80 || !licensed.test(licenseUrl)) continue;
      const url = new URL(info.thumburl ?? info.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.port ||
          !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname)) continue;
      const response = await request(url);
      if (!/^image\/(?:jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) continue;
      const blob = await boundedBody(response, 900_000);
      const bitmap = await createImageBitmap(blob);
      try {
        if (bitmap.width > 1200 || bitmap.height > 1200) continue;
        const canvas = document.createElement('canvas');
        const ratio = Math.min(1, 480 / bitmap.width, 320 / bitmap.height);
        canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
        const context = canvas.getContext('2d'); if (!context) continue;
        context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL('image/jpeg', .82);
        if (image.length > 180000) continue;
        const asset = await journeyRequest<{ id: string }>('/api/journeys/media', { method: 'POST', body: JSON.stringify({ image }), signal: abort });
        if (!/^[a-f0-9]{64}$/.test(asset.id)) continue;
        photos.push({ stopId: place.stopId, imageId: asset.id, author, license, licenseUrl,
          sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(reference).replace('File%3A', 'File:')}` });
      } finally { bitmap.close(); }
    } catch {
      // Missing licences, unavailable sources or CORS failures never block the walking route.
      signal?.throwIfAborted();
      if (abort.aborted) break;
    }
  }
  return photos;
}
