"use client";

import * as ComicViewer from "@publira/comic-viewer";
import type { ViewerPage, ViewerPlugin } from "@publira/comic-viewer";

const encryptionKey = new Uint8Array([
  45, 128, 94, 16, 201, 73, 5, 164, 220, 39, 177, 8, 93, 251, 14, 66, 57, 186,
  109, 34, 240, 12, 154, 80, 28, 198, 71, 115, 9, 166, 42, 203,
]);
const initializationVectorLength = 12;

const getEncryptionKey = (usage: KeyUsage) =>
  crypto.subtle.importKey("raw", encryptionKey, "AES-GCM", false, [usage]);

const decryptPage = async (
  encryptedBuffer: ArrayBuffer
): Promise<ArrayBuffer> => {
  const encryptedPage = new Uint8Array(encryptedBuffer);
  const initializationVector = encryptedPage.slice(
    0,
    initializationVectorLength
  );

  return crypto.subtle.decrypt(
    { iv: initializationVector, name: "AES-GCM" },
    await getEncryptionKey("decrypt"),
    encryptedPage.slice(initializationVectorLength)
  );
};

const encryptedJpegPlugin = ComicViewer.definePlugin({
  afterFetch: ({ buffer }) => decryptPage(buffer),
  customFetch: async ({ signal, url }) => {
    const response = await fetch(url, { signal });

    if (!response.ok) {
      throw new Error(`Failed to fetch encrypted page: ${response.status}`);
    }

    return response.arrayBuffer();
  },
  name: "encrypted-jpeg",
});

const canvasToBuffer = (canvas: HTMLCanvasElement): Promise<ArrayBuffer> =>
  // eslint-disable-next-line promise/avoid-new -- HTMLCanvasElement exposes encoding through this callback API.
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error("Failed to encode the watermarked page."));
          return;
        }

        void (async () => {
          try {
            resolve(await blob.arrayBuffer());
          } catch (error) {
            reject(error);
          }
        })();
      },
      "image/jpeg",
      0.92
    );
  });

const addWatermark = async (buffer: ArrayBuffer): Promise<ArrayBuffer> => {
  const source = await createImageBitmap(
    new Blob([buffer], { type: "image/jpeg" })
  );
  const canvas = document.createElement("canvas");
  canvas.height = source.height;
  canvas.width = source.width;

  const context = canvas.getContext("2d");
  if (context === null) {
    source.close();
    throw new Error("Canvas 2D rendering is unavailable.");
  }

  context.drawImage(source, 0, 0);
  context.fillStyle = "rgba(0, 0, 0, 0.45)";
  context.fillRect(0, canvas.height - 96, canvas.width, 96);
  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.font = "600 32px system-ui, sans-serif";
  context.textAlign = "right";
  context.textBaseline = "middle";
  context.fillText("PUBLIRA DEMO", canvas.width - 40, canvas.height - 48);
  source.close();

  return canvasToBuffer(canvas);
};

const watermarkPlugin = ComicViewer.definePlugin({
  afterFetch: ({ buffer }) => addWatermark(buffer),
  name: "text-watermark",
});

type ReaderMode = "basic" | "encrypted" | "watermark";

const pluginsForMode: Readonly<Record<ReaderMode, readonly ViewerPlugin[]>> = {
  basic: [],
  encrypted: [encryptedJpegPlugin],
  watermark: [watermarkPlugin],
};

interface TailwindReaderProps {
  mode?: ReaderMode;
  pages: readonly ViewerPage[];
}

const NavigationIcon = ({ path }: { path: string }) => (
  <svg
    aria-hidden="true"
    className="size-6 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
    viewBox="0 0 24 24"
  >
    <path d={path} />
  </svg>
);

/** Renders direction-aware navigation icons using the public viewer context. */
const NavigationControls = () => {
  const { readingDirection } = ComicViewer.useViewerContext();
  const previousIcon =
    readingDirection === "rtl" ? "m10 6 6 6-6 6" : "m14 6-6 6 6 6";
  const nextIcon =
    readingDirection === "rtl" ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6";

  return (
    <>
      <ComicViewer.PreviousPageButton className="pointer-events-auto absolute start-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 p-0 text-slate-100 shadow-lg outline-offset-2 outline-slate-100 transition hover:bg-black/80 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50">
        <NavigationIcon path={previousIcon} />
      </ComicViewer.PreviousPageButton>
      <ComicViewer.NextPageButton className="pointer-events-auto absolute end-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/60 p-0 text-slate-100 shadow-lg outline-offset-2 outline-slate-100 transition hover:bg-black/80 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50">
        <NavigationIcon path={nextIcon} />
      </ComicViewer.NextPageButton>
    </>
  );
};

/** Renders the viewer entirely with Tailwind utilities and public primitives. */
export const TailwindReader = ({
  mode = "basic",
  pages,
}: TailwindReaderProps) => (
  <ComicViewer.Root
    pages={pages}
    plugins={pluginsForMode[mode]}
    className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/30"
  >
    <ComicViewer.Viewport className="group/viewport relative flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden data-[pannable]:cursor-grab data-[pannable]:touch-none data-[panning]:cursor-grabbing">
      <ComicViewer.ViewportTrack className="flex h-full w-[300%] shrink-0 basis-[300%] [transform:translateX(calc(-33.3333%_+_var(--pcv-drag-offset)))] data-[dragging]:transition-none data-[transition-state=active]:transition-transform data-[transition-state=active]:duration-[260ms] data-[transition-state=active]:ease-out data-[transition-state=active]:data-[slide-direction=left]:[transform:translateX(calc(-66.6667%_+_var(--pcv-drag-offset)))] data-[transition-state=active]:data-[slide-direction=right]:[transform:translateX(var(--pcv-drag-offset))]">
        <ComicViewer.ViewportPageSet className="flex h-full min-w-0 shrink-0 basis-1/3 data-[page-side=left]:justify-start data-[page-side=right]:justify-end data-[rail-slot=current]:[transform:translate(var(--pcv-pan-x,0)_var(--pcv-pan-y,0))_scale(var(--pcv-zoom-scale,1))]">
          <ComicViewer.ViewportPageSlot className="flex min-w-0 flex-1 items-center justify-center data-[view-mode=double]:max-w-1/2 data-[view-mode=double]:basis-1/2">
            <ComicViewer.ViewportPage className="flex h-full w-full min-w-0 items-center justify-center">
              <ComicViewer.PageCanvas className="h-full max-w-full bg-slate-900 object-contain transition-[filter] duration-150 group-data-[page-fit-mode=actual]/viewport:h-auto group-data-[page-fit-mode=actual]/viewport:w-auto group-data-[page-fit-mode=actual]/viewport:max-w-none group-data-[page-fit-mode=width]/viewport:h-auto group-data-[page-fit-mode=width]/viewport:w-full group-data-[page-fit-mode=width]/viewport:max-w-none data-[placeholder]:brightness-75 data-[placeholder]:saturate-75" />
            </ComicViewer.ViewportPage>
          </ComicViewer.ViewportPageSlot>
        </ComicViewer.ViewportPageSet>
      </ComicViewer.ViewportTrack>
    </ComicViewer.Viewport>
    <ComicViewer.Toolbar className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-2 bg-linear-to-t from-black/80 via-black/55 to-transparent px-3 pt-8 pb-3 transition duration-150 ease-out aria-hidden:pointer-events-none aria-hidden:translate-y-2 aria-hidden:opacity-0">
      <ComicViewer.PageProgress className="mx-auto min-w-0 shrink basis-3/5">
        <ComicViewer.PageProgressTrack className="block h-1 w-full appearance-none overflow-hidden rounded-full border-0 bg-black/65 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-slate-100 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-slate-100" />
        <ComicViewer.PageStatus className="mt-1.5 block text-center text-sm text-slate-100" />
      </ComicViewer.PageProgress>
    </ComicViewer.Toolbar>
    <ComicViewer.PageNavigation className="pointer-events-none absolute inset-0 z-10 transition duration-150 ease-out aria-hidden:translate-y-2 aria-hidden:opacity-0">
      <NavigationControls />
    </ComicViewer.PageNavigation>
  </ComicViewer.Root>
);
