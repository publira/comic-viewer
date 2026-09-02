import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComicViewer } from "./comic-viewer";
import { PageStatus, PageProgressTrack } from "./page-navigation";
import { ViewerProvider } from "./viewer-context";
import { EndPage, StartPage } from "./viewer-slots";
import { Viewport } from "./viewport";
import type { TestPage } from "./viewport-test-helpers";
import {
  CurrentIndexIndicator,
  MockResizeObserver,
  pages,
  setViewportRect,
} from "./viewport-test-helpers";

const renderPage = (page: TestPage) => (
  <div data-testid={page.id}>{page.title}</div>
);

interface RenderSlotViewerOptions {
  documentPages?: readonly TestPage[];
  endPage?: boolean;
  initialIndex?: number;
  initialViewMode?: "single" | "double";
  startPage?: boolean;
}

const renderSlotViewer = ({
  documentPages = pages,
  endPage = true,
  initialIndex,
  initialViewMode = "single",
  startPage = true,
}: RenderSlotViewerOptions = {}) =>
  render(
    <ViewerProvider
      pages={documentPages}
      initialIndex={initialIndex}
      initialViewMode={initialViewMode}
    >
      {startPage ? <StartPage>Cover notice</StartPage> : null}
      <Viewport<TestPage> renderPage={renderPage} />
      {endPage ? <EndPage>Next chapter</EndPage> : null}
      <PageStatus />
      <CurrentIndexIndicator />
    </ViewerProvider>
  );

const getCurrentPageSet = (container: HTMLElement) => {
  const pageSet = container.querySelector<HTMLDivElement>(
    '.pcv-viewport-page-set[data-rail-slot="current"]'
  );

  if (pageSet === null) {
    throw new Error("The current page set was not rendered.");
  }

  return pageSet;
};

describe("viewer slot pages", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    MockResizeObserver.callback = null;
  });

  it("opens on the start page", () => {
    renderSlotViewer();

    expect(screen.getByTestId("current-index")).toHaveTextContent("-1");
    expect(screen.getByText("Cover notice")).toBeInTheDocument();
    expect(screen.queryByTestId("p1")).not.toBeInTheDocument();
  });

  it("turns from the start page onto the first page", () => {
    renderSlotViewer();

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.queryByText("Cover notice")).not.toBeInTheDocument();
  });

  it("opens on the page an explicit initialIndex names", () => {
    renderSlotViewer({ initialIndex: 0 });

    expect(screen.getByTestId("current-index")).toHaveTextContent("0");

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByTestId("current-index")).toHaveTextContent("-1");
    expect(screen.getByText("Cover notice")).toBeInTheDocument();
  });

  it("turns from the last page onto the end page", () => {
    renderSlotViewer({ initialIndex: 3 });

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(screen.getByTestId("current-index")).toHaveTextContent("4");
    expect(screen.getByText("Next chapter")).toBeInTheDocument();

    // The end page is the last one the reader can reach.
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("current-index")).toHaveTextContent("4");
  });

  it("stops at the start page and at the end page", () => {
    renderSlotViewer();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("current-index")).toHaveTextContent("-1");
  });

  it("keeps a slot page out of the page count and the page numbering", () => {
    renderSlotViewer();

    expect(screen.getByRole("status")).toHaveTextContent("Start page");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("Page 1 of 4");
  });

  it("announces the end page without a page number", () => {
    renderSlotViewer({ initialIndex: 4 });

    expect(screen.getByRole("status")).toHaveTextContent("End page");
  });

  it("reports the slot to a page status format function", () => {
    render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <StartPage>Cover notice</StartPage>
        <PageStatus
          format={({ pageCount, slot }) =>
            slot === undefined ? `${pageCount} pages` : `slot: ${slot}`
          }
        />
      </ViewerProvider>
    );

    expect(screen.getByRole("status")).toHaveTextContent("slot: start");
  });

  it("leaves the reading progress empty on the start page", () => {
    render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <StartPage>Cover notice</StartPage>
        <PageProgressTrack aria-label="Reading progress" />
      </ViewerProvider>
    );

    expect(screen.getByRole("progressbar")).toHaveValue(0);
  });

  it("pairs the end page with the page it faces in double-page mode", () => {
    const { container } = renderSlotViewer({
      documentPages: pages.slice(0, 3),
      initialIndex: 2,
      initialViewMode: "double",
      startPage: false,
    });
    const currentPageSet = getCurrentPageSet(container);

    expect(currentPageSet).toHaveAttribute("data-page-count", "2");
    expect(screen.getByTestId("p3")).toBeInTheDocument();
    expect(screen.getByText("Next chapter")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Page 3 of 3");
  });

  it("shows a slot page on its own when no page faces it", () => {
    const { container } = renderSlotViewer({
      initialIndex: 4,
      initialViewMode: "double",
    });
    const currentPageSet = getCurrentPageSet(container);

    expect(currentPageSet).toHaveAttribute("data-page-count", "1");
    expect(currentPageSet).toHaveAttribute("data-page-side", "right");
    expect(
      container.querySelector('.pcv-page-slot[data-page-slot="end"]')
    ).toHaveAttribute("data-page-side", "right");
  });

  it("pairs the start page with the first page from a negative spread start", () => {
    const { container } = render(
      <ViewerProvider
        pages={pages}
        initialViewMode="double"
        spreadStartIndex={-1}
      >
        <StartPage>Cover notice</StartPage>
        <Viewport<TestPage> renderPage={renderPage} />
      </ViewerProvider>
    );

    expect(getCurrentPageSet(container)).toHaveAttribute(
      "data-page-count",
      "2"
    );
    expect(screen.getByText("Cover notice")).toBeInTheDocument();
    expect(screen.getByTestId("p1")).toBeInTheDocument();
  });

  it("takes the slot pages written among the children of the viewer", () => {
    render(
      <ComicViewer pages={pages} initialViewMode="single">
        <StartPage className="notice">Cover notice</StartPage>
        <Viewport<TestPage> renderPage={renderPage} />
        <EndPage>Next chapter</EndPage>
        <CurrentIndexIndicator />
      </ComicViewer>
    );

    expect(screen.getByTestId("current-index")).toHaveTextContent("-1");
    expect(screen.getByText("Cover notice")).toHaveClass(
      "pcv-page",
      "pcv-page-slot",
      "notice"
    );
  });

  it("lets a control on a slot page take its own click", () => {
    const onClick = vi.fn<() => void>();
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <StartPage>
          <button data-testid="read-on" onClick={onClick} type="button">
            Read on
          </button>
        </StartPage>
        <Viewport<TestPage> renderPage={renderPage} />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector(".pcv-viewport");

    if (viewport === null) {
      throw new Error("The viewport was not rendered.");
    }

    setViewportRect(viewport);
    // The button sits in the edge of the viewport that turns the page.
    fireEvent.click(screen.getByTestId("read-on"), { clientX: 5 });

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByTestId("current-index")).toHaveTextContent("-1");
  });

  it("leaves a swipe that starts on a control on the slot page alone", () => {
    const { container } = render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <StartPage>
          <a data-testid="next-chapter" href="https://example.com/next">
            Next chapter
          </a>
        </StartPage>
        <Viewport<TestPage> renderPage={renderPage} />
        <CurrentIndexIndicator />
      </ViewerProvider>
    );
    const viewport = container.querySelector(".pcv-viewport");
    const link = screen.getByTestId("next-chapter");

    if (viewport === null) {
      throw new Error("The viewport was not rendered.");
    }

    fireEvent.touchStart(link, { touches: [{ clientX: 200 }] });
    fireEvent.touchMove(viewport, { touches: [{ clientX: 20 }] });
    fireEvent.touchEnd(viewport);

    expect(screen.getByTestId("current-index")).toHaveTextContent("-1");
    expect(viewport).not.toHaveAttribute("data-dragging");
  });

  it("throws when a slot page is rendered outside the viewer", () => {
    expect(() => {
      render(<StartPage>Cover notice</StartPage>);
    }).toThrow("StartPage must be given to the viewer as its start page");
  });
});
