import { useCallback, useEffect, useRef, useState } from "react";

import { toPageLoadFailure } from "./page-load";
import type { PageLoadError, PageLoadStage, PageLoadStatus } from "./page-load";
import { runDataPipeline } from "./plugin";
import type { ViewerPlugin } from "./plugin";
import type { ViewerPage } from "./viewer-context";

export const getImageMimeType = (
  url: string,
  mimeType?: string
): string | undefined => {
  if (mimeType?.startsWith("image/")) {
    return mimeType;
  }

  const dataUriMatch = /^data:(?<mimeType>[^;,]+)/u.exec(url);
  if (dataUriMatch?.groups?.mimeType?.startsWith("image/")) {
    return dataUriMatch.groups.mimeType;
  }

  const extension = /\.(?<extension>[a-z0-9]+)(?:[?#]|$)/iu
    .exec(url)
    ?.groups?.extension?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    avif: "image/avif",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  return extension === undefined ? undefined : mimeTypes[extension];
};

type DecodedImage = HTMLImageElement | ImageBitmap;

export interface PageImage {
  bitmap: DecodedImage;
  placeholder: boolean;
}

const getImageMimeTypeOrFallback = (
  sourceUrl: string,
  mimeType?: string
): string =>
  getImageMimeType(sourceUrl, mimeType) ?? "application/octet-stream";

const decodeWithImageElement = async (
  buffer: ArrayBuffer,
  mimeType: string
): Promise<HTMLImageElement> => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += 0x80_00) {
    binary += String.fromCodePoint(...bytes.subarray(offset, offset + 0x80_00));
  }

  const image = new Image();
  image.src = `data:${mimeType};base64,${btoa(binary)}`;
  await image.decode();
  return image;
};

const decodeImage = async (
  buffer: ArrayBuffer,
  sourceUrl: string,
  mimeType?: string
): Promise<DecodedImage> => {
  const imageMimeType = getImageMimeTypeOrFallback(sourceUrl, mimeType);
  const blob = new Blob([buffer], { type: imageMimeType });

  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      // Some browsers cannot decode every image format with createImageBitmap.
    }
  }

  return decodeWithImageElement(buffer, imageMimeType);
};

/** Releases every decoded bitmap that owns an explicit browser resource. */
const closeImageBitmaps = (images: readonly DecodedImage[]): void => {
  for (const image of images) {
    if ("close" in image) {
      image.close();
    }
  }
};

const waitForAnimationFrame = (): Promise<void> =>
  // eslint-disable-next-line promise/avoid-new -- The browser exposes a paint boundary through this callback API.
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        resolve();
      });
      return;
    }

    setTimeout(resolve, 0);
  });

/** Waits for the placeholder canvas state to reach a browser paint boundary. */
const waitForVisiblePaint = async (): Promise<void> => {
  await waitForAnimationFrame();
  await waitForAnimationFrame();
};

export const getPageImageKey = (index: number, page: ViewerPage): string =>
  `${index}:${page.src}`;

/** The cached load lifecycle of one page, keyed by its page image key. */
export interface PageLoadEntry<TPage extends ViewerPage = ViewerPage> {
  error?: PageLoadError<TPage>;
  status: PageLoadStatus;
}

export interface ViewportImages<TPage extends ViewerPage = ViewerPage> {
  images: ReadonlyMap<string, PageImage>;
  loadStates: ReadonlyMap<string, PageLoadEntry<TPage>>;
  /** Clears a failed page so the loader attempts it again. */
  retryPage: (index: number) => void;
}

interface UseViewportImagesOptions<TPage extends ViewerPage> {
  cachedIndices: readonly number[];
  keepImages: boolean;
  onPageLoadError?: (error: PageLoadError<TPage>) => void;
  pages: readonly TPage[];
  plugins: readonly ViewerPlugin[];
  shouldLoadImages: boolean;
}

/** Loads, caches, and releases decoded pages for the active viewport rail. */
export const useViewportImages = <TPage extends ViewerPage>({
  cachedIndices,
  keepImages,
  onPageLoadError,
  pages,
  plugins,
  shouldLoadImages,
}: UseViewportImagesOptions<TPage>): ViewportImages<TPage> => {
  const [pageImages, setPageImages] = useState<ReadonlyMap<string, PageImage>>(
    () => new Map()
  );
  const [pageLoadStates, setPageLoadStates] = useState<
    ReadonlyMap<string, PageLoadEntry<TPage>>
  >(() => new Map());
  const [retryNonce, setRetryNonce] = useState(0);
  const pageImagesRef = useRef<ReadonlyMap<string, PageImage>>(new Map());
  const pageLoadStatesRef = useRef<ReadonlyMap<string, PageLoadEntry<TPage>>>(
    new Map()
  );
  const cachedImageKeysRef = useRef<ReadonlySet<string>>(new Set());
  const pageLoadControllersRef = useRef(new Map<string, AbortController>());
  const retiredImageBitmapsRef = useRef<DecodedImage[]>([]);
  const pagesRef = useRef(pages);
  const onPageLoadErrorRef = useRef(onPageLoadError);

  useEffect(() => {
    pagesRef.current = pages;
    onPageLoadErrorRef.current = onPageLoadError;
  }, [onPageLoadError, pages]);

  const commitLoadStates = useCallback(
    (update: (states: Map<string, PageLoadEntry<TPage>>) => void): void => {
      const nextStates = new Map(pageLoadStatesRef.current);
      update(nextStates);
      pageLoadStatesRef.current = nextStates;
      setPageLoadStates(nextStates);
    },
    []
  );

  const retryPage = useCallback(
    (index: number) => {
      const page = pagesRef.current[index];
      if (page === undefined) {
        return;
      }

      const imageKey = getPageImageKey(index, page);
      if (pageLoadStatesRef.current.get(imageKey)?.status !== "error") {
        return;
      }

      // A decoded placeholder stays in the cache so it remains visible while
      // the page is fetched again.
      commitLoadStates((states) => {
        states.delete(imageKey);
      });
      setRetryNonce((nonce) => nonce + 1);
    },
    [commitLoadStates]
  );

  useEffect(() => {
    if (!shouldLoadImages) {
      return;
    }

    const requestedImageKeys = new Set(
      cachedIndices.flatMap((index) => {
        const page = pages[index];
        return page === undefined ? [] : [getPageImageKey(index, page)];
      })
    );
    cachedImageKeysRef.current = requestedImageKeys;
    const setPageImage = (index: number, image: PageImage): boolean => {
      const page = pages[index];
      if (page === undefined) {
        closeImageBitmaps([image.bitmap]);
        return false;
      }

      const imageKey = getPageImageKey(index, page);
      if (!cachedImageKeysRef.current.has(imageKey)) {
        closeImageBitmaps([image.bitmap]);
        return false;
      }

      const previousImage = pageImagesRef.current.get(imageKey);
      if (previousImage !== undefined && previousImage !== image) {
        retiredImageBitmapsRef.current.push(previousImage.bitmap);
      }

      const nextImages = new Map([
        ...pageImagesRef.current.entries(),
        [imageKey, image],
      ]);
      pageImagesRef.current = nextImages;
      setPageImages(nextImages);
      return true;
    };

    const loadPage = async (index: number): Promise<void> => {
      const page = pages[index];
      if (page === undefined) {
        return;
      }

      const imageKey = getPageImageKey(index, page);
      if (
        pageLoadControllersRef.current.has(imageKey) ||
        // A settled page is reloaded only after an eviction or an explicit retry.
        pageLoadStatesRef.current.has(imageKey)
      ) {
        return;
      }

      const abortController = new AbortController();
      pageLoadControllersRef.current.set(imageKey, abortController);
      commitLoadStates((states) => {
        states.set(imageKey, { status: "loading" });
      });
      const releasePageLoad = (): void => {
        if (pageLoadControllersRef.current.get(imageKey) === abortController) {
          pageLoadControllersRef.current.delete(imageKey);
        }
      };
      /** Drops the load state of a page the rail no longer wants cached. */
      const abandonPageLoad = (): void => {
        releasePageLoad();
        if (!pageLoadStatesRef.current.has(imageKey)) {
          return;
        }

        commitLoadStates((states) => {
          states.delete(imageKey);
        });
      };
      const failPageLoad = (
        error: unknown,
        fallbackStage: PageLoadStage
      ): void => {
        releasePageLoad();
        if (
          abortController.signal.aborted ||
          !cachedImageKeysRef.current.has(imageKey)
        ) {
          return;
        }

        const pageLoadError: PageLoadError<TPage> = {
          ...toPageLoadFailure(error, fallbackStage),
          index,
          page,
        };
        commitLoadStates((states) => {
          states.set(imageKey, { error: pageLoadError, status: "error" });
        });
        onPageLoadErrorRef.current?.(pageLoadError);
      };

      const bufferPromise = (async (): Promise<
        { buffer: ArrayBuffer } | { error: unknown }
      > => {
        try {
          return {
            buffer: await runDataPipeline(
              { page, signal: abortController.signal, url: page.src },
              plugins
            ),
          };
        } catch (error) {
          return { error };
        }
      })();

      if (page.placeholder !== undefined) {
        try {
          const placeholderBuffer = await runDataPipeline(
            { page, signal: abortController.signal, url: page.placeholder },
            []
          );
          const placeholderBitmap = await decodeImage(
            placeholderBuffer,
            page.placeholder
          );
          if (
            !setPageImage(index, {
              bitmap: placeholderBitmap,
              placeholder: true,
            })
          ) {
            abandonPageLoad();
            return;
          }
          await waitForVisiblePaint();
        } catch {
          // A placeholder is best-effort: only the full page decides the outcome.
        }
      }

      const result = await bufferPromise;
      if ("error" in result) {
        failPageLoad(result.error, "fetch");
        return;
      }

      let bitmap: DecodedImage;
      try {
        bitmap = await decodeImage(result.buffer, page.src, page.mimeType);
      } catch (error) {
        failPageLoad(error, "decode");
        return;
      }

      if (setPageImage(index, { bitmap, placeholder: false })) {
        commitLoadStates((states) => {
          states.set(imageKey, { status: "loaded" });
        });
        releasePageLoad();
        return;
      }

      abandonPageLoad();
    };

    void Promise.all(cachedIndices.map(loadPage));
  }, [
    cachedIndices,
    commitLoadStates,
    pages,
    plugins,
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- A retry re-runs the loader for a page that has already settled.
    retryNonce,
    shouldLoadImages,
  ]);

  useEffect(() => {
    if (!shouldLoadImages || keepImages) {
      return;
    }

    const retainedImageKeys = new Set(
      cachedIndices.flatMap((index) => {
        const page = pages[index];
        return page === undefined ? [] : [getPageImageKey(index, page)];
      })
    );
    const nextImages = new Map(pageImagesRef.current);
    const expiredImages: DecodedImage[] = [];

    for (const [key, image] of nextImages) {
      if (!retainedImageKeys.has(key)) {
        expiredImages.push(image.bitmap);
        nextImages.delete(key);
      }
    }

    for (const [key, controller] of pageLoadControllersRef.current) {
      if (!retainedImageKeys.has(key)) {
        controller.abort();
        pageLoadControllersRef.current.delete(key);
      }
    }

    const nextLoadStates = new Map(pageLoadStatesRef.current);
    for (const key of nextLoadStates.keys()) {
      if (!retainedImageKeys.has(key)) {
        nextLoadStates.delete(key);
      }
    }

    if (nextLoadStates.size !== pageLoadStatesRef.current.size) {
      pageLoadStatesRef.current = nextLoadStates;
      // oxlint-disable-next-line react/set-state-in-effect -- An evicted page must forget its outcome so it reloads when it returns.
      setPageLoadStates(nextLoadStates);
    }

    if (expiredImages.length > 0) {
      closeImageBitmaps(expiredImages);
      pageImagesRef.current = nextImages;
      // oxlint-disable-next-line react/set-state-in-effect -- Pages are evicted only after their transition DOM has unmounted.
      setPageImages(nextImages);
    }

    if (retiredImageBitmapsRef.current.length > 0) {
      closeImageBitmaps(retiredImageBitmapsRef.current);
      retiredImageBitmapsRef.current = [];
    }
  }, [cachedIndices, keepImages, pages, shouldLoadImages]);

  useEffect(
    () => () => {
      for (const controller of pageLoadControllersRef.current.values()) {
        controller.abort();
      }
      pageLoadControllersRef.current.clear();
      closeImageBitmaps([
        ...[...pageImagesRef.current.values()].map((image) => image.bitmap),
        ...retiredImageBitmapsRef.current,
      ]);
      // React Strict Mode deliberately re-runs effects during development.
      // Its simulated unmount preserves state, so an aborted "loading" entry
      // must not prevent the following effect from starting a fresh request.
      pageImagesRef.current = new Map();
      pageLoadStatesRef.current = new Map();
      retiredImageBitmapsRef.current = [];
    },
    []
  );

  return { images: pageImages, loadStates: pageLoadStates, retryPage };
};
