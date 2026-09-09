/**
 * The utilities the start and end pages are styled with, shared between the
 * reader and the source code panel that documents it.
 */
export const slotClassNames = {
  slotCard:
    "flex w-full max-w-sm flex-col gap-3 rounded-xl border border-slate-100/20 bg-slate-950/80 p-6 text-sm leading-6 shadow-2xl shadow-black/50 backdrop-blur-sm",
  slotPage:
    "flex h-full w-full items-center justify-center overflow-auto data-[page-side=left]:justify-end data-[page-side=right]:justify-start",
  slotSheet:
    "flex aspect-[4/5] h-full max-w-full items-center justify-center bg-[#19191f] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.09),transparent_62%)] p-6 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]",
} as const;
