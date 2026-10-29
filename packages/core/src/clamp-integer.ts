/** Truncates a value to an integer within `min` and `max`, `min` for a non-finite one. */
export const clampInteger = (
  value: number,
  min: number,
  max: number
): number => {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
};
