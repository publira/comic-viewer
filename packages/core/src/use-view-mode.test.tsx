import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useViewMode } from "./use-view-mode";
import { useViewerContext, ViewerProvider } from "./viewer-context";
import type { ViewMode } from "./viewer-context";
import { MockResizeObserver } from "./viewport-test-helpers";

const pages = [{ id: "p1", src: "page1.png", title: "Page 1" }];

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ViewerProvider pages={pages}>{children}</ViewerProvider>
);

describe(useViewMode, () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.reset();
  });

  it("returns the initial viewMode from ViewerProvider", () => {
    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(null);

        return useViewMode(ref);
      },
      { wrapper: Wrapper }
    );

    expect(result.current).toBe("single");
  });

  it("switches to double when container width meets the threshold", () => {
    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));

        return useViewMode(ref, 768);
      },
      { wrapper: Wrapper }
    );

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(result.current).toBe("double");
  });

  it("opens in the mode a laid-out width calls for before it is observed", () => {
    const element = document.createElement("div");
    vi.spyOn(element, "clientWidth", "get").mockReturnValue(1024);

    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(element);

        return useViewMode(ref, 768);
      },
      { wrapper: Wrapper }
    );

    expect(result.current).toBe("double");
  });

  it("switches to single when container width falls below the threshold", () => {
    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));

        return useViewMode(ref, 768);
      },
      { wrapper: Wrapper }
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
      { wrapper: Wrapper }
    );

    act(() => {
      MockResizeObserver.trigger(768);
    });

    expect(result.current).toBe("double");
  });

  it("keeps a mode set through the context across a resize that stays wide", () => {
    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));
        const { setViewMode } = useViewerContext();

        return { setViewMode, viewMode: useViewMode(ref, 768) };
      },
      { wrapper: Wrapper }
    );

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    act(() => {
      result.current.setViewMode("single");
    });

    // The threshold is not crossed here, so the reader's own choice stands.
    act(() => {
      MockResizeObserver.trigger(1280);
    });

    expect(result.current.viewMode).toBe("single");
  });

  it("reports whether the container is wide enough for a spread", () => {
    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));
        useViewMode(ref, 768);

        return useViewerContext().isDoublePageAvailable;
      },
      { wrapper: Wrapper }
    );

    act(() => {
      MockResizeObserver.trigger(600);
    });

    expect(result.current).toBeFalsy();

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(result.current).toBeTruthy();
  });

  it("shows a controlled double-page mode as single pages while a spread does not fit", () => {
    const onViewModeChange = vi.fn<(mode: ViewMode) => void>();

    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));
        const viewMode = useViewMode(ref, 768);

        return {
          isDoublePageAvailable: useViewerContext().isDoublePageAvailable,
          viewMode,
        };
      },
      {
        wrapper: ({ children }) => (
          <ViewerProvider
            onViewModeChange={onViewModeChange}
            pages={pages}
            viewMode="double"
          >
            {children}
          </ViewerProvider>
        ),
      }
    );

    act(() => {
      MockResizeObserver.trigger(600);
    });

    expect(result.current).toStrictEqual({
      isDoublePageAvailable: false,
      viewMode: "single",
    });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(result.current.viewMode).toBe("double");
    expect(onViewModeChange).not.toHaveBeenCalled();
  });

  it("keeps a controlled single-page mode when the container widens", () => {
    const onViewModeChange = vi.fn<(mode: ViewMode) => void>();

    const { result } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));

        return useViewMode(ref, 768);
      },
      {
        wrapper: ({ children }) => (
          <ViewerProvider
            onViewModeChange={onViewModeChange}
            pages={pages}
            viewMode="single"
          >
            {children}
          </ViewerProvider>
        ),
      }
    );

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(result.current).toBe("single");
    expect(onViewModeChange).not.toHaveBeenCalled();
  });

  it("disconnects ResizeObserver on unmount", () => {
    const { unmount } = renderHook(
      () => {
        const ref = useRef<HTMLDivElement>(document.createElement("div"));

        return useViewMode(ref);
      },
      { wrapper: Wrapper }
    );

    const [observer] = MockResizeObserver.observers.values();

    unmount();

    expect(observer?.disconnect).toHaveBeenCalledOnce();
  });
});
