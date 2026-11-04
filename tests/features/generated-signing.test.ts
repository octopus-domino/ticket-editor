import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { generatedSigningDocuments } from '../../src/features/signing/generatedDocuments';
import type { GenerationResult } from '@/features/generation/api/GenerationClient';

const pdf = '%PDF-1.7\nexact generated content\n%%EOF';
const result = (blob: Blob, filename: string): GenerationResult => ({
  blob,
  filename,
  count: 1,
  failed: 0,
});
const read = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
const compatibleBlob = (data: Uint8Array, type: string): Blob => {
  const blob = new Blob([new Uint8Array(data)], { type });
  // jsdom's Blob lacks arrayBuffer; retain real FileReader behavior for returned files.
  Object.defineProperty(blob, 'arrayBuffer', { value: async () => new Uint8Array(data).buffer });
  return blob;
};

describe('signing the generated artifact', () => {
  it('passes the exact PDF bytes and generator filename without re-rendering', async () => {
    const docs = await generatedSigningDocuments(
      result(compatibleBlob(strToU8(pdf), 'application/pdf'), 'certificate.pdf'),
    );
    expect(docs).toHaveLength(1);
    expect(docs[0].file.name).toBe('certificate.pdf');
    expect(await read(docs[0].file)).toBe(pdf);
  });
  it('extracts every generated PDF from ZIP and excludes error reports and SVG', async () => {
    const zip = zipSync({
      'folder/a.pdf': new Uint8Array(strToU8(pdf)),
      'b.pdf': new Uint8Array(strToU8(pdf + '\nsecond')),
      'errors.json': new Uint8Array(strToU8('{}')),
      'page.svg': new Uint8Array(strToU8('<svg/>')),
    });
    const docs = await generatedSigningDocuments(
      result(compatibleBlob(zip, 'application/zip'), 'batch.zip'),
    );
    expect(docs.map((doc) => doc.file.name)).toEqual(['a.pdf', 'b.pdf']);
    expect(await read(docs[1].file)).toBe(pdf + '\nsecond');
  });
  it('rejects SVG and files with a misleading PDF filename', async () => {
    await expect(
      generatedSigningDocuments(
        result(compatibleBlob(strToU8('<svg/>'), 'application/pdf'), 'wrong.pdf'),
      ),
    ).rejects.toThrow(/PDF/);
  });
  it('rejects unsafe ZIP entry paths', async () => {
    const zip = zipSync({ '../a.pdf': new Uint8Array(strToU8(pdf)) });
    await expect(
      generatedSigningDocuments(result(compatibleBlob(zip, 'application/zip'), 'batch.zip')),
    ).rejects.toThrow();
  });
});
