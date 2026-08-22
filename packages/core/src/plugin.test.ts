import { describe, expect, it, vi } from "vitest";

import { definePlugin, runDataPipeline, runPageChangeHooks } from "./plugin";

describe("plugin pipeline", () => {
  it("defines plugins without changing their hook implementations", () => {
    const afterFetch = vi.fn();
    const plugin = definePlugin({ afterFetch, name: "decrypt" });

    expect(plugin).toEqual({ afterFetch, name: "decrypt" });
  });

  it("runs data hooks in order and passes each result to the next hook", async () => {
    const events: string[] = [];
    const firstBuffer = new ArrayBuffer(1);
    const secondBuffer = new ArrayBuffer(2);
    const finalBuffer = new ArrayBuffer(3);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await runDataPipeline("page.jpg", [
      definePlugin({
        afterFetch: (buffer) => {
          events.push(`after-1:${buffer.byteLength}`);
          return secondBuffer;
        },
        beforeFetch: (url) => {
          events.push(`before-1:${url}`);
          return `secure/${url}`;
        },
        customFetch: (url) => {
          events.push(`custom-1:${url}`);
          return firstBuffer;
        },
      }),
      definePlugin({
        afterFetch: (buffer) => {
          events.push(`after-2:${buffer.byteLength}`);
          return finalBuffer;
        },
        beforeFetch: (url) => {
          events.push(`before-2:${url}`);
        },
        customFetch: (url) => {
          events.push(`custom-2:${url}`);
        },
      }),
    ]);

    expect(result).toBe(finalBuffer);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(events).toEqual([
      "before-1:page.jpg",
      "before-2:secure/page.jpg",
      "custom-1:secure/page.jpg",
      "custom-2:secure/page.jpg",
      "after-1:1",
      "after-2:2",
    ]);
  });

  it("uses the built-in fetch when no custom fetch returns a buffer", async () => {
    const buffer = new ArrayBuffer(4);
    const fetchMock = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(buffer),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(runDataPipeline("page.jpg", [])).resolves.toBe(buffer);
    expect(fetchMock).toHaveBeenCalledWith("page.jpg", {
      signal: undefined,
    });
  });

  it("forwards the abort signal to the built-in fetch", async () => {
    const abortController = new AbortController();
    const fetchMock = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    await runDataPipeline("page.jpg", [], abortController.signal);

    expect(fetchMock).toHaveBeenCalledWith("page.jpg", {
      signal: abortController.signal,
    });
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

    expect(events).toEqual(["first:2/8", "second:2/8"]);
  });

  it("continues page-change hooks after a plugin fails", async () => {
    const followingHook = vi.fn();

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
