import { act, renderHook, waitFor } from "@testing-library/react";
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

/** The bytes of a PNG up to its size, which is all the loader reads. */
const pngHeader = (width: number, height: number): ArrayBuffer => {
  const bytes = new Uint8Array(24);
  const view = new DataView(bytes.buffer);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  view.setUint32(8, 13);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes.buffer;
};

/** Serves a page as wide as `naturalWidth`, decoded at the width asked for. */
const mockSizedPageLoading = (naturalWidth: number) => {
  const fetchedUrls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      fetchedUrls.push(String(input));

      return Promise.resolve({
        arrayBuffer: () =>
          Promise.resolve(pngHeader(naturalWidth, naturalWidth * 1.5)),
        ok: true,
      });
    })
  );
  const decode = vi.fn<
    (image: Blob, options?: ImageBitmapOptions) => Promise<ImageBitmap>
  >((_image, options) =>
    Promise.resolve({
      close: vi.fn<() => void>(),
      height: 1,
      width: options?.resizeWidth ?? naturalWidth,
    } as unknown as ImageBitmap)
  );
  vi.stubGlobal("createImageBitmap", decode);

  return { decode, fetchedUrls };
};

/** Lets the loads a render started run as far as they can. */
const settle = () =>
  act(
    () =>
      // eslint-disable-next-line promise/avoid-new -- A task boundary lets every pending decode start first.
      new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      })
  );

const singleSourcePages: ViewerPage[] = [
  { id: "p0", src: "page0.png", title: "Page 0" },
];

describe("useViewportImages decoding at the drawn size", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("decodes a page no wider than the width it is drawn at", async () => {
    const { decode } = mockSizedPageLoading(4000);
    const { result } = renderSrcsetImages(390.5, { pages: singleSourcePages });

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });

    expect(decode).toHaveBeenCalledExactlyOnceWith(expect.any(Blob), {
      resizeQuality: "high",
      resizeWidth: 391,
    });
    expect(getHeldImage(result)).toMatchObject({ width: 391 });
  });

  it("decodes a page narrower than its slot at its own size", async () => {
    const { decode } = mockSizedPageLoading(800);
    const { result } = renderSrcsetImages(1200, { pages: singleSourcePages });

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });

    expect(decode).toHaveBeenCalledExactlyOnceWith(expect.any(Blob));
  });

  it("decodes a page of no known width at its own size", async () => {
    const { decode } = mockSizedPageLoading(4000);
    const { result } = renderSrcsetImages(Number.POSITIVE_INFINITY, {
      pages: singleSourcePages,
    });

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });

    expect(decode).toHaveBeenCalledExactlyOnceWith(expect.any(Blob));
  });

  it("leaves the placeholder at its own size", async () => {
    const { decode } = mockSizedPageLoading(4000);
    const { result } = renderSrcsetImages(400, {
      pages: [{ ...singleSourcePages[0], placeholder: "preview.png" }],
    });

    await waitFor(() => {
      expect(result.current.images.get("0:page0.png")).toMatchObject({
        placeholder: false,
      });
    });

    expect(decode.mock.calls).toStrictEqual([
      [expect.any(Blob)],
      [expect.any(Blob), { resizeQuality: "high", resizeWidth: 400 }],
    ]);
  });

  it("decodes the page wider from the data it kept as the slot grows", async () => {
    const { decode, fetchedUrls } = mockSizedPageLoading(4000);
    const hookWidths: number[] = [];
    const { resize, result } = renderSrcsetImages(400, {
      pages: singleSourcePages,
      plugins: [
        {
          afterDecode: ({ image }) => {
            hookWidths.push(image.width);
          },
        },
      ],
    });

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });
    const narrowImage = getHeldImage(result) as ImageBitmap;

    resize(1200);

    await waitFor(() => {
      expect(getHeldImage(result)).toMatchObject({ width: 1200 });
    });
    expect(fetchedUrls).toStrictEqual(["page0.png"]);
    expect(decode).toHaveBeenLastCalledWith(expect.any(Blob), {
      resizeQuality: "high",
      resizeWidth: 1200,
    });
    // The hooks see the image the page is drawn from each time.
    expect(hookWidths).toStrictEqual([400, 1200]);
    expect(narrowImage.close).toHaveBeenCalledOnce();
    expect(result.current.loadStates.get("0:page0.png")?.status).toBe("loaded");
  });

  it("keeps the wider image when the slot shrinks", async () => {
    const { decode } = mockSizedPageLoading(4000);
    const { resize, result } = renderSrcsetImages(1200, {
      pages: singleSourcePages,
    });

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });
    const wideImage = getHeldImage(result);

    resize(400);
    resize(1000);
    await settle();

    expect(getHeldImage(result)).toBe(wideImage);
    expect(decode).toHaveBeenCalledOnce();
  });

  it("stops at the file's own size as the slot outgrows it", async () => {
    const { decode, fetchedUrls } = mockSizedPageLoading(1000);
    const { resize, result } = renderSrcsetImages(400, {
      pages: singleSourcePages,
    });

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });

    resize(1200);

    await waitFor(() => {
      expect(getHeldImage(result)).toMatchObject({ width: 1000 });
    });
    expect(decode).toHaveBeenLastCalledWith(expect.any(Blob));

    resize(1600);
    await settle();
    expect(decode).toHaveBeenCalledTimes(2);
    expect(fetchedUrls).toStrictEqual(["page0.png"]);
  });

  it("fetches a larger candidate rather than decoding a smaller one wider", async () => {
    const { decode, fetchedUrls } = mockSizedPageLoading(1600);
    const { resize, result } = renderSrcsetImages(700);

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });

    resize(1200);

    await waitFor(() => {
      expect(getHeldImage(result)).toMatchObject({ width: 1200 });
    });
    expect(fetchedUrls).toStrictEqual(["page0@800w.png", "page0@1600w.png"]);
    expect(decode).toHaveBeenCalledTimes(2);
  });

  it("does not decode again after a wider decode fails", async () => {
    const { decode } = mockSizedPageLoading(4000);
    const onPageLoadError = vi.fn<(error: PageLoadError) => void>();
    const { resize, result } = renderSrcsetImages(400, {
      onPageLoadError,
      pages: singleSourcePages,
    });

    await waitFor(() => {
      expect(getHeldImage(result)).toBeDefined();
    });
    const narrowImage = getHeldImage(result);

    // jsdom has no image element decoder to fall back on either.
    decode.mockRejectedValueOnce(new Error("out of memory"));
    resize(1200);

    await waitFor(() => {
      expect(onPageLoadError).toHaveBeenCalledOnce();
    });
    expect(onPageLoadError.mock.calls[0]?.[0]).toMatchObject({
      stage: "decode",
    });
    expect(getHeldImage(result)).toBe(narrowImage);
    expect(result.current.loadStates.get("0:page0.png")?.status).toBe("loaded");

    resize(1300);
    await settle();
    expect(decode).toHaveBeenCalledTimes(2);
  });
});
