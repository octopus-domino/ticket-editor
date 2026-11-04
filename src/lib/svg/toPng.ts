/** Rasterize a generated SVG locally; the browser never uploads the user's stamp. */
export async function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
  if (![width, height].every((value) => Number.isFinite(value) && value > 0 && value <= 4096)) throw new Error('Image dimensions exceed 4096 px');
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const image = new Image(); image.src = url;
    await image.decode();
    const scale = Math.min(2, 4096 / Math.max(width, height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}
