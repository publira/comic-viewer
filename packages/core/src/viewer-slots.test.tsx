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

/** The content of the start pages, in the order they are written. */
const startPageLabels = ["Cover notice", "Publisher card", "Chapter title"];
/** The content of the end pages, in the order they are written. */
const endPageLabels = ["Next chapter", "Afterword", "Recommendations"];

interface RenderSlotViewerOptions {
  documentPages?: readonly TestPage[];
  endPageCount?: number;
  initialIndex?: number;
  initialReadingDirection?: "rtl" | "ltr";
  initialViewMode?: "single" | "double";
  spreadStartIndex?: number;
  startPageCount?: number;
}

const renderSlotViewer = ({
  documentPages = pages,
  endPageCount = 1,
  initialIndex,
  initialReadingDirection = "rtl",
  initialViewMode = "single",
  spreadStartIndex = 0,
  startPageCount = 1,
}: RenderSlotViewerOptions = {}) =>
  render(
    <ViewerProvider
      pages={documentPages}
      initialIndex={initialIndex}
      initialReadingDirection={initialReadingDirection}
      initialViewMode={initialViewMode}
      spreadStartIndex={spreadStartIndex}
    >
      {startPageLabels.slice(0, startPageCount).map((label) => (
        <StartPage key={label}>{label}</StartPage>
      ))}
      <Viewport<TestPage> renderPage={renderPage} />
      {endPageLabels.slice(0, endPageCount).map((label) => (
        <EndPage key={label}>{label}</EndPage>
      ))}
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
      startPageCount: 0,
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

  it("steps back onto the first page from an index the spreads skip", () => {
    // The reader sits between two spreads, so stepping back has to reach the
    // page the spreads are counted from rather than the start page below it.
    renderSlotViewer({ initialIndex: 1, initialViewMode: "double" });

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
  });

  it("throws when a slot page is rendered outside the viewer", () => {
    expect(() => {
      render(<StartPage>Cover notice</StartPage>);
    }).toThrow("StartPage must be written among the children of the viewer");
  });

  it("opens on the first of several start pages", () => {
    renderSlotViewer({ startPageCount: 3 });

    expect(screen.getByTestId("current-index")).toHaveTextContent("-3");
    expect(screen.getByText("Cover notice")).toBeInTheDocument();
  });

  it("turns through the start pages one at a time and on into the document", () => {
    renderSlotViewer({ startPageCount: 3 });

    // The start pages take the indexes below the page list in the order they
    // are written, so the reading order runs -3, -2, -1, and then page 1.
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("Publisher card")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("Chapter title")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("current-index")).toHaveTextContent("0");
    expect(screen.getByTestId("p1")).toBeInTheDocument();
  });

  it("turns through the end pages after the last page of the document", () => {
    renderSlotViewer({ endPageCount: 3, initialIndex: 3 });

    // The end pages take the indexes above the page list in the order they are
    // written, so the reading order runs 4, 5, and then 6.
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("Next chapter")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("Afterword")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("current-index")).toHaveTextContent("6");
    expect(screen.getByText("Recommendations")).toBeInTheDocument();

    // The last end page is the last one the reader can reach.
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("current-index")).toHaveTextContent("6");
  });

  it("numbers an extra page within its slot in the page status", () => {
    renderSlotViewer({ endPageCount: 2, startPageCount: 3 });

    expect(screen.getByRole("status")).toHaveTextContent("Start page 1 of 3");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("Start page 2 of 3");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("status")).toHaveTextContent("Start page 1 of 3");
  });

  it("reports the position within the slot to a page status format function", () => {
    render(
      <ViewerProvider pages={pages} initialViewMode="single">
        <StartPage>Cover notice</StartPage>
        <StartPage>Publisher card</StartPage>
        <PageStatus
          format={({ firstSlotPage, slot, slotPageCount }) =>
            `${slot}: ${firstSlotPage}/${slotPageCount}`
          }
        />
      </ViewerProvider>
    );

    expect(screen.getByRole("status")).toHaveTextContent("start: 1/2");
  });

  it("hands each extra page its position within the slot", () => {
    const { container } = renderSlotViewer({ startPageCount: 3 });
    const startPage = container.querySelector(
      '.pcv-page-slot[data-page-slot="start"]'
    );

    expect(startPage).toHaveAttribute("data-slot-page", "1");
    expect(startPage).toHaveAttribute("data-slot-page-count", "3");
  });

  it("shows the start pages one at a time in double-page mode", () => {
    const { container } = renderSlotViewer({
      initialViewMode: "double",
      startPageCount: 2,
    });

    // Every index before spreadStartIndex is shown alone, so the start pages
    // are turned through one by one before the first spread of the document.
    expect(getCurrentPageSet(container)).toHaveAttribute(
      "data-page-count",
      "1"
    );
    expect(screen.getByText("Cover notice")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(getCurrentPageSet(container)).toHaveAttribute(
      "data-page-count",
      "1"
    );
    expect(screen.getByText("Publisher card")).toBeInTheDocument();
  });

  it("pairs the start pages with each other from a negative spread start", () => {
    const { container } = renderSlotViewer({
      initialViewMode: "double",
      spreadStartIndex: -2,
      startPageCount: 2,
    });

    expect(getCurrentPageSet(container)).toHaveAttribute(
      "data-page-count",
      "2"
    );
    expect(screen.getByText("Cover notice")).toBeInTheDocument();
    expect(screen.getByText("Publisher card")).toBeInTheDocument();

    // The spread that follows holds the first two pages of the document.
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("p1")).toBeInTheDocument();
    expect(screen.getByTestId("p2")).toBeInTheDocument();
  });

  it("reports a spread of two start pages as the range it covers", () => {
    renderSlotViewer({
      initialViewMode: "double",
      spreadStartIndex: -2,
      startPageCount: 3,
    });

    // The first start page comes before the spread start, so it arrives on its
    // own, and the two that follow face each other.
    expect(screen.getByRole("status")).toHaveTextContent("Start page 1 of 3");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Start pages 2-3 of 3"
    );
  });

  it("pairs the end pages by the parity of the pages before them", () => {
    const { container } = renderSlotViewer({
      documentPages: pages.slice(0, 3),
      endPageCount: 2,
      initialIndex: 2,
      initialViewMode: "double",
      startPageCount: 0,
    });

    // The odd page count leaves the last page facing the first end page, and
    // the second end page opens the spread that follows it.
    expect(getCurrentPageSet(container)).toHaveAttribute(
      "data-page-count",
      "2"
    );
    expect(screen.getByTestId("p3")).toBeInTheDocument();
    expect(screen.getByText("Next chapter")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("Afterword")).toBeInTheDocument();
    expect(getCurrentPageSet(container)).toHaveAttribute(
      "data-page-count",
      "1"
    );
  });

  it.each([
    { initialReadingDirection: "rtl", side: "right" },
    { initialReadingDirection: "ltr", side: "left" },
  ] as const)(
    "opens the spread of start pages on the $side half when reading $initialReadingDirection",
    ({ initialReadingDirection, side }) => {
      renderSlotViewer({
        initialReadingDirection,
        initialViewMode: "double",
        spreadStartIndex: -2,
        startPageCount: 2,
      });

      expect(screen.getByText("Cover notice")).toHaveAttribute(
        "data-page-side",
        side
      );
      expect(screen.getByText("Publisher card")).toHaveAttribute(
        "data-page-side",
        side === "right" ? "left" : "right"
      );
    }
  );

  it.each(["rtl", "ltr"] as const)(
    "turns forward through the end pages when reading %s",
    (initialReadingDirection) => {
      renderSlotViewer({
        endPageCount: 2,
        initialIndex: 3,
        initialReadingDirection,
        startPageCount: 0,
      });
      const forwardKey =
        initialReadingDirection === "rtl" ? "ArrowLeft" : "ArrowRight";

      fireEvent.keyDown(window, { key: forwardKey });
      expect(screen.getByText("Next chapter")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: forwardKey });
      expect(screen.getByText("Afterword")).toBeInTheDocument();
    }
  );

  it("takes every slot page written among the children of the viewer", () => {
    render(
      <ComicViewer pages={pages} initialViewMode="single">
        <StartPage>Cover notice</StartPage>
        <StartPage>Publisher card</StartPage>
        <Viewport<TestPage> renderPage={renderPage} />
        <EndPage>Next chapter</EndPage>
        <EndPage>Afterword</EndPage>
        <PageStatus />
        <CurrentIndexIndicator />
      </ComicViewer>
    );

    expect(screen.getByTestId("current-index")).toHaveTextContent("-2");
    expect(screen.getByRole("status")).toHaveTextContent("Start page 1 of 2");
  });
});
