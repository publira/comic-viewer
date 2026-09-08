/**
 * The utilities the start and end pages are styled with, shared between the
 * reader and the source code panel that documents it.
 */
export const slotClassNames = {
  slotCard:
    "flex max-w-sm flex-col gap-3 rounded-lg border border-slate-100/25 bg-black/45 p-6 text-sm leading-6",
  slotPage:
    "flex h-full w-full items-center justify-center overflow-auto data-[page-side=left]:justify-end data-[page-side=right]:justify-start",
} as const;
