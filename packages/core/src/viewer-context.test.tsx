import { act, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

// The third page is a whole two-page spread delivered as one landscape image.
const spreadPages: ViewerPage[] = pages.map((page, index) =>
  index === 2 ? { ...page, layout: "spread" } : page
);

const makeWrapper = (props?: Partial<ViewerProviderProps>) =>
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ViewerProvider pages={pages} {...props}>
        {children}
      </ViewerProvider>
    );
  };

/** Steps forward and reports where the reading position landed. */
const NextPageTrigger = () => {
  const { currentIndex, goToNext } = useViewerContext();

  return (
    <button onClick={goToNext} type="button">
      {currentIndex}
    </button>
  );
};

/** A double-page reader over a page list that a rerender can replace. */
const renderWithPages = (currentPages: (ViewerPage | undefined)[]) => (
  <ViewerProvider initialViewMode="double" pages={currentPages}>
    <NextPageTrigger />
  </ViewerProvider>
);

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

  it("initializes and changes the page fit mode", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialPageFitMode: "actual" }),
    });

    expect(result.current.pageFitMode).toBe("actual");

    act(() => {
      result.current.setPageFitMode("width");
    });

    expect(result.current.pageFitMode).toBe("width");
  });

  it("rests the zoom scale at 1 and keeps it there through resetZoom", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.zoomScale).toBe(1);

    act(() => {
      result.current.resetZoom();
    });

    expect(result.current.zoomScale).toBe(1);
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

  it("does not split the final double-page spread", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ViewerProvider
          initialIndex={1}
          initialViewMode="double"
          pages={pages.slice(0, 3)}
        >
          {children}
        </ViewerProvider>
      ),
    });

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(1);
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

  it("supports controlled navigation and reports only index changes", () => {
    const onIndexChange = vi.fn<(index: number) => void>();
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ currentIndex: 2, onIndexChange }),
    });

    expect(result.current.currentIndex).toBe(2);

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(2);
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(3);

    act(() => {
      result.current.goTo(2);
    });

    expect(onIndexChange).toHaveBeenCalledOnce();
  });

  it("updates the controlled index from the latest prop", () => {
    const { rerender } = render(
      <ViewerProvider pages={pages} currentIndex={1}>
        <CurrentIndexOutput />
      </ViewerProvider>
    );

    expect(screen.getByTestId("current-index")).toHaveTextContent("1");

    rerender(
      <ViewerProvider pages={pages} currentIndex={4}>
        <CurrentIndexOutput />
      </ViewerProvider>
    );

    expect(screen.getByTestId("current-index")).toHaveTextContent("4");
  });

  it("reports uncontrolled programmatic navigation without duplicate callbacks", () => {
    const onIndexChange = vi.fn<(index: number) => void>();
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ onIndexChange }),
    });

    act(() => {
      result.current.goTo(3);
    });

    expect(result.current.currentIndex).toBe(3);
    expect(onIndexChange).toHaveBeenCalledExactlyOnceWith(3);

    act(() => {
      result.current.goTo(3);
    });

    expect(onIndexChange).toHaveBeenCalledOnce();
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

  it("turns through a spread page as one step in double mode", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialViewMode: "double", pages: spreadPages }),
    });

    // The pages before the spread still pair with each other.
    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(2);

    // The spread fills a page set on its own, so one step leaves it whole.
    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(3);

    act(() => {
      result.current.goToPrev();
    });

    expect(result.current.currentIndex).toBe(2);

    act(() => {
      result.current.goToPrev();
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it("turns through a spread page as one step in single mode", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({ initialIndex: 2, pages: spreadPages }),
    });

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(3);

    act(() => {
      result.current.goToPrev();
    });

    expect(result.current.currentIndex).toBe(2);
  });

  it("leaves the page before a spread unpaired", () => {
    const { result } = renderHook(() => useViewerContext(), {
      wrapper: makeWrapper({
        initialViewMode: "double",
        pages: spreadPages,
        spreadStartIndex: 1,
      }),
    });

    // Counted from page 2, the page facing the spread would be page 3, which
    // the spread takes for itself, so page 2 is turned through on its own.
    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(1);

    act(() => {
      result.current.goToNext();
    });

    expect(result.current.currentIndex).toBe(2);
  });

  it("regroups the pages once a lazily resolved page turns out to be a spread", () => {
    const unresolvedPages: (ViewerPage | undefined)[] = pages.map(
      (page, index) => (index === 2 ? undefined : page)
    );
    const { rerender } = render(renderWithPages(unresolvedPages));
    const goToNext = screen.getByRole("button");

    act(() => {
      goToNext.click();
    });

    expect(goToNext).toHaveTextContent("2");

    rerender(renderWithPages(spreadPages));

    act(() => {
      goToNext.click();
    });

    // The resolved page is a spread, so the step that would have paired it
    // with the page after it now leaves it whole.
    expect(goToNext).toHaveTextContent("3");
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
