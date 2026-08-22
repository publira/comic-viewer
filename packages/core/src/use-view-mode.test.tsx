import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useViewMode } from "./use-view-mode";
import { ViewerProvider } from "./viewer-context";

// eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
class MockResizeObserver {
  static callback: ResizeObserverCallback | null = null;
  static instance: MockResizeObserver | null = null;

  // eslint-disable-next-line promise/prefer-await-to-callbacks
  constructor(callback: ResizeObserverCallback) {
    MockResizeObserver.callback = callback;
    MockResizeObserver.instance = this;
  }

  observe = vi.fn<() => void>();
  disconnect = vi.fn<() => void>();
  unobserve = vi.fn<() => void>();

  // Test helper: fires the callback with the given width
  static trigger(width: number) {
    MockResizeObserver.callback?.(
      [
        {
          contentRect: { width } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      MockResizeObserver.instance as unknown as ResizeObserver
    );
  }
}

const pages = [{ id: "p1", src: "page1.png", title: "Page 1" }];

const makeWrapper = () =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ViewerProvider pages={pages}>{children}</ViewerProvider>;
  };

describe(useViewMode, () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.callback = null;
    MockResizeObserver.instance = null;
  });

  it("returns the initial viewMode from ViewerProvider", () => {
    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(null);
        return useViewMode(ref);
      },
      { wrapper: makeWrapper() }
    );

    expect(result.current).toBe("single");
  });

  it("switches to double when container width meets the threshold", () => {
    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));
        return useViewMode(ref, 768);
      },
      { wrapper: makeWrapper() }
    );

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(result.current).toBe("double");
  });

  it("switches to single when container width falls below the threshold", () => {
    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));
        return useViewMode(ref, 768);
      },
      { wrapper: makeWrapper() }
    );

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    act(() => {
      MockResizeObserver.trigger(600);
    });

    expect(result.current).toBe("single");
  });

  it("switches to double when container width equals the threshold exactly", () => {
    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));
        return useViewMode(ref, 768);
      },
      { wrapper: makeWrapper() }
    );

    act(() => {
      MockResizeObserver.trigger(768);
    });

    expect(result.current).toBe("double");
  });

  it("disconnects ResizeObserver on unmount", () => {
    const { result, unmount } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));
        return useViewMode(ref);
      },
      { wrapper: makeWrapper() }
    );

    unmount();

    expect(MockResizeObserver.instance?.disconnect).toHaveBeenCalledOnce();

    // suppress unused variable lint error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _unused = result;
  });
});
