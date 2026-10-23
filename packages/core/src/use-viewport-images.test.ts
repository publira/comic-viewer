import { renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PageLoadError } from "./page-load";
import {
  getImageMimeType,
  getPageImageKey,
  useViewportImages,
} from "./use-viewport-images";
import type { ViewerPage } from "./viewer-context";
import type { MockFetch } from "./viewport-test-helpers";

const testPages: ViewerPage[] = Array.from({ length: 8 }, (_, index) => ({
  id: `p${index}`,
  src: `page${index}.png`,
  title: `Page ${index}`,
}));

const getPageRequirement = () => ({ density: 1, width: 800 });

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
        getPageRequirement,
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
          getPageRequirement,
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
      getPageRequirement,
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

  it("restarts an image load after Strict Mode aborts the initial effect", async () => {
    mockPageLoading();
    const fetchMock = vi.fn<MockFetch>((_input, init) => {
      const signal = init?.signal;

      // eslint-disable-next-line promise/avoid-new -- The first Strict Mode request must stay pending until it is aborted.
      return new Promise((resolve, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
        if (fetchMock.mock.calls.length === 2) {
          resolve({
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
            ok: true,
          });
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () =>
        useViewportImages({
          cachedIndices: [0],
          getPageRequirement,
          keepImages: false,
          pages: testPages,
          plugins: [],
          preloadIndices: [],
          shouldLoadImages: true,
        }),
      { wrapper: StrictMode }
    );

    await waitFor(() => {
      expect(result.current.loadStates.get("0:page0.png")?.status).toBe(
        "loaded"
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("waits for the size the pages are drawn at before loading them", () => {
    const fetchedUrls = mockPageLoading();
    renderHook(() =>
      useViewportImages({
        cachedIndices: [0],
        getPageRequirement: undefined,
        keepImages: false,
        pages: testPages,
        plugins: [],
        preloadIndices: [],
        shouldLoadImages: true,
      })
    );

    expect(fetchedUrls).toStrictEqual([]);
  });
});

const srcsetPages: ViewerPage[] = [
  {
    id: "p0",
    src: "page0.png",
    srcset: "page0@400w.png 400w, page0@800w.png 800w, page0@1600w.png 1600w",
    title: "Page 0",
  },
];

type ViewportImagesOptions = Parameters<
  typeof useViewportImages<ViewerPage>
>[0];

/** Loads the srcset page for a required width that `resize` changes. */
const renderSrcsetImages = (
  width: number,
  options: Partial<ViewportImagesOptions> = {}
) => {
  const hook = renderHook(
    (props: { width: number }) =>
      useViewportImages({
        cachedIndices: [0],
        getPageRequirement: () => ({ density: 1, width: props.width }),
        keepImages: false,
        pages: srcsetPages,
        plugins: [],
        preloadIndices: [],
        shouldLoadImages: true,
        ...options,
      }),
    { initialProps: { width } }
  );

  return {
    ...hook,
    resize: (nextWidth: number) => {
      hook.rerender({ width: nextWidth });
    },
  };
};

const getHeldImage = (result: {
  current: ReturnType<typeof useViewportImages>;
}) => result.current.images.get("0:page0.png")?.bitmap;

describe("useViewportImages with srcset", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hands the pipeline the candidate the page is drawn at", async () => {
    const fetchedUrls = mockPageLoading();
    const hookUrls: string[] = [];
    const { result } = renderSrcsetImages(700, {
      plugins: [
        {
          afterDecode: ({ url }) => {
            hookUrls.push(`afterDecode ${url}`);
          },
          afterFetch: ({ url }) => {
            hookUrls.push(`afterFetch ${url}`);
          },
          beforeFetch: ({ url }) => {
            hookUrls.push(`beforeFetch ${url}`);
          },
        },
      ],
    });

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });

    expect(fetchedUrls).toStrictEqual(["page0@800w.png"]);
    expect(hookUrls).toStrictEqual([
      "beforeFetch page0@800w.png",
      "afterFetch page0@800w.png",
      "afterDecode page0@800w.png",
    ]);
  });

  it("draws the image it holds while a larger candidate loads", async () => {
    const fetchedUrls = mockPageLoading();
    const { resize, result } = renderSrcsetImages(700);

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });
    const smallImage = getHeldImage(result) as ImageBitmap;

    let finishUpgrade: (() => void) | undefined;
    vi.mocked(fetch).mockImplementationOnce((input) => {
      fetchedUrls.push(String(input));
      // eslint-disable-next-line promise/avoid-new -- The upgrade is held back until the test inspects the page in between.
      return new Promise((resolve) => {
        finishUpgrade = () => {
          resolve({
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
            ok: true,
          } as Response);
        };
      });
    });
    resize(1200);

    await waitFor(() => {
      expect(fetchedUrls).toStrictEqual(["page0@800w.png", "page0@1600w.png"]);
    });
    // The page stays drawn and loaded, so a template shows no spinner.
    expect(getHeldImage(result)).toBe(smallImage);
    expect(result.current.loadStates.get("0:page0.png")?.status).toBe("loaded");

    finishUpgrade?.();

    await waitFor(() => {
      expect(getHeldImage(result)).not.toBe(smallImage);
    });
    expect(smallImage.close).toHaveBeenCalledOnce();
  });

  it("keeps a larger image when the page is drawn smaller", async () => {
    const fetchedUrls = mockPageLoading();
    const { resize, result } = renderSrcsetImages(1200);

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });
    const largeImage = getHeldImage(result);

    resize(300);
    // Growing again up to the width already served fetches nothing either.
    resize(1000);

    await waitFor(() => {
      expect(result.current.loadStates.get("0:page0.png")?.status).toBe(
        "loaded"
      );
    });
    expect(getHeldImage(result)).toBe(largeImage);
    expect(fetchedUrls).toStrictEqual(["page0@1600w.png"]);
  });

  it("keeps the page drawn when a larger candidate fails to load", async () => {
    const fetchedUrls = mockPageLoading();
    const onPageLoadError = vi.fn<(error: PageLoadError) => void>();
    const { resize, result } = renderSrcsetImages(300, { onPageLoadError });

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });
    const smallImage = getHeldImage(result);

    vi.mocked(fetch).mockImplementationOnce((input) => {
      fetchedUrls.push(String(input));
      return Promise.reject(new Error("offline"));
    });
    resize(700);

    await waitFor(() => {
      expect(onPageLoadError).toHaveBeenCalledOnce();
    });
    expect(getHeldImage(result)).toBe(smallImage);
    expect(result.current.loadStates.get("0:page0.png")?.status).toBe("loaded");

    // The candidate that failed is not asked for again on every render.
    resize(750);
    expect(fetchedUrls).toStrictEqual(["page0@400w.png", "page0@800w.png"]);
  });

  it("drops the placeholder of a superseded load that decodes late", async () => {
    mockPageLoading();
    let finishFirstPlaceholder: (() => void) | undefined;
    const lateBitmap = { close: vi.fn<() => void>(), height: 1, width: 1 };
    vi.mocked(createImageBitmap).mockImplementationOnce(
      () =>
        // eslint-disable-next-line promise/avoid-new -- The first placeholder decode is held back until the larger load has finished.
        new Promise((resolve) => {
          finishFirstPlaceholder = () => {
            resolve(lateBitmap as unknown as ImageBitmap);
          };
        })
    );
    const { resize, result } = renderSrcsetImages(300, {
      pages: [{ ...srcsetPages[0], placeholder: "preview.png" }],
    });

    await waitFor(() => {
      expect(finishFirstPlaceholder).toBeDefined();
    });
    resize(1200);

    await waitFor(() => {
      expect(result.current.images.get("0:page0.png")).toMatchObject({
        placeholder: false,
      });
    });
    finishFirstPlaceholder?.();

    await waitFor(() => {
      expect(lateBitmap.close).toHaveBeenCalledOnce();
    });
    expect(result.current.images.get("0:page0.png")).toMatchObject({
      placeholder: false,
    });
  });
});
