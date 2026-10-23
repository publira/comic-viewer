import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useViewportSize } from "./use-viewport-size";
import { MockResizeObserver } from "./viewport-test-helpers";

/** Stands in for the resolution queries, reporting the ones still watched. */
const mockResolutionQueries = () => {
  const listeners = new Map<string, () => void>();

  vi.stubGlobal(
    "matchMedia",
    vi.fn<(query: string) => Partial<MediaQueryList>>((query) => ({
      addEventListener: (_type: string, listener: unknown) => {
        listeners.set(query, listener as () => void);
      },
      matches: true,
      removeEventListener: () => {
        listeners.delete(query);
      },
    }))
  );

  return listeners;
};

const renderViewportSize = () => {
  const ref = { current: document.createElement("div") };
  return renderHook(() => useViewportSize(ref));
};

describe(useViewportSize, () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("measures the viewport before paint and follows its resizes", () => {
    const { result } = renderViewportSize();

    expect(result.current).toStrictEqual({ density: 1, height: 0, width: 0 });

    act(() => {
      MockResizeObserver.trigger(600, 400);
    });

    expect(result.current).toStrictEqual({
      density: 1,
      height: 400,
      width: 600,
    });
  });

  it("follows a density change that leaves the CSS size as it was", () => {
    const listeners = mockResolutionQueries();
    vi.stubGlobal("devicePixelRatio", 1);
    const { result } = renderViewportSize();
    act(() => {
      MockResizeObserver.trigger(600, 400);
    });

    expect([...listeners.keys()]).toStrictEqual(["(resolution: 1dppx)"]);

    vi.stubGlobal("devicePixelRatio", 2);
    act(() => {
      listeners.get("(resolution: 1dppx)")?.();
    });

    expect(result.current).toStrictEqual({
      density: 2,
      height: 400,
      width: 600,
    });
    // The query is moved on to the new density, so the next change is heard.
    expect([...listeners.keys()]).toStrictEqual(["(resolution: 2dppx)"]);
  });
});
