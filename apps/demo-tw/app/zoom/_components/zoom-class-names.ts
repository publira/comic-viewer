/**
 * The utilities the zoom readout is styled with, shared between the reader and
 * the source code panel that documents it. The reset button borrows the pill
 * the reader-setting toggles already wear.
 */
export const zoomClassNames = {
  zoomScale:
    "shrink-0 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-100",
  zoomStatus: "flex shrink-0 items-center gap-1",
} as const;
