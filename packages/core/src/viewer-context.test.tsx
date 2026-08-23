import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { definePlugin } from "./plugin";
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

const CurrentIndexOutput = () => {
  const { currentIndex } = useViewerContext();
  return <output data-testid="current-index">{currentIndex}</output>;
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
    expect(result.current.plugins).toStrictEqual([]);
  });

  it("registers plugins in the viewer context", () => {
    const plugin = definePlugin({ name: "analytics" });
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ plugins: [plugin] }),
    });

    expect(result.current.plugins).toStrictEqual([plugin]);
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

  it.each([
    ["a fractional value", 1.5, 1],
    ["NaN", Number.NaN, 0],
    ["positive infinity", Number.POSITIVE_INFINITY, 0],
    ["negative infinity", Number.NEGATIVE_INFINITY, 0],
  ])(
    "normalizes %s passed as initialIndex",
    (_description, initialIndex, expectedIndex) => {
      const { result } = renderHook(() => useViewerContext(), {
        wrapper: makeWrapper({ initialIndex }),
      });

      expect(result.current.currentIndex).toBe(expectedIndex);
    }
  );

  it("clamps the current index when the pages list shrinks", () => {
    const { rerender } = render(
      <ViewerProvider pages={pages} initialIndex={3}>
        <CurrentIndexOutput />
      </ViewerProvider>
    );

    expect(screen.getByTestId("current-index")).toHaveTextContent("3");

    rerender(
      <ViewerProvider pages={pages.slice(0, 1)} initialIndex={3}>
        <CurrentIndexOutput />
      </ViewerProvider>
    );

    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
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

  it.each([
    ["a fractional value", 2.9, 2],
    ["NaN", Number.NaN, 0],
    ["positive infinity", Number.POSITIVE_INFINITY, 0],
    ["negative infinity", Number.NEGATIVE_INFINITY, 0],
  ])("normalizes %s passed to goTo", (_description, index, expectedIndex) => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.goTo(index);
    });

    expect(result.current.currentIndex).toBe(expectedIndex);
  });

  it("navigates pre-spread pages individually in double mode", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialViewMode: "double", spreadStartIndex: 1 }),
    });

    expect(result.current.spreadStartIndex).toBe(1);

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(1);

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(3);

    act(() => {
      result.current.goToPrev();
    });

    expect(result.current.currentIndex).toBe(1);
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
