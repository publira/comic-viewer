import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getImageMimeType,
  getPageImageKey,
  useViewportImages,
} from "./use-viewport-images";
import type { ViewerPage } from "./viewer-context";

const testPages: ViewerPage[] = Array.from({ length: 8 }, (_, index) => ({
  id: `p${index}`,
  src: `page${index}.png`,
  title: `Page ${index}`,
}));

/** Stubs fetching and decoding, and records the pages that were fetched. */
const mockPageLoading = (): string[] => {
  const fetchedUrls: string[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      fetchedUrls.push(String(input));

      return Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
        ok: true,
      });
    })
  );
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(() =>
      Promise.resolve({ close: vi.fn<() => void>(), height: 1, width: 1 })
    )
  );

  return fetchedUrls;
};

describe(getImageMimeType, () => {
  it("preserves image MIME types when decoding fetched data", () => {
    expect(getImageMimeType("data:image/svg+xml;charset=UTF-8,<svg />")).toBe(
      "image/svg+xml"
    );
    expect(getImageMimeType("https://example.com/page.webp?token=abc")).toBe(
      "image/webp"
    );
    expect(getImageMimeType("/plugin-pages/page-1.jpg")).toBe("image/jpeg");
    expect(getImageMimeType("/plugin-pages/page-1.jpg.enc", "image/jpeg")).toBe(
      "image/jpeg"
    );
  });

  it("returns undefined for an unknown extension", () => {
    expect(getImageMimeType("/plugin-pages/page-1.bin")).toBeUndefined();
  });
});

describe(getPageImageKey, () => {
  it("keys a cached image by its index and source", () => {
    expect(
      getPageImageKey(2, { id: "p3", src: "page3.png", title: "Page 3" })
    ).toBe("2:page3.png");
  });
});

describe(useViewportImages, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the preload window once the pages of the rail have loaded", async () => {
    const fetchedUrls = mockPageLoading();
    const { result } = renderHook(() =>
      useViewportImages({
        cachedIndices: [2, 3],
        keepImages: false,
        pages: testPages,
        plugins: [],
        preloadIndices: [4, 5],
        shouldLoadImages: true,
      })
    );

    await waitFor(() => {
      expect(result.current.images.size).toBe(4);
    });

    // The spread on screen is fetched first, and the preload window only once
    // it has settled, so preloading cannot delay the page being read.
    expect(fetchedUrls).toStrictEqual([
      "page2.png",
      "page3.png",
      "page4.png",
      "page5.png",
    ]);
  });

  it("keeps a preloaded image until it leaves the wider window", async () => {
    const fetchedUrls = mockPageLoading();
    const { rerender, result } = renderHook(
      (props: Parameters<typeof useViewportImages<ViewerPage>>[0]) =>
        useViewportImages(props),
      {
        initialProps: {
          cachedIndices: [2, 3],
          keepImages: false,
          pages: testPages,
          plugins: [],
          preloadIndices: [4, 5],
          shouldLoadImages: true,
        },
      }
    );

    await waitFor(() => {
      expect(result.current.images.size).toBe(4);
    });

    rerender({
      cachedIndices: [4, 5],
      keepImages: false,
      pages: testPages,
      plugins: [],
      preloadIndices: [6, 7],
      shouldLoadImages: true,
    });

    await waitFor(() => {
      expect(result.current.images.size).toBe(4);
    });

    // The spread that was preloaded is now on screen without being fetched
    // again, and the pages left behind by both windows are evicted.
    expect(new Set(result.current.images.keys())).toStrictEqual(
      new Set(["4:page4.png", "5:page5.png", "6:page6.png", "7:page7.png"])
    );
    expect(fetchedUrls).toStrictEqual([
      "page2.png",
      "page3.png",
      "page4.png",
      "page5.png",
      "page6.png",
      "page7.png",
    ]);
  });
});
