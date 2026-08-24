interface TouchPoint {
  clientX: number;
  clientY: number;
}

/** The subset of a TouchList that the viewport gestures read. */
export interface TouchInput {
  readonly [index: number]: TouchPoint | undefined;
  item?: (index: number) => TouchPoint | null;
}

export const getFirstTouch = (touches: TouchInput): TouchPoint | null =>
  touches.item?.(0) ?? touches[0] ?? null;

export const getTouchPair = (
  touches: TouchInput
): [TouchPoint, TouchPoint] | null => {
  const first = getFirstTouch(touches);
  const second = touches.item?.(1) ?? touches[1] ?? null;
  return first === null || second === null ? null : [first, second];
};

export const getTouchDistance = (
  first: TouchPoint,
  second: TouchPoint
): number =>
  Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);

export const getTouchCenter = (
  first: TouchPoint,
  second: TouchPoint
): { x: number; y: number } => ({
  x: (first.clientX + second.clientX) / 2,
  y: (first.clientY + second.clientY) / 2,
});
