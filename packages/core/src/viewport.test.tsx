import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePageResolveState } from "./page-source";
import { definePlugin } from "./plugin";
import { ViewerProvider, useViewerContext } from "./viewer-context";
import type { PageMetadata } from "./viewer-context";
import { Viewport } from "./viewport";
import { PageCanvas, ViewportPage, ViewportPendingPage } from "./viewport-page";
import {
  ViewportPageSet,
  ViewportPageSlot,
  ViewportTrack,
} from "./viewport-template";
import type { MockFetch, TestPage } from "./viewport-test-helpers";
import {
  MockResizeObserver,
  mockPageImages,
  pages,
  pressViewportKey,
  renderViewport,
} from "./viewport-test-helpers";

// The third page is a whole two-page spread delivered as one landscape image.
const pagesWithSpread = pages.map((page, index) =>
  index === 2 ? { ...page, layout: "spread" as const } : page
);

/** A page drawn from text alone, which carries no image to load. */
interface TextPage extends PageMetadata {
  body: string;
}

const GoToIndexButton = ({ index }: { index: number }) => {
  const { goTo } = useViewerContext();
  return (
    <button onClick={() => goTo(index)} type="button">
      Go to index
    </button>
  );
};

/** A pending page template offering a retry once its resolver rejects. */
const RetryablePendingPage = ({ index }: { index: number }) => {
  const { retry, status } = usePageResolveState(index);

  return (
    <ViewportPendingPage>
      {status === "error" && (
        <button onClick={retry} type="button">
          Try again
        </button>
      )}
    </ViewportPendingPage>
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

describe(Viewport, () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.reset();
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
    expect(currentPageSet).toHaveAttribute("data-page-side", "right");
    expect(currentPageSet).toHaveAttribute("data-reading-direction", "rtl");
    expect(currentPageSet).toHaveAttribute("data-view-mode", "double");
    expect(currentPageSet.firstElementChild).toHaveAttribute(
      "data-view-mode",
      "double"
    );
  });

  it.each([
    { expectedSide: "left", readingDirection: "rtl" },
    { expectedSide: "right", readingDirection: "ltr" },
  ] as const)(
    "faces a leading unpaired page toward the page after it in $readingDirection",
    ({ expectedSide, readingDirection }) => {
      const { container } = render(
        <ViewerProvider
          pages={pages}
          initialReadingDirection={readingDirection}
          initialViewMode="double"
          spreadStartIndex={1}
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

      expect(currentPageSet).toHaveAttribute("data-page-count", "1");
      expect(currentPageSet).toHaveAttribute("data-page-side", expectedSide);
      expect(currentPageSet.querySelector(".pcv-page")).toHaveAttribute(
        "data-page-side",
        expectedSide
      );
    }
  );

  it("gives each page of a spread the half it occupies", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="double">
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

    // The rail renders the pages left to right, so the RTL spread starts on
    // the right with its second child.
    expect(currentPageSet).not.toHaveAttribute("data-page-side");
    expect(
      [
        ...currentPageSet.querySelectorAll<HTMLDivElement>(
          ".pcv-viewport-page-slot"
        ),
      ].map((slot) => slot.dataset.pageSide)
    ).toStrictEqual(["left", "right"]);
  });

  it("gives a page no side in single-page mode", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
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

    expect(currentPageSet).not.toHaveAttribute("data-page-side");
    expect(currentPageSet.firstElementChild).not.toHaveAttribute(
      "data-page-side"
    );
  });

  it("gives a spread page the whole page set and no half of its own", () => {
    const { container } = render(
      <ViewerProvider
        pages={pagesWithSpread}
        initialIndex={2}
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

    expect(currentPageSet).toHaveAttribute("data-page-count", "1");
    expect(currentPageSet).not.toHaveAttribute("data-page-side");
    expect(
      currentPageSet.querySelector(".pcv-viewport-page-slot")
    ).toHaveAttribute("data-page-layout", "spread");
    expect(currentPageSet.querySelector(".pcv-page")).toHaveAttribute(
      "data-page-layout",
      "spread"
    );
    expect(currentPageSet.querySelector(".pcv-page")).not.toHaveAttribute(
      "data-page-side"
    );
  });

  it("reports a spread page in single-page mode as well", () => {
    const { container } = render(
      <ViewerProvider
        pages={pagesWithSpread}
        initialIndex={2}
        initialViewMode="single"
      >
        <Viewport>
          <ViewportPage />
        </Viewport>
      </ViewerProvider>
    );

    // The page carries the layout without a page-slot template of its own, so
    // a stylesheet can size it from the direct child of the page set.
    expect(container.querySelector(".pcv-page")).toHaveAttribute(
      "data-page-layout",
      "spread"
    );
  });

  it("leaves an ordinary page without a layout of its own", () => {
    const { container } = render(
      <ViewerProvider pages={pagesWithSpread} initialViewMode="double">
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

    for (const element of container.querySelectorAll(
      '.pcv-viewport-page-set[data-rail-slot="current"] [data-page-side]'
    )) {
      expect(element).not.toHaveAttribute("data-page-layout");
    }
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
    const { fetchMock, restore } = mockPageImages();

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
      restore();
    }
  });

  it("renders normal pages to canvas instead of an img element", async () => {
    const { drawImage, image, restore } = mockPageImages();

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
      restore();
    }
  });

  it("draws pages without a source through renderPage", async () => {
    const fetchMock = vi.fn<MockFetch>(() =>
      Promise.reject(new Error("should not fetch"))
    );
    vi.stubGlobal("fetch", fetchMock);
    const textPages: TextPage[] = [
      { body: "Once upon a time", id: "t1", title: "Text 1" },
      { body: "The end", id: "t2", title: "Text 2" },
    ];

    render(
      <ViewerProvider pages={textPages}>
        <Viewport renderPage={(page: TextPage) => <p>{page.body}</p>} />
      </ViewerProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Once upon a time")).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a source for pages the viewport loads itself", () => {
    // @ts-expect-error -- A text page has no image to load.
    const bareViewport = <Viewport<TextPage> />;
    const templateViewport = (
      // @ts-expect-error -- A page template draws the loaded image.
      <Viewport<TextPage>>{(page: TextPage) => page.body}</Viewport>
    );

    expect([bareViewport, templateViewport]).toHaveLength(2);
  });

  it("renders a pending placeholder until the page metadata resolves", async () => {
    const { restore } = mockPageImages();
    let resolvePageMetadata: ((page: TestPage) => void) | undefined;
    const resolvePage = () =>
      // eslint-disable-next-line promise/avoid-new -- The page metadata stays unresolved until the test resolves it.
      new Promise<TestPage>((resolve) => {
        resolvePageMetadata = resolve;
      });

    try {
      const { container } = render(
        <ViewerProvider<TestPage> pageCount={1} resolvePage={resolvePage}>
          <Viewport<TestPage> />
        </ViewerProvider>
      );

      expect(container.querySelector(".pcv-page-pending")).not.toBeNull();
      expect(container.querySelector("canvas")).toBeNull();

      await act(async () => {
        resolvePageMetadata?.(pages[0]);
        await Promise.resolve();
      });

      expect(container.querySelector(".pcv-page-pending")).toBeNull();
      expect(container.querySelector("canvas")).not.toBeNull();
    } finally {
      restore();
    }
  });

  it("renders the pending page template given to the viewport", () => {
    const { restore } = mockPageImages();
    // eslint-disable-next-line promise/avoid-new -- The page metadata never resolves in this test.
    const pendingMetadata = new Promise<TestPage>(() => {
      // The viewer keeps waiting for the page metadata.
    });

    try {
      render(
        <ViewerProvider<TestPage>
          pageCount={2}
          resolvePage={() => pendingMetadata}
        >
          <Viewport<TestPage>
            renderPendingPage={(index) => (
              <div data-testid={`pending-${index}`}>
                Loading page {index + 1}
              </div>
            )}
          />
        </ViewerProvider>
      );

      expect(screen.getByTestId("pending-0")).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it("marks a pending page as failed once its resolver rejects", async () => {
    const { restore } = mockPageImages();

    try {
      const { container } = render(
        <ViewerProvider<TestPage>
          pageCount={1}
          resolvePage={() => Promise.reject(new Error("Offline"))}
        >
          <Viewport<TestPage>>
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
      const pendingPage = container.querySelector(
        "[data-rail-slot='current'] .pcv-page-pending"
      );

      expect(pendingPage).toHaveAttribute("aria-busy", "true");

      await waitFor(() => {
        expect(pendingPage).toHaveAttribute("data-page-status", "error");
      });

      expect(pendingPage).not.toHaveAttribute("aria-busy");
      expect(
        container.querySelector(
          "[data-rail-slot='current'] .pcv-viewport-page-slot"
        )
      ).toHaveAttribute("data-page-status", "error");
    } finally {
      restore();
    }
  });

  it("retries a failed page from the pending page template", async () => {
    const { restore } = mockPageImages();
    const resolvePage = vi
      .fn<() => Promise<TestPage>>()
      .mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValue(pages[0]);

    try {
      const { container } = render(
        <ViewerProvider<TestPage> pageCount={1} resolvePage={resolvePage}>
          <Viewport<TestPage>
            renderPendingPage={(index) => (
              <RetryablePendingPage index={index} />
            )}
          />
        </ViewerProvider>
      );

      fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

      await waitFor(() => {
        expect(container.querySelector("canvas")).not.toBeNull();
      });

      expect(resolvePage).toHaveBeenCalledTimes(2);
      expect(container.querySelector(".pcv-page-pending")).toBeNull();
    } finally {
      restore();
    }
  });

  it("clears a decoded canvas while a replacement page loads", async () => {
    const clearRect = vi.fn<() => void>();
    const drawImage = vi.fn<() => void>();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({
        clearRect,
        drawImage,
      } as unknown as CanvasRenderingContext2D);
    let resolveReplacement:
      | ((response: {
          arrayBuffer: () => Promise<ArrayBuffer>;
          ok: boolean;
        }) => void)
      | undefined;
    const fetchMock = vi.fn<MockFetch>((input) => {
      if (input === "replacement.png") {
        // eslint-disable-next-line promise/avoid-new -- A pending fetch keeps the replacement page undecoded.
        return new Promise((resolve) => {
          resolveReplacement = resolve;
        });
      }

      return Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
        ok: true,
      });
    });
    const image = {
      close: vi.fn<() => void>(),
      height: 1,
      width: 1,
    } as unknown as ImageBitmap;
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn<() => Promise<ImageBitmap>>().mockResolvedValue(image)
    );
    vi.stubGlobal("fetch", fetchMock);

    try {
      const { rerender } = render(
        <ViewerProvider
          pages={[{ id: "page", src: "original.png", title: "Original page" }]}
        >
          <Viewport />
        </ViewerProvider>
      );

      await waitFor(() => {
        expect(drawImage).toHaveBeenCalledWith(image, 0, 0, 1, 1);
      });
      clearRect.mockClear();

      rerender(
        <ViewerProvider
          pages={[
            {
              id: "page",
              src: "replacement.png",
              title: "Replacement page",
            },
          ]}
        >
          <Viewport />
        </ViewerProvider>
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Replacement page")).toHaveAttribute(
          "aria-busy",
          "true"
        );
        expect(clearRect).toHaveBeenCalledWith(0, 0, 1, 1);
      });

      if (resolveReplacement === undefined) {
        throw new Error("The replacement page did not start loading.");
      }
      resolveReplacement({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1)),
        ok: true,
      });

      await waitFor(() => {
        expect(screen.getByLabelText("Replacement page")).not.toHaveAttribute(
          "aria-busy"
        );
      });
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
    const context = {
      clearRect: vi.fn<() => void>(),
      drawImage,
    } as unknown as CanvasRenderingContext2D;
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
    const { fetchMock, restore } = mockPageImages();

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
      restore();
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
      .mockReturnValue({
        clearRect: vi.fn<() => void>(),
        drawImage,
      } as unknown as CanvasRenderingContext2D);
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

      pressViewportKey("ArrowRight");

      await waitFor(() => {
        expect(screen.getByLabelText("Page 2")).not.toHaveAttribute(
          "aria-busy"
        );
      });

      pressViewportKey("ArrowLeft");

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

  it("runs onPageChange plugins for the initial and navigated pages", async () => {
    const onPageChange = vi.fn<(index: number, total: number) => void>();
    renderViewport({ plugins: [definePlugin({ onPageChange })] });

    await waitFor(() => {
      expect(onPageChange).toHaveBeenLastCalledWith(0, 4);
    });

    pressViewportKey("ArrowLeft");

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

  it("is a focusable region named for assistive technology", () => {
    renderViewport();

    const viewport = screen.getByRole("region", { name: "Comic pages" });

    expect(viewport).toHaveClass("pcv-viewport");
    expect(viewport).toHaveAttribute("tabindex", "0");
  });

  it("takes an accessible name of its own", () => {
    render(
      <ViewerProvider pages={pages}>
        <Viewport<TestPage>
          aria-label="漫画のページ"
          renderPage={(page) => <div>{page.title}</div>}
        />
      </ViewerProvider>
    );

    expect(screen.getByRole("region", { name: "漫画のページ" })).toHaveClass(
      "pcv-viewport"
    );
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
});
