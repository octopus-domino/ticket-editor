/** Scales stored row/column proportions with the element, keeping legacy equal-cell tables compatible. */
export function tableAxis(total: number, count: number, weights?: number[]): number[] {
  const valid = weights?.length === count && weights.every(value => Number.isFinite(value) && value > 0);
  const sizes = valid ? weights! : Array<number>(count).fill(1);
  const sum = sizes.reduce((result, value) => result + value, 0);
  const offsets = [0];
  for (const size of sizes) offsets.push(offsets[offsets.length - 1] + total * size / sum);
  return offsets;
}
