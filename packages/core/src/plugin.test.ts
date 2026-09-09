import { describe, expect, it, vi } from "vitest";

import type { DecodedPageImage } from "./page-image";
import {
  definePlugin,
  runDataPipeline,
  runDecodePipeline,
  runPageChangeHooks,
} from "./plugin";
import type { ViewerPage } from "./viewer-context";

const decodedPage: ViewerPage = {
  id: "page-1",
  src: "page.jpg",
  title: "Page 1",
};

/** A decoded image that records whether the pipeline released it. */
const createDecodedImage = (name: string): DecodedPageImage =>
  ({
    close: vi.fn<() => void>(),
    height: 2,
    name,
    width: 1,
  }) as unknown as ImageBitmap;

const releaseOf = (image: DecodedPageImage): (() => void) =>
  (image as ImageBitmap).close;

describe("plugin pipeline", () => {
  it("defines plugins without changing their hook implementations", () => {
    const afterFetch = vi.fn<() => void>();
    const plugin = definePlugin({ afterFetch, name: "decrypt" });

    expect(plugin).toStrictEqual({ afterFetch, name: "decrypt" });
  });

  it("runs data hooks in order and passes each result to the next hook", async () => {
    const events: string[] = [];
    const firstBuffer = new ArrayBuffer(1);
    const secondBuffer = new ArrayBuffer(2);
    const finalBuffer = new ArrayBuffer(3);
    const fetchMock = vi.fn<() => Promise<unknown>>();
    const abortController = new AbortController();
    const page: ViewerPage = {
      id: "page-1",
      src: "page.jpg",
      title: "Page 1",
    };
    vi.stubGlobal("fetch", fetchMock);

    const result = await runDataPipeline(
      { page, signal: abortController.signal, url: "page.jpg" },
      [
        definePlugin({
          afterFetch: ({ buffer, page: contextPage, signal, url }) => {
            events.push(
              `after-1:${url}:${buffer.byteLength}:${contextPage?.id}:${String(signal === abortController.signal)}`
            );
            return secondBuffer;
          },
          beforeFetch: ({ page: contextPage, signal, url }) => {
            events.push(
              `before-1:${url}:${contextPage?.id}:${String(signal === abortController.signal)}`
            );
            return `secure/${url}`;
          },
          customFetch: ({ page: contextPage, signal, url }) => {
            events.push(
              `custom-1:${url}:${contextPage?.id}:${String(signal === abortController.signal)}`
            );
            return firstBuffer;
          },
        }),
        definePlugin({
          afterFetch: ({ buffer, url }) => {
            events.push(`after-2:${url}:${buffer.byteLength}`);
            return finalBuffer;
          },
          beforeFetch: ({ url }) => {
            events.push(`before-2:${url}`);
          },
          customFetch: ({ url }) => {
            events.push(`custom-2:${url}`);
          },
        }),
      ]
    );

    expect(result).toBe(finalBuffer);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(events).toStrictEqual([
      "before-1:page.jpg:page-1:true",
      "before-2:secure/page.jpg",
      "custom-1:secure/page.jpg:page-1:true",
      "custom-2:secure/page.jpg",
      "after-1:secure/page.jpg:1:page-1:true",
      "after-2:secure/page.jpg:2",
    ]);
  });

  it("uses the built-in fetch when no custom fetch returns a buffer", async () => {
    const buffer = new ArrayBuffer(4);
    const abortController = new AbortController();
    const page: ViewerPage = {
      id: "page-1",
      src: "page.jpg",
      title: "Page 1",
    };
    const fetchMock = vi.fn<() => Promise<unknown>>().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(buffer),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      runDataPipeline(
        { page, signal: abortController.signal, url: "page.jpg" },
        []
      )
    ).resolves.toBe(buffer);
    expect(fetchMock).toHaveBeenCalledWith("page.jpg", {
      signal: abortController.signal,
    });
  });

  it("forwards the abort signal to the built-in fetch", async () => {
    const abortController = new AbortController();
    const page: ViewerPage = {
      id: "page-1",
      src: "page.jpg",
      title: "Page 1",
    };
    const fetchMock = vi.fn<() => Promise<unknown>>().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await runDataPipeline(
      { page, signal: abortController.signal, url: "page.jpg" },
      []
    );

    expect(fetchMock).toHaveBeenCalledWith("page.jpg", {
      signal: abortController.signal,
    });
  });

  it("runs decode hooks in order and passes each image to the next hook", async () => {
    const events: string[] = [];
    const decodedImage = createDecodedImage("decoded");
    const watermarkedImage = createDecodedImage("watermarked");
    const abortController = new AbortController();

    const result = await runDecodePipeline(
      {
        image: decodedImage,
        page: decodedPage,
        signal: abortController.signal,
        url: "page.jpg",
      },
      [
        definePlugin({
          afterDecode: ({ image, page, signal, url }) => {
            events.push(
              `watermark:${url}:${page.id}:${String(signal === abortController.signal)}:${String(image === decodedImage)}`
            );
            return watermarkedImage;
          },
          name: "watermark",
        }),
        definePlugin({
          afterDecode: ({ image }) => {
            events.push(`measure:${String(image === watermarkedImage)}`);
          },
          name: "measure",
        }),
      ]
    );

    expect(result).toBe(watermarkedImage);
    expect(events).toStrictEqual([
      "watermark:page.jpg:page-1:true:true",
      "measure:true",
    ]);
    // The viewer owns the decoded image, so the replaced one is released here
    // rather than left to the garbage collector.
    expect(releaseOf(decodedImage)).toHaveBeenCalledOnce();
    expect(releaseOf(watermarkedImage)).not.toHaveBeenCalled();
  });

  it("keeps the decoded image when no hook returns one", async () => {
    const decodedImage = createDecodedImage("decoded");
    const inspect = vi.fn<() => void>();

    await expect(
      runDecodePipeline(
        {
          image: decodedImage,
          page: decodedPage,
          signal: new AbortController().signal,
          url: "page.jpg",
        },
        [definePlugin({ afterDecode: inspect, name: "inspect" })]
      )
    ).resolves.toBe(decodedImage);
    expect(inspect).toHaveBeenCalledOnce();
    expect(releaseOf(decodedImage)).not.toHaveBeenCalled();
  });

  it("reports a failing decode hook with the image-transform stage", async () => {
    const decodedImage = createDecodedImage("decoded");
    const followingHook = vi.fn<() => void>();

    await expect(
      runDecodePipeline(
        {
          image: decodedImage,
          page: decodedPage,
          signal: new AbortController().signal,
          url: "page.jpg",
        },
        [
          definePlugin({
            afterDecode: () => {
              throw new Error("canvas unavailable");
            },
            name: "failing-watermark",
          }),
          definePlugin({ afterDecode: followingHook, name: "measure" }),
        ]
      )
    ).rejects.toMatchObject({
      cause: new Error("canvas unavailable"),
      stage: "image-transform",
    });
    expect(followingHook).not.toHaveBeenCalled();
    // A failed pipeline leaves no image for the caller to release.
    expect(releaseOf(decodedImage)).toHaveBeenCalledOnce();
  });

  it("runs page-change hooks sequentially", async () => {
    const events: string[] = [];

    await runPageChangeHooks(
      [
        definePlugin({
          onPageChange: async (index, total) => {
            await Promise.resolve();
            events.push(`first:${index}/${total}`);
          },
        }),
        definePlugin({
          onPageChange: (index, total) => {
            events.push(`second:${index}/${total}`);
          },
        }),
      ],
      2,
      8
    );

    expect(events).toStrictEqual(["first:2/8", "second:2/8"]);
  });

  it("continues page-change hooks after a plugin fails", async () => {
    const followingHook = vi.fn<() => void>();

    await runPageChangeHooks(
      [
        definePlugin({
          onPageChange: () => {
            throw new Error("analytics unavailable");
          },
        }),
        definePlugin({ onPageChange: followingHook }),
      ],
      2,
      8
    );

    expect(followingHook).toHaveBeenCalledWith(2, 8);
  });
});
