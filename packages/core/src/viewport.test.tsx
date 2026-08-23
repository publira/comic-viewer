import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { definePlugin } from "./plugin";
import type { ViewerPlugin } from "./plugin";
import type { ReadingDirection } from "./viewer-context";
import { ViewerProvider, useViewerContext } from "./viewer-context";
import {
  getImageMimeType,
  PageCanvas,
  Viewport,
  ViewportPage,
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

  it("prefetches the next two pages", async () => {
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
          expect.arrayContaining(["page1.png", "page2.png", "page3.png"])
        );
      });
    } finally {
      getContext.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("does not redraw a released bitmap after navigating back", async () => {
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
        expect(createImageBitmapMock).toHaveBeenCalledOnce();
      });

      fireEvent.keyDown(window, { key: "ArrowRight" });

      await waitFor(() => {
        expect(createImageBitmapMock).toHaveBeenCalledTimes(2);
        expect(bitmaps[0]?.closed).toBeTruthy();
      });

      fireEvent.keyDown(window, { key: "ArrowLeft" });

      await waitFor(() => {
        expect(createImageBitmapMock).toHaveBeenCalledTimes(3);
        expect(drawImage).toHaveBeenLastCalledWith(bitmaps[2], 0, 0, 1, 1);
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
});
