import { useCallback, useEffect, useRef, useState } from "react";

import { closeDecodedImages } from "./page-image";
import type { DecodedPageImage } from "./page-image";
import { toPageLoadFailure } from "./page-load";
import type { PageLoadError, PageLoadStage, PageLoadStatus } from "./page-load";
import { runDataPipeline, runDecodePipeline } from "./plugin";
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

export interface PageImage {
  bitmap: DecodedPageImage;
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
): Promise<DecodedPageImage> => {
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
  /** An entry is `undefined` while the metadata of that page is unresolved. */
  pages: readonly (TPage | undefined)[];
  plugins: readonly ViewerPlugin[];
  /**
   * The pages loaded ahead of the reader, beyond the ones the viewport can
   * render. They are cached and evicted like the pages of the rail, but they
   * are queued behind it so they never delay the spread on screen.
   */
  preloadIndices: readonly number[];
  shouldLoadImages: boolean;
}

/** Loads, caches, and releases decoded pages for the active viewport rail. */
export const useViewportImages = <TPage extends ViewerPage>({
  cachedIndices,
  keepImages,
  onPageLoadError,
  pages,
  plugins,
  preloadIndices,
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
  const retiredImageBitmapsRef = useRef<DecodedPageImage[]>([]);
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
      [...cachedIndices, ...preloadIndices].flatMap((index) => {
        const page = pages[index];
        return page === undefined ? [] : [getPageImageKey(index, page)];
      })
    );
    cachedImageKeysRef.current = requestedImageKeys;
    const setPageImage = (index: number, image: PageImage): boolean => {
      const page = pages[index];
      if (page === undefined) {
        closeDecodedImages([image.bitmap]);
        return false;
      }

      const imageKey = getPageImageKey(index, page);
      if (!cachedImageKeysRef.current.has(imageKey)) {
        closeDecodedImages([image.bitmap]);
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
        // A preload queued behind the rail is dropped when the reader moves
        // away from the page before its load starts.
        !cachedImageKeysRef.current.has(imageKey) ||
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

      let bitmap: DecodedPageImage;
      try {
        bitmap = await decodeImage(result.buffer, page.src, page.mimeType);
      } catch (error) {
        failPageLoad(error, "decode");
        return;
      }

      try {
        // The decode pipeline owns the image it is handed, so a hook that
        // throws leaves nothing here to release.
        bitmap = await runDecodePipeline(
          {
            image: bitmap,
            page,
            signal: abortController.signal,
            url: page.src,
          },
          plugins
        );
      } catch (error) {
        failPageLoad(error, "image-transform");
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

    void (async () => {
      // The spread on screen is what the reader waits for, so the pages beyond
      // the rail are queued only once the rail's own loads have run.
      await Promise.all(cachedIndices.map(loadPage));
      await Promise.all(preloadIndices.map(loadPage));
    })();
  }, [
    cachedIndices,
    commitLoadStates,
    pages,
    plugins,
    preloadIndices,
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- A retry re-runs the loader for a page that has already settled.
    retryNonce,
    shouldLoadImages,
  ]);

  useEffect(() => {
    if (!shouldLoadImages || keepImages) {
      return;
    }

    const retainedImageKeys = new Set(
      [...cachedIndices, ...preloadIndices].flatMap((index) => {
        const page = pages[index];
        return page === undefined ? [] : [getPageImageKey(index, page)];
      })
    );
    const nextImages = new Map(pageImagesRef.current);
    const expiredImages: DecodedPageImage[] = [];

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
      closeDecodedImages(expiredImages);
      pageImagesRef.current = nextImages;
      // oxlint-disable-next-line react/set-state-in-effect -- Pages are evicted only after their transition DOM has unmounted.
      setPageImages(nextImages);
    }

    if (retiredImageBitmapsRef.current.length > 0) {
      closeDecodedImages(retiredImageBitmapsRef.current);
      retiredImageBitmapsRef.current = [];
    }
  }, [cachedIndices, keepImages, pages, preloadIndices, shouldLoadImages]);

  useEffect(
    () => () => {
      for (const controller of pageLoadControllersRef.current.values()) {
        controller.abort();
      }
      pageLoadControllersRef.current.clear();
      closeDecodedImages([
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
