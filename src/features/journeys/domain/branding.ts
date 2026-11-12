export interface ImagePlacement {
  mediaId: string;
  x: number;
  y: number;
  scale: number;
}
export interface JourneyBranding {
  logo?: ImagePlacement | null;
  picture?: ImagePlacement | null;
}
export function readBranding(value?: string): JourneyBranding {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as JourneyBranding;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}
