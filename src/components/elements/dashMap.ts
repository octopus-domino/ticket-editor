import type { DashType } from '../../types';

export const DASH_MAP: Record<DashType, number[] | undefined> = {
  solid: undefined,
  dashed: [10, 6],
  dotted: [2, 5],
  dashdot: [10, 5, 2, 5],
  longdash: [20, 8],
};