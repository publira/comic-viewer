import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ViewerProvider, useViewerContext } from "./viewer-context";
import type { ViewerPage, ViewerProviderProps } from "./viewer-context";

const pages: ViewerPage[] = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
  { id: "p3", src: "page3.png", title: "Page 3" },
  { id: "p4", src: "page4.png", title: "Page 4" },
  { id: "p5", src: "page5.png", title: "Page 5" },
];

const makeWrapper = (props?: Partial<ViewerProviderProps>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ViewerProvider pages={pages} {...props}>
        {children}
      </ViewerProvider>
    );
  };

describe("ViewerProvider / useViewerContext", () => {
  it("initializes with correct default state", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.viewMode).toBe("single");
    expect(result.current.readingDirection).toBe("rtl");
    expect(result.current.pages).toBe(pages);
  });

  it("clamps initialIndex to the valid range", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialIndex: 100 }),
    });

    expect(result.current.currentIndex).toBe(4);
  });

  it("clamps a negative initialIndex to 0", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialIndex: -1 }),
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it("goToNext advances to the next page", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it("goToPrev goes back to the previous page", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialIndex: 2 }),
    });

    act(() => {
      result.current.goToPrev();
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it("goToNext does not advance past the last page", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialIndex: 4 }),
    });

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(4);
  });

  it("goToPrev does not go before the first page", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialIndex: 0 }),
    });

    act(() => {
      result.current.goToPrev();
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it("goTo navigates to an arbitrary page", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.goTo(3);
    });

    expect(result.current.currentIndex).toBe(3);
  });

  it("goToNext advances by 2 pages in double mode", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialViewMode: "double" }),
    });

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(2);
  });

  it("goToPrev goes back 2 pages in double mode", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialIndex: 4, initialViewMode: "double" }),
    });

    act(() => {
      result.current.goToPrev();
    });

    expect(result.current.currentIndex).toBe(2);
  });

  it("setViewMode changes the view mode", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setViewMode("double");
    });

    expect(result.current.viewMode).toBe("double");
  });

  it("setReadingDirection changes the reading direction", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setReadingDirection("ltr");
    });

    expect(result.current.readingDirection).toBe("ltr");
  });

  it("throws when called outside of ViewerProvider", () => {
    expect(() => {
      renderHook(() => useViewerContext());
    }).toThrow("useViewerContext must be used within a ViewerProvider");
  });
});
