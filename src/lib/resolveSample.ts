import type { DataRoot } from '@/shared/types';

export function resolveSample(data: DataRoot[], path: string): string | null {
  if (!path) return null;
  const clean = path.replace(/\[\d+\]/g, '');
  const parts = clean.split('.');
  const rootName = parts.shift();
  if (!rootName) return null;
  const root = data.find((d) => d.name === rootName);
  if (!root) return null;

  let fields = root.fields;
  let current: any = null;
  for (const p of parts) {
    current = fields.find((f) => f.name === p);
    if (!current) return null;
    fields = current.children || [];
  }
  return current ? current.sample : null;
}