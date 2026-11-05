import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
export const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
export const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
export const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const namespaces = `xmlns:a="${A}" xmlns:p="${P}" xmlns:r="${R}"`;
export const escape = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
export const emu = (px: number) => Math.round(px * 9525);
export const color = (value: string | undefined, fallback = 'FFFFFF') =>
  /^#[a-f\d]{6}$/i.test(value ?? '')
    ? value!.slice(1).toUpperCase()
    : /^#[a-f\d]{3}$/i.test(value ?? '')
      ? value!
          .slice(1)
          .split('')
          .map((c) => c + c)
          .join('')
          .toUpperCase()
      : fallback;
export const relationship = (id: string, type: string, target: string) =>
  `<Relationship Id="${escape(id)}" Type="${R}/${type}" Target="${escape(target)}"/>`;
export const relationships = (items: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.join('')}</Relationships>`;
export const groupRoot =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
export function parseXml(bytes: Uint8Array | undefined): XMLDocument {
  if (!bytes) throw Error('PowerPoint part is missing');
  const text = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('External XML entities are not allowed');
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw Error('Invalid PowerPoint XML');
  return doc;
}
export function unpack(bytes: Uint8Array) {
  if (bytes.length > 30 * 1024 * 1024) throw Error('PowerPoint file exceeds 30 MB');
  let total = 0;
  let count = 0;
  // Check declared expanded sizes before decompression to bound ZIP memory use.
  return unzipSync(bytes, {
    filter: (entry) => {
      if (
        ++count > 10000 ||
        (total += entry.originalSize) > 100 * 1024 * 1024 ||
        entry.name.startsWith('/') ||
        entry.name.split('/').includes('..')
      )
        throw Error('PowerPoint package is too large or unsafe');
      if (/vbaProject|activeX|embeddings\//i.test(entry.name))
        throw Error('Macros and embedded programs are not supported');
      return true;
    },
  });
}
export function pack(files: Record<string, Uint8Array>) {
  return zipSync(
    Object.fromEntries(Object.entries(files).map(([name, data]) => [name, new Uint8Array(data)])),
    { level: 6 },
  );
}
export const bytes = (value: string) => strToU8(value);
export function resolvePart(base: string, target: string) {
  if (/^[a-z]+:|^\/\//i.test(target))
    throw Error('External PowerPoint relationship is not supported');
  const parts = (
    target.startsWith('/') ? target.slice(1) : base.slice(0, base.lastIndexOf('/') + 1) + target
  ).split('/');
  const safe: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      if (!safe.length) throw Error('Unsafe PowerPoint path');
      safe.pop();
    } else if (part && part !== '.') safe.push(part);
  }
  return safe.join('/');
}
export function readRelationships(files: Record<string, Uint8Array>, part: string) {
  const slash = part.lastIndexOf('/');
  const path = part.slice(0, slash + 1) + '_rels/' + part.slice(slash + 1) + '.rels';
  if (!files[path]) return new Map<string, { target: string; type: string }>();
  const result = new Map<string, { target: string; type: string }>();
  for (const el of Array.from(parseXml(files[path]).getElementsByTagName('Relationship'))) {
    if (el.getAttribute('TargetMode') === 'External') continue;
    result.set(el.getAttribute('Id')!, {
      target: resolvePart(part, el.getAttribute('Target')!),
      type: el.getAttribute('Type') ?? '',
    });
  }
  return result;
}
export async function fingerprint(files: Record<string, Uint8Array>) {
  // Native metadata is usable only while the actual presentation parts are unchanged.
  // Stable paths and ordering make a change in any slide/master/media invalidate it.
  const parts: string[] = [];
  for (const key of Object.keys(files)
    .filter((k) => k.startsWith('ppt/'))
    .sort()) {
    const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(files[key]));
    parts.push(
      key +
        ':' +
        Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join(''),
    );
  }
  return parts.join('|');
}
