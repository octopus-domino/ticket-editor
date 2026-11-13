import { backgroundUrl } from './catalog';

/** Embed selected artwork so saved templates and exported documents remain self-contained. */
export async function loadBackground(id: string): Promise<string> {
  const url = backgroundUrl(id);
  if (!url) throw new Error('Unknown background');
  const response = await fetch(url);
  if (!response.ok) throw new Error('Background unavailable');
  const blob = await response.blob();
  if (blob.size > 8_000_000 || !blob.type.startsWith('image/')) throw new Error('Invalid background');
  if (blob.type === 'image/webp') {
    const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    try {
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas unavailable');
      context.drawImage(bitmap, 0, 0);
      return new Promise<string>((resolve,reject)=>{
        canvas.toBlob(encoded=>{
          if(!encoded){reject(new Error('Background encoding failed'));return;}
          const reader=new FileReader();
          reader.onload=()=>resolve(String(reader.result));
          reader.onerror=()=>reject(reader.error);
          reader.readAsDataURL(encoded);
        },'image/png');
      });
    } finally { bitmap.close(); }
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
