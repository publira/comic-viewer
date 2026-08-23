import { useEffect, useRef, useState } from "react";

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

interface UseViewportImagesOptions<TPage extends ViewerPage> {
  cachedIndices: readonly number[];
  keepImages: boolean;
  pages: readonly TPage[];
  plugins: readonly ViewerPlugin[];
  shouldLoadImages: boolean;
}

/** Loads, caches, and releases decoded pages for the active viewport rail. */
export const useViewportImages = <TPage extends ViewerPage>({
  cachedIndices,
  keepImages,
  pages,
  plugins,
  shouldLoadImages,
}: UseViewportImagesOptions<TPage>): ReadonlyMap<string, PageImage> => {
  const [pageImages, setPageImages] = useState<ReadonlyMap<string, PageImage>>(
    () => new Map()
  );
  const pageImagesRef = useRef<ReadonlyMap<string, PageImage>>(new Map());
  const cachedImageKeysRef = useRef<ReadonlySet<string>>(new Set());
  const pageLoadControllersRef = useRef(new Map<string, AbortController>());
  const retiredImageBitmapsRef = useRef<DecodedImage[]>([]);

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
        pageImagesRef.current.has(imageKey) ||
        pageLoadControllersRef.current.has(imageKey)
      ) {
        return;
      }

      const abortController = new AbortController();
      pageLoadControllersRef.current.set(imageKey, abortController);
      const releasePageLoad = (): void => {
        if (pageLoadControllersRef.current.get(imageKey) === abortController) {
          pageLoadControllersRef.current.delete(imageKey);
        }
      };

      try {
        const bufferPromise = (async (): Promise<ArrayBuffer | undefined> => {
          try {
            return await runDataPipeline(
              page.src,
              plugins,
              abortController.signal
            );
          } catch {
            return undefined;
          }
        })();

        if (page.placeholder !== undefined) {
          const placeholderBuffer = await runDataPipeline(
            page.placeholder,
            [],
            abortController.signal
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
            releasePageLoad();
            return;
          }
          await waitForVisiblePaint();
        }

        const buffer = await bufferPromise;
        if (buffer === undefined) {
          releasePageLoad();
          return;
        }
        const bitmap = await decodeImage(buffer, page.src, page.mimeType);
        setPageImage(index, { bitmap, placeholder: false });
      } catch {
        // Keep a decoded placeholder visible when the full page cannot load.
      }
      releasePageLoad();
    };

    void Promise.all(cachedIndices.map(loadPage));
  }, [cachedIndices, pages, plugins, shouldLoadImages]);

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
    },
    []
  );

  return pageImages;
};
