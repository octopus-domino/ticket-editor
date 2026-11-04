import type { GenerationResult } from '@/features/generation/api/GenerationClient';
import { t } from '@/shared/i18n';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_BATCH_BYTES = 60 * 1024 * 1024;
export interface GeneratedSigningDocument {
  id: string;
  file: File;
}

/** Accepts only the generator's immutable output. Never regenerates bytes during signing. */
export async function generatedSigningDocuments(
  result: GenerationResult,
): Promise<GeneratedSigningDocument[]> {
  if (result.blob.size > MAX_BATCH_BYTES)
    throw new Error(t('This batch is too large to sign in the browser. Generate a smaller batch.'));
  const bytes = new Uint8Array(await result.blob.arrayBuffer());
  const pdf = (data: Uint8Array, filename: string, id: string): GeneratedSigningDocument => {
    if (data.byteLength > MAX_FILE_BYTES) throw new Error(t('Select a PDF file up to 20 MB'));
    if (String.fromCharCode(...data.subarray(0, 5)) !== '%PDF-')
      throw new Error(t('The generated file is not a valid PDF. Generate PDF or PDF/A first.'));
    return { id, file: new File([new Uint8Array(data)], filename, { type: 'application/pdf' }) };
  };
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return [pdf(bytes, result.filename, 'document')];
  const { unzipSync } = await import('fflate');
  let total = 0,
    count = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      if (!/\.pdf$/i.test(entry.name)) return false;
      if (
        entry.name.split(/[\\/]/).some((part) => part === '..') ||
        ++count > 1000 ||
        entry.originalSize > MAX_FILE_BYTES ||
        (total += entry.originalSize) > MAX_BATCH_BYTES
      )
        throw new Error(
          t('This batch is too large to sign in the browser. Generate a smaller batch.'),
        );
      return true;
    },
  });
  const documents = Object.entries(files).map(([name, data]) =>
    pdf(data, name.split(/[\\/]/).pop()!, name),
  );
  if (!documents.length)
    throw new Error(t('The generated file is not a valid PDF. Generate PDF or PDF/A first.'));
  return documents;
}
