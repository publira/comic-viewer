import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PageNavigation } from "./page-navigation";
import { definePlugin } from "./plugin";
import type { ViewerPlugin } from "./plugin";
import type { ReadingDirection } from "./viewer-context";
import { ViewerProvider, useViewerContext } from "./viewer-context";
import {
  getPageTurnDirection,
  getImageMimeType,
  PageCanvas,
  Viewport,
  ViewportPage,
  ViewportPageSet,
  ViewportPageSlot,
  ViewportTrack,
} from "./viewport";

type MockFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<unknown>;

// eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
class MockResizeObserver {
  static callback: ResizeObserverCallback | null = null;

  // eslint-disable-next-line promise/prefer-await-to-callbacks
  constructor(callback: ResizeObserverCallback) {
    MockResizeObserver.callback = callback;
  }

  observe = vi.fn<() => void>();
  disconnect = vi.fn<() => void>();
  unobserve = vi.fn<() => void>();

  static trigger(width: number) {
    MockResizeObserver.callback?.(
      [
        {
          contentRect: { width } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      null as any
    );
  }
}

const pages = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
  { id: "p3", src: "page3.png", title: "Page 3" },
  { id: "p4", src: "page4.png", title: "Page 4" },
];

type TestPage = (typeof pages)[number];

const setViewportRect = (viewport: Element, width = 100) => {
  vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({
    bottom: 100,
    height: 100,
    left: 0,
    right: width,
    toJSON: () => ({}),
    top: 0,
    width,
    x: 0,
    y: 0,
  } as DOMRect);
};

const CurrentIndexIndicator = () => {
  const { currentIndex } = useViewerContext();
  return <div data-testid="current-index">{currentIndex}</div>;
};

const GoToIndexButton = ({ index }: { index: number }) => {
  const { goTo } = useViewerContext();
  return (
    <button onClick={() => goTo(index)} type="button">
      Go to index
    </button>
  );
};

const RerenderingViewport = () => {
  const [renderCount, setRenderCount] = useState(0);

  return (
    <>
      <button
        onClick={() => setRenderCount((count) => count + 1)}
        type="button"
      >
        Rerender {renderCount}
      </button>
      <Viewport>
        <ViewportPage>
          <PageCanvas />
        </ViewportPage>
      </Viewport>
    </>
  );
};

const renderViewport = ({
  initialIndex = 0,
  initialReadingDirection = "rtl" as ReadingDirection,
  plugins = [] as readonly ViewerPlugin[],
  spreadStartIndex = 0,
  threshold = 768,
} = {}) =>
  render(
    <ViewerProvider
      pages={pages}
      initialIndex={initialIndex}
      initialReadingDirection={initialReadingDirection}
      plugins={plugins}
      spreadStartIndex={spreadStartIndex}
    >
      <Viewport<TestPage>
        renderPage={(page) => <div data-testid={page.id}>{page.title}</div>}
        doublePageThreshold={threshold}
      />
      <CurrentIndexIndicator />
    </ViewerProvider>
  );

describe(Viewport, () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.callback = null;
  });

  it("renders public page templates without private selectors", () => {
    render(
      <ViewerProvider pages={pages}>
        <Viewport>
          <ViewportPage className="reader-page">
            <PageCanvas className="reader-canvas" data-testid="page-canvas" />
          </ViewportPage>
        </Viewport>
      </ViewerProvider>
    );

    expect(screen.getByTestId("page-canvas")).toHaveAttribute(
      "aria-label",
      "Page 1"
    );
    expect(screen.getByTestId("page-canvas")).toHaveClass("reader-canvas");
    expect(document.querySelector(".reader-page")).not.toBeNull();
  });

  it("renders a custom page rail with public layout components", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <Viewport>
          <ViewportTrack className="reader-rail">
            <ViewportPageSet className="reader-page-set">
              <ViewportPageSlot className="reader-page-slot">
                <ViewportPage />
              </ViewportPageSlot>
            </ViewportPageSet>
          </ViewportTrack>
        </Viewport>
      </ViewerProvider>
    );
    const track = container.querySelector(".pcv-viewport-track");
    const currentPageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (track === null || currentPageSet === null) {
      throw new Error("The viewport rail was not rendered.");
    }

    expect(track).toHaveClass("reader-rail");
    expect(currentPageSet).toHaveClass("reader-page-set");
    expect(currentPageSet.firstElementChild).toHaveClass("reader-page-slot");
  });

  it("passes double-page alignment state to public layout components", () => {
    const { container } = render(
      <ViewerProvider pages={pages.slice(0, 1)} initialViewMode="double">
        <Viewport>
          <ViewportTrack>
            <ViewportPageSet>
              <ViewportPageSlot>
                <ViewportPage />
              </ViewportPageSlot>
            </ViewportPageSet>
          </ViewportTrack>
        </Viewport>
      </ViewerProvider>
    );
    const currentPageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (currentPageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    expect(currentPageSet).toHaveAttribute("data-page-count", "1");
    expect(currentPageSet).toHaveAttribute("data-reading-direction", "rtl");
    expect(currentPageSet).toHaveAttribute("data-view-mode", "double");
    expect(currentPageSet.firstElementChild).toHaveAttribute(
      "data-view-mode",
      "double"
    );
  });

  it("passes LTR reading direction to public page-set components", () => {
    const { container } = render(
      <ViewerProvider
        pages={pages.slice(0, 1)}
        initialReadingDirection="ltr"
        initialViewMode="double"
      >
        <Viewport>
          <ViewportTrack>
            <ViewportPageSet>
              <ViewportPageSlot>
                <ViewportPage />
              </ViewportPageSlot>
            </ViewportPageSet>
          </ViewportTrack>
        </Viewport>
      </ViewerProvider>
    );
    const currentPageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (currentPageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    expect(currentPageSet).toHaveAttribute("data-reading-direction", "ltr");
  });

  it("uses the default page when a custom page slot is empty", () => {
    const { container } = render(
      <ViewerProvider pages={pages.slice(0, 1)}>
        <Viewport>
          <ViewportTrack>
            <ViewportPageSet>
              <ViewportPageSlot />
            </ViewportPageSet>
          </ViewportTrack>
        </Viewport>
      </ViewerProvider>
    );

    expect(container.querySelectorAll(".pcv-viewport-track")).toHaveLength(1);
    expect(container.querySelectorAll(".pcv-page")).toHaveLength(1);
  });

  it("does not reload images when an equivalent page template rerenders", async () => {
    const image = {
      close: vi.fn<() => void>(),
      height: 1,
      width: 1,
    } as unknown as ImageBitmap;
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn<() => void>(),
      } as unknown as CanvasRenderingContext2D);
    const fetchMock = vi.fn<MockFetch>().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
      ok: true,
    });
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn<() => Promise<unknown>>().mockResolvedValue(image)
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      render(
        <ViewerProvider pages={pages} initialViewMode="single">
          <RerenderingViewport />
        </ViewerProvider>
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });

      fireEvent.click(screen.getByRole("button", { name: "Rerender 0" }));
      await act(async () => {
        await Promise.resolve();
      });

      expect(fetchMock).toHaveBeenCalledTimes(3);
    } finally {
      getContext.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("renders normal pages to canvas instead of an img element", async () => {
    const image = {
      close: vi.fn<() => void>(),
      height: 1,
      width: 1,
    } as unknown as ImageBitmap;
    const drawImage = vi.fn<() => void>();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage,
      } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn<() => Promise<unknown>>().mockResolvedValue(image)
    );
    vi.stubGlobal(
      "fetch",
      vi.fn<MockFetch>().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
        ok: true,
      })
    );
    try {
      const { container } = render(
        <ViewerProvider pages={pages}>
          <Viewport />
        </ViewerProvider>
      );

      expect(container.querySelector("canvas")).not.toBeNull();
      expect(screen.queryByRole("status")).toBeNull();

      await waitFor(() => {
        expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 1, 1);
      });

      expect(container.querySelector("img")).toBeNull();
    } finally {
      getContext.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("draws the supplied placeholder before fetching the full page", async () => {
    const image = {
      close: vi.fn<() => void>(),
      height: 1,
      width: 1,
    } as unknown as ImageBitmap;
    const drawImage = vi.fn<() => void>();
    const filters: string[] = [];
    const context = { drawImage } as unknown as CanvasRenderingContext2D;
    Object.defineProperty(context, "filter", {
      get: () => filters.at(-1) ?? "none",
      set: (filter: string) => {
        filters.push(filter);
      },
    });
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(context);
    const fetchMock = vi.fn<MockFetch>().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
      ok: true,
    });
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn<() => Promise<unknown>>().mockResolvedValue(image)
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      render(
        <ViewerProvider
          pages={[
            {
              height: 1000,
              id: "preview-page",
              placeholder: "preview.jpg",
              src: "full-page.jpg",
              title: "Preview page",
              width: 800,
            },
          ]}
        >
          <Viewport />
        </ViewerProvider>
      );

      await waitFor(() => {
        expect(fetchMock.mock.calls.map(([url]) => url)).toStrictEqual(
          expect.arrayContaining(["preview.jpg", "full-page.jpg"])
        );
        expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 800, 1000);
        expect(filters).toContain("blur(16px)");
      });
    } finally {
      getContext.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("preloads the adjacent page in the rail", async () => {
    const image = {
      close: vi.fn<() => void>(),
      height: 1,
      width: 1,
    } as unknown as ImageBitmap;
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn<() => void>(),
      } as unknown as CanvasRenderingContext2D);
    const fetchMock = vi.fn<MockFetch>().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
      ok: true,
    });
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn<() => Promise<unknown>>().mockResolvedValue(image)
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      render(
        <ViewerProvider pages={pages} initialViewMode="single">
          <Viewport />
        </ViewerProvider>
      );

      await waitFor(() => {
        expect(fetchMock.mock.calls.map(([url]) => url)).toStrictEqual(
          expect.arrayContaining(["page1.png", "page2.png"])
        );
      });
    } finally {
      getContext.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("renders decoded neighbouring pages during back-and-forth navigation", async () => {
    const bitmaps: {
      closed: boolean;
      close: () => void;
      height: number;
      width: number;
    }[] = [];
    const drawImage = vi.fn<(image: unknown) => void>((image: unknown) => {
      if ((image as { closed: boolean }).closed) {
        throw new Error("A released bitmap was redrawn");
      }
    });
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const createImageBitmapMock = vi.fn<() => Promise<ImageBitmap>>(() => {
      const bitmap = {
        close: () => {
          bitmap.closed = true;
        },
        closed: false,
        height: 1,
        width: 1,
      };
      bitmaps.push(bitmap);
      return Promise.resolve(bitmap as unknown as ImageBitmap);
    });
    vi.stubGlobal("createImageBitmap", createImageBitmapMock);
    vi.stubGlobal(
      "fetch",
      vi.fn<MockFetch>().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
        ok: true,
      })
    );

    try {
      render(
        <ViewerProvider pages={pages} initialReadingDirection="ltr">
          <Viewport />
        </ViewerProvider>
      );

      await waitFor(() => {
        expect(createImageBitmapMock).toHaveBeenCalledTimes(2);
      });

      fireEvent.keyDown(window, { key: "ArrowRight" });

      await waitFor(() => {
        expect(screen.getByLabelText("Page 2")).not.toHaveAttribute(
          "aria-busy"
        );
      });

      fireEvent.keyDown(window, { key: "ArrowLeft" });

      await waitFor(() => {
        expect(screen.getByLabelText("Page 1")).not.toHaveAttribute(
          "aria-busy"
        );
      });
    } finally {
      getContext.mockRestore();
      vi.unstubAllGlobals();
    }
  });

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

  it("runs onPageChange plugins for the initial and navigated pages", async () => {
    const onPageChange = vi.fn<(index: number, total: number) => void>();
    renderViewport({ plugins: [definePlugin({ onPageChange })] });

    await waitFor(() => {
      expect(onPageChange).toHaveBeenLastCalledWith(0, 4);
    });

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    await waitFor(() => {
      expect(onPageChange).toHaveBeenLastCalledWith(1, 4);
    });
  });

  it("waits for the incoming page image before starting a slide", async () => {
    const image = {
      close: vi.fn<() => void>(),
      height: 1,
      width: 1,
    } as unknown as ImageBitmap;
    // eslint-disable-next-line promise/avoid-new -- The unresolved promise models an in-flight image request.
    const pendingResponse = new Promise<unknown>(() => {});
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn<() => Promise<unknown>>().mockResolvedValue(image)
    );
    vi.stubGlobal(
      "fetch",
      vi.fn<MockFetch>((url) =>
        url === "page1.png"
          ? Promise.resolve({
              arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
              ok: true,
            })
          : pendingResponse
      )
    );
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn<() => void>(),
      } as unknown as CanvasRenderingContext2D);

    try {
      const { container } = render(
        <ViewerProvider pages={pages} initialReadingDirection="ltr">
          <Viewport />
        </ViewerProvider>
      );
      const viewport = container.querySelector(".pcv-viewport");

      expect(viewport).not.toBeNull();
      if (viewport === null) {
        return;
      }

      await waitFor(() => {
        expect(screen.getByLabelText("Page 1")).not.toHaveAttribute(
          "aria-busy"
        );
      });

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(viewport).toHaveAttribute("data-transition-state", "waiting");
      expect(screen.getByLabelText("Page 2")).toHaveAttribute(
        "aria-busy",
        "true"
      );
    } finally {
      getContext.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("does not remain waiting when the incoming page image fails", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn<MockFetch>().mockRejectedValue(new Error("Image unavailable"))
    );

    try {
      const { container } = render(
        <ViewerProvider pages={pages} initialReadingDirection="ltr">
          <Viewport />
        </ViewerProvider>
      );
      const viewport = container.querySelector(".pcv-viewport");

      if (viewport === null) {
        throw new Error("The viewport was not rendered.");
      }

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(viewport).toHaveAttribute("data-transition-state", "waiting");

      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(viewport).not.toHaveAttribute("data-transition-state", "waiting");
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it("renders four pcv-page elements while double-page spreads slide", async () => {
    const image = {
      close: vi.fn<() => void>(),
      height: 1,
      width: 1,
    } as unknown as ImageBitmap;
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        drawImage: vi.fn<() => void>(),
      } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn<() => Promise<unknown>>().mockResolvedValue(image)
    );
    vi.stubGlobal(
      "fetch",
      vi.fn<MockFetch>().mockResolvedValue({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
        ok: true,
      })
    );

    try {
      const { container } = render(
        <ViewerProvider pages={pages} initialReadingDirection="ltr">
          <Viewport />
        </ViewerProvider>
      );

      act(() => {
        MockResizeObserver.trigger(1024);
      });
      await waitFor(() => {
        expect(container.querySelectorAll("canvas")).toHaveLength(4);
      });

      fireEvent.keyDown(window, { key: "ArrowRight" });

      await waitFor(() => {
        expect(
          container.querySelectorAll(
            '[data-rail-slot="current"] .pcv-page, [data-rail-slot="next"] .pcv-page'
          )
        ).toHaveLength(4);
        expect(
          container.querySelector('[data-rail-slot="current"]')
        ).toHaveAttribute("data-page-count", "2");
      });
    } finally {
      getContext.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("maps forward and backward turns to opposite physical directions", () => {
    expect(getPageTurnDirection(0, 1, "ltr")).toBe("left");
    expect(getPageTurnDirection(1, 0, "ltr")).toBe("right");
    expect(getPageTurnDirection(0, 1, "rtl")).toBe("right");
    expect(getPageTurnDirection(1, 0, "rtl")).toBe("left");
  });

  it("skips the slide when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    try {
      const { container } = render(
        <ViewerProvider pages={pages} initialReadingDirection="ltr">
          <Viewport />
        </ViewerProvider>
      );
      const viewport = container.querySelector(".pcv-viewport");

      expect(viewport).not.toBeNull();
      if (viewport === null) {
        return;
      }

      fireEvent.keyDown(window, { key: "ArrowRight" });

      expect(viewport).toHaveAttribute("data-transition-state", "idle");
      expect(viewport).not.toHaveAttribute("data-slide-direction");
      expect(
        viewport.querySelector('[data-rail-slot="current"]')
      ).toContainElement(screen.getByLabelText("Page 2"));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("renders only the current page in single mode", () => {
    renderViewport();

    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.queryByTestId("p2")).not.toBeInTheDocument();
  });

  it("keeps a page visible after navigating to a fractional index", () => {
    render(
      <ViewerProvider pages={pages}>
        <Viewport<TestPage>
          renderPage={(page) => <div data-testid={page.id}>{page.title}</div>}
        />
        <GoToIndexButton index={1.5} />
      </ViewerProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to index" }));

    expect(screen.getByTestId("p2")).toBeInTheDocument();
  });

  it("renders pre-spread pages individually in double mode", () => {
    renderViewport({ initialIndex: 0, spreadStartIndex: 1 });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.queryByTestId("p2")).not.toBeInTheDocument();
  });

  it("starts odd-indexed spreads in RTL order", () => {
    renderViewport({ initialIndex: 1, spreadStartIndex: 1 });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    const items = screen.getAllByTestId(/^p/u);
    expect(items[0]).toHaveAttribute("data-testid", "p3");
    expect(items[1]).toHaveAttribute("data-testid", "p2");
  });

  it("starts even-indexed spreads in LTR order", () => {
    renderViewport({
      initialIndex: 2,
      initialReadingDirection: "ltr",
      spreadStartIndex: 2,
    });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    const items = screen.getAllByTestId(/^p/u);
    expect(items[0]).toHaveAttribute("data-testid", "p3");
    expect(items[1]).toHaveAttribute("data-testid", "p4");
  });

  it("renders 2 pages in double mode (RTL)", () => {
    renderViewport({ initialIndex: 0 });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    // RTL: index 1 on the left, index 0 on the right
    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.getByTestId("p2")).toBeInTheDocument();
    expect(screen.queryByTestId("p3")).not.toBeInTheDocument();
  });

  it("renders 2 pages in double mode (LTR)", () => {
    renderViewport({ initialIndex: 0, initialReadingDirection: "ltr" });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.getByTestId("p2")).toBeInTheDocument();
  });

  it("renders the next page first (on the left) in RTL double mode", () => {
    renderViewport({ initialIndex: 0, initialReadingDirection: "rtl" });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    const items = screen.getAllByTestId(/^p/u);
    // RTL order: [p2, p1]
    expect(items[0]).toHaveAttribute("data-testid", "p2");
    expect(items[1]).toHaveAttribute("data-testid", "p1");
  });

  it("renders the current page first (on the left) in LTR double mode", () => {
    renderViewport({ initialIndex: 0, initialReadingDirection: "ltr" });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    const items = screen.getAllByTestId(/^p/u);
    // LTR order: [p1, p2]
    expect(items[0]).toHaveAttribute("data-testid", "p1");
    expect(items[1]).toHaveAttribute("data-testid", "p2");
  });

  it("renders only 1 page on the last page in double mode when no next page exists", () => {
    // pages[3] = p4 is the last page
    renderViewport({ initialIndex: 3 });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    expect(screen.getByTestId("p4")).toBeInTheDocument();
    expect(screen.queryByTestId("p5")).not.toBeInTheDocument();
  });

  it("sets viewport data attributes for RTL odd-last-page in double mode", () => {
    const { container } = renderViewport({
      initialIndex: 3,
      initialReadingDirection: "rtl",
    });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    expect(viewport).toHaveAttribute("data-view-mode", "double");
    expect(viewport).toHaveAttribute("data-page-count", "1");
    expect(viewport).toHaveAttribute("data-reading-direction", "rtl");
  });

  it("sets viewport data attributes for LTR odd-last-page in double mode", () => {
    const { container } = renderViewport({
      initialIndex: 3,
      initialReadingDirection: "ltr",
    });

    act(() => {
      MockResizeObserver.trigger(1024);
    });

    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    expect(viewport).toHaveAttribute("data-view-mode", "double");
    expect(viewport).toHaveAttribute("data-page-count", "1");
    expect(viewport).toHaveAttribute("data-reading-direction", "ltr");
  });

  it("applies the pcv-viewport class", () => {
    const { container } = renderViewport();

    expect(container.querySelector(".pcv-viewport")).not.toBeNull();
  });

  it("appends a custom className to the viewport element", () => {
    const { container } = render(
      <ViewerProvider pages={pages}>
        <Viewport<TestPage>
          renderPage={(page) => <div>{page.title}</div>}
          className="custom-class"
        />
      </ViewerProvider>
    );

    expect(container.querySelector(".custom-class")).not.toBeNull();
    expect(container.querySelector(".pcv-viewport")).not.toBeNull();
  });

  it("updates rendered pages when mode switches single → double → single", () => {
    renderViewport({ initialIndex: 0 });

    // single mode
    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.queryByTestId("p2")).not.toBeInTheDocument();

    // double mode
    act(() => {
      MockResizeObserver.trigger(1024);
    });
    expect(screen.getByTestId("p2")).toBeInTheDocument();

    // back to single
    act(() => {
      MockResizeObserver.trigger(400);
    });
    expect(screen.queryByTestId("p2")).not.toBeInTheDocument();
  });

  it("handles ArrowLeft and ArrowRight in LTR", () => {
    renderViewport({ initialIndex: 1, initialReadingDirection: "ltr" });

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("current-index")).toHaveTextContent("2");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("handles ArrowLeft and ArrowRight in RTL", () => {
    renderViewport({ initialIndex: 1, initialReadingDirection: "rtl" });

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("does not navigate from editable or interactive descendants", () => {
    render(
      <ViewerProvider pages={pages} initialIndex={1}>
        <Viewport<TestPage>
          renderPage={() => (
            <>
              <input aria-label="Title" />
              <textarea aria-label="Description" />
              <select aria-label="Page size">
                <option>One page</option>
              </select>
              <div aria-label="Notes" contentEditable />
              <button type="button">Open menu</button>
            </>
          )}
        />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );

    for (const control of [
      screen.getByRole("textbox", { name: "Title" }),
      screen.getByRole("textbox", { name: "Description" }),
      screen.getByRole("combobox", { name: "Page size" }),
      screen.getByLabelText("Notes"),
      screen.getByRole("button", { name: "Open menu" }),
    ]) {
      expect(fireEvent.keyDown(control, { key: "ArrowRight" })).toBeTruthy();
      expect(screen.getByTestId("current-index")).toHaveTextContent("1");
    }
  });

  it("navigates and prevents browser scrolling when the viewport is focused", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "ltr",
    });
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");

    expect(viewport).not.toBeNull();
    if (viewport === null) {
      return;
    }

    viewport.focus();
    expect(fireEvent.keyDown(viewport, { key: "ArrowRight" })).toBeFalsy();
    expect(screen.getByTestId("current-index")).toHaveTextContent("2");
  });

  it("navigates by edge click in LTR", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "ltr",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 95 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("2");

    fireEvent.click(viewport, { clientX: 5 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("navigates by edge click in RTL", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "rtl",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 5 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("2");

    fireEvent.click(viewport, { clientX: 95 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("navigates by swipe in LTR", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "ltr",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("2");

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("navigates by swipe in RTL", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "rtl",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("0");

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("does not turn page on short swipe", () => {
    const { container } = renderViewport({
      initialIndex: 1,
      initialReadingDirection: "ltr",
    });
    const viewport = container.querySelector(".pcv-viewport");

    expect(viewport).not.toBeNull();

    if (viewport === null) {
      return;
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 170 }],
    });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("pans an actual-size page with a pointer and keeps it within its bounds", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialPageFitMode="actual">
        <Viewport />
      </ViewerProvider>
    );
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");
    const pageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (viewport === null || pageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      clientWidth: { configurable: true, value: 100 },
    });
    Object.defineProperties(pageSet, {
      scrollHeight: { configurable: true, value: 400 },
      scrollWidth: { configurable: true, value: 300 },
    });

    fireEvent.pointerDown(viewport, {
      button: 0,
      clientX: 100,
      clientY: 100,
      isPrimary: true,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerMove(viewport, {
      clientX: -100,
      clientY: -300,
      pointerId: 1,
    });

    expect(viewport).toHaveAttribute("data-panning", "true");
    expect(pageSet).toHaveStyle("--pcv-pan-x: -100px");
    expect(pageSet).toHaveStyle("--pcv-pan-y: -150px");

    fireEvent.pointerUp(viewport, { pointerId: 1 });
    expect(viewport).not.toHaveAttribute("data-panning");
  });

  it("pans instead of turning pages on a touch gesture in a zoomed mode", () => {
    const { container } = render(
      <ViewerProvider
        pages={pages}
        initialIndex={1}
        initialPageFitMode="actual"
      >
        <Viewport />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");
    const pageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (viewport === null || pageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      clientWidth: { configurable: true, value: 100 },
    });
    Object.defineProperties(pageSet, {
      scrollHeight: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 300 },
    });

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200, clientY: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 100, clientY: 120 }],
    });
    fireEvent.touchEnd(viewport);

    expect(pageSet).toHaveStyle("--pcv-pan-x: -100px");
    expect(pageSet).toHaveStyle("--pcv-pan-y: -80px");
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");
  });

  it("zooms and pans with two touches without turning the page", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialIndex={1}>
        <Viewport />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");
    const pageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (viewport === null || pageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 100 },
      clientWidth: { configurable: true, value: 100 },
    });
    Object.defineProperties(pageSet, {
      scrollHeight: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, value: 100 },
    });

    fireEvent.touchStart(viewport, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 100 },
      ],
    });
    fireEvent.touchMove(viewport, {
      touches: [
        { clientX: 70, clientY: 100 },
        { clientX: 270, clientY: 100 },
      ],
    });

    expect(viewport).toHaveAttribute("data-panning", "true");
    expect(pageSet).toHaveStyle("--pcv-zoom-scale: 2");
    expect(pageSet).toHaveStyle("--pcv-pan-x: 20px");
    expect(screen.getByTestId("current-index")).toHaveTextContent("1");

    fireEvent.touchEnd(viewport, {
      changedTouches: [{ clientX: 70, clientY: 100 }],
      touches: [{ clientX: 270, clientY: 100 }],
    });
    expect(viewport).not.toHaveAttribute("data-panning");
  });

  it("returns to fit-to-width on a single-finger double tap", () => {
    const { container } = render(
      <ViewerProvider
        pages={pages}
        initialIndex={1}
        initialPageFitMode="actual"
      >
        <Viewport />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector<HTMLDivElement>(".pcv-viewport");
    const pageSet = container.querySelector<HTMLDivElement>(
      '.pcv-viewport-page-set[data-rail-slot="current"]'
    );

    if (viewport === null || pageSet === null) {
      throw new Error("The current page set was not rendered.");
    }

    const tap = () => {
      fireEvent.touchStart(viewport, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchEnd(viewport, {
        changedTouches: [{ clientX: 100, clientY: 100 }],
        touches: [],
      });
    };

    tap();
    tap();

    expect(viewport).toHaveAttribute("data-page-fit-mode", "width");
    expect(pageSet).toHaveStyle("--pcv-zoom-scale: 1");

    setViewportRect(viewport);
    fireEvent.click(viewport, { clientX: 95 });
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
  });

  it("moves the page rail while a touch swipe is in progress", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <Viewport />
      </ViewerProvider>
    );
    const viewport = container.querySelector(".pcv-viewport");
    const track = container.querySelector(".pcv-viewport-track");

    if (viewport === null || track === null) {
      throw new Error("The default viewport rail was not rendered.");
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 120 }],
    });

    expect(viewport).toHaveAttribute("data-dragging", "true");
    expect(track).toHaveStyle("--pcv-drag-offset: -80px");

    fireEvent.touchCancel(viewport);

    expect(viewport).not.toHaveAttribute("data-dragging");
    expect(track).toHaveStyle("--pcv-drag-offset: 0px");
  });

  it.each([
    ["LTR", "ltr", -80, 1],
    ["RTL", "rtl", 80, 1],
  ] as const)(
    "continues a qualifying %s swipe from its drag offset into the page turn",
    (label, initialReadingDirection, movement, expectedIndex) => {
      vi.useFakeTimers();
      const animationFrames: FrameRequestCallback[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn<MockFetch>().mockRejectedValue(new Error("Image unavailable."))
      );
      vi.stubGlobal(
        "requestAnimationFrame",
        // oxlint-disable-next-line promise/prefer-await-to-callbacks -- The test deliberately captures animation-frame callbacks for manual execution.
        vi.fn((callback: FrameRequestCallback) => {
          animationFrames.push(callback);
          return animationFrames.length;
        })
      );
      vi.stubGlobal("cancelAnimationFrame", vi.fn());

      try {
        const { container } = render(
          <ViewerProvider
            pages={pages}
            initialReadingDirection={initialReadingDirection}
            initialViewMode="single"
          >
            <Viewport />
            <CurrentIndexIndicator />
          </ViewerProvider>
        );
        const viewport = container.querySelector(".pcv-viewport");
        const track = container.querySelector(".pcv-viewport-track");

        if (viewport === null || track === null) {
          throw new Error(`${label} viewport rail was not rendered.`);
        }

        fireEvent.touchStart(viewport, {
          touches: [{ clientX: 200 }],
        });
        fireEvent.touchMove(viewport, {
          touches: [{ clientX: 200 + movement }],
        });
        fireEvent.touchEnd(viewport, {
          changedTouches: [{ clientX: 200 + movement }],
          touches: [],
        });

        expect(screen.getByTestId("current-index")).toHaveTextContent(
          String(expectedIndex)
        );
        expect(viewport).toHaveAttribute("data-transition-state", "waiting");
        expect(track).toHaveStyle(`--pcv-drag-offset: ${movement}px`);

        act(() => {
          vi.advanceTimersByTime(1200);
        });
        act(() => {
          animationFrames.shift()?.(0);
        });

        expect(viewport).toHaveAttribute("data-transition-state", "active");
        expect(track).toHaveStyle("--pcv-drag-offset: 0px");
      } finally {
        vi.useRealTimers();
        vi.unstubAllGlobals();
      }
    }
  );

  it("moves the page rail for a swipe started on the progress trigger", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <div className="pcv-root">
          <Viewport />
          <PageNavigation />
        </div>
      </ViewerProvider>
    );
    const progressTrigger = screen.getByRole("button", {
      name: "Show reading progress",
    });
    const track = container.querySelector(".pcv-viewport-track");

    if (track === null) {
      throw new Error("The default viewport rail was not rendered.");
    }

    fireEvent.touchStart(progressTrigger, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(progressTrigger, {
      touches: [{ clientX: 120 }],
    });

    expect(track).toHaveStyle("--pcv-drag-offset: -80px");

    fireEvent.touchCancel(progressTrigger);

    expect(track).toHaveStyle("--pcv-drag-offset: 0px");
  });

  it("does not bubble viewport touch gestures to its parent", () => {
    const onTouch = vi.fn<() => void>();
    const { container } = render(
      <div
        onTouchCancel={onTouch}
        onTouchEnd={onTouch}
        onTouchMove={onTouch}
        onTouchStart={onTouch}
      >
        <ViewerProvider pages={pages} initialViewMode="single">
          <Viewport />
        </ViewerProvider>
      </div>
    );
    const viewport = container.querySelector(".pcv-viewport");

    if (viewport === null) {
      throw new Error("The viewport was not rendered.");
    }

    fireEvent.touchStart(viewport, {
      touches: [{ clientX: 200 }],
    });
    fireEvent.touchMove(viewport, {
      touches: [{ clientX: 120 }],
    });
    fireEvent.touchEnd(viewport);

    expect(onTouch).not.toHaveBeenCalled();
  });
});
