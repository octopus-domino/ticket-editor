/** A single result should download directly; batches keep archive packaging. */
export function generationDefaults(
  count: number,
  requestedFormat: string | null,
  requestedPack: string | null,
) {
  const fallback = count <= 1 ? 'pdf' : 'pdfa';
  const format: 'pdf' | 'pdfa' | 'svg' =
    requestedFormat === 'pdf' || requestedFormat === 'pdfa' || requestedFormat === 'svg'
      ? requestedFormat
      : fallback;
  const packAs: 'single' | 'zip' =
    requestedPack === 'single' || requestedPack === 'zip'
      ? requestedPack
      : count <= 1
        ? 'single'
        : 'zip';
  return { format, packAs };
}
