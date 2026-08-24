import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  NextPageButton,
  PageProgress,
  PageProgressTrack,
  PageNavigation,
  PageStatus,
  PreviousPageButton,
} from "./page-navigation";
import { useViewerContext, ViewerProvider } from "./viewer-context";
import type { ReadingDirection, ViewMode } from "./viewer-context";

const pages = [
  { id: "p1", src: "page1.png", title: "Page 1" },
  { id: "p2", src: "page2.png", title: "Page 2" },
  { id: "p3", src: "page3.png", title: "Page 3" },
  { id: "p4", src: "page4.png", title: "Page 4" },
  { id: "p5", src: "page5.png", title: "Page 5" },
];

/** Stands in for the viewport tap that reveals the shared reader controls. */
const ControlsToggle = () => {
  const { toggleControls } = useViewerContext();

  return (
    <button onClick={toggleControls} type="button">
      Toggle controls
    </button>
  );
};

const toggleControls = (): void => {
  fireEvent.click(screen.getByRole("button", { name: "Toggle controls" }));
};

/** Hidden controls carry no accessible name, so the class is the only handle. */
const getNavigation = (container: HTMLElement): HTMLElement => {
  const navigation = container.querySelector<HTMLElement>(
    ".pcv-page-navigation"
  );

  if (navigation === null) {
    throw new Error("The page navigation was not rendered.");
  }

  return navigation;
};

interface RenderPageNavigationOptions {
  initialIndex?: number;
  initialReadingDirection?: ReadingDirection;
  initialViewMode?: ViewMode;
  spreadStartIndex?: number;
}

const renderPageNavigation = ({
  initialIndex = 0,
  initialReadingDirection = "rtl",
  initialViewMode = "single",
  spreadStartIndex = 0,
}: RenderPageNavigationOptions = {}) => {
  const result = render(
    <ViewerProvider
      pages={pages}
      initialIndex={initialIndex}
      initialReadingDirection={initialReadingDirection}
      initialViewMode={initialViewMode}
      spreadStartIndex={spreadStartIndex}
    >
      <ControlsToggle />
      <PageNavigation>
        <PreviousPageButton />
        <PageStatus />
        <NextPageButton />
      </PageNavigation>
    </ViewerProvider>
  );
  toggleControls();

  return result;
};

describe(PageNavigation, () => {
  it("renders an accessible default navigation group", () => {
    renderPageNavigation();

    expect(
      screen.getByRole("navigation", { name: "Page navigation" })
    ).toHaveAttribute("dir", "rtl");
    expect(
      screen.getByRole("button", { name: "Previous page" })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    expect(screen.getByText("Page 1 of 5")).toHaveAttribute(
      "aria-live",
      "polite"
    );
  });

  it("stays hidden until the shared reader controls are revealed", () => {
    const { container } = render(
      <ViewerProvider pages={pages}>
        <ControlsToggle />
        <PageNavigation />
      </ViewerProvider>
    );

    const navigation = getNavigation(container);

    expect(navigation).toHaveAttribute("aria-hidden", "true");
    expect(navigation).toHaveAttribute("inert");

    toggleControls();

    expect(navigation).toHaveAttribute("aria-hidden", "false");
    expect(navigation).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("renders only the page-turn controls by default", () => {
    render(
      <ViewerProvider pages={pages}>
        <ControlsToggle />
        <PageNavigation />
      </ViewerProvider>
    );
    toggleControls();

    expect(screen.getByRole("button", { name: "Previous page" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Next page" })).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("derives public progress-track values from the viewer state", () => {
    render(
      <ViewerProvider pages={pages} initialIndex={1} initialViewMode="double">
        <PageProgress>
          <PageProgressTrack data-testid="progress-track" />
        </PageProgress>
      </ViewerProvider>
    );

    expect(screen.getByTestId("progress-track")).toHaveAttribute("max", "5");
    expect(screen.getByTestId("progress-track")).toHaveAttribute("value", "3");
  });

  it("hides the progress only when a consumer asks for it", () => {
    render(
      <ViewerProvider pages={pages}>
        <PageProgress visible={false}>
          <PageProgressTrack />
        </PageProgress>
      </ViewerProvider>
    );

    expect(
      screen.getByRole("progressbar", { hidden: true }).parentElement
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("moves by one page and updates its status in single-page mode", () => {
    renderPageNavigation({ initialReadingDirection: "ltr" });

    const previous = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });

    fireEvent.click(next);

    expect(previous).toBeEnabled();
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();

    fireEvent.click(previous);

    expect(previous).toBeDisabled();
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });

  it("moves by spreads and disables the next control at the final spread", () => {
    renderPageNavigation({ initialIndex: 2, initialViewMode: "double" });

    const next = screen.getByRole("button", { name: "Next page" });

    expect(screen.getByText("Pages 3-4 of 5")).toBeInTheDocument();
    expect(next).toBeEnabled();

    fireEvent.click(next);

    expect(screen.getByText("Page 5 of 5")).toBeInTheDocument();
    expect(next).toBeDisabled();
  });

  it("navigates a single cover page before odd-indexed spreads", () => {
    renderPageNavigation({ initialViewMode: "double", spreadStartIndex: 1 });

    const previous = screen.getByRole("button", { name: "Previous page" });
    const next = screen.getByRole("button", { name: "Next page" });

    fireEvent.click(next);

    expect(screen.getByText("Pages 2-3 of 5")).toBeInTheDocument();
    expect(previous).toBeEnabled();

    fireEvent.click(next);

    expect(screen.getByText("Pages 4-5 of 5")).toBeInTheDocument();
    expect(next).toBeDisabled();

    fireEvent.click(previous);

    expect(screen.getByText("Pages 2-3 of 5")).toBeInTheDocument();
  });

  it("keeps pre-spread pages single for an even start index", () => {
    renderPageNavigation({
      initialIndex: 1,
      initialViewMode: "double",
      spreadStartIndex: 2,
    });

    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Pages 3-4 of 5")).toBeInTheDocument();
  });

  it("permits custom arrangement and styling with the individual controls", () => {
    render(
      <ViewerProvider pages={pages} initialReadingDirection="ltr">
        <ControlsToggle />
        <PageNavigation className="reader-controls">
          <NextPageButton className="next-control">Forward</NextPageButton>
          <PageStatus className="status-control" />
          <PreviousPageButton className="previous-control">
            Back
          </PreviousPageButton>
        </PageNavigation>
      </ViewerProvider>
    );
    toggleControls();

    const navigation = screen.getByRole("navigation", {
      name: "Page navigation",
    });

    expect(navigation).toHaveClass("reader-controls");
    expect(navigation).toHaveAttribute("data-reading-direction", "ltr");
    expect(screen.getByRole("button", { name: "Next page" })).toHaveClass(
      "next-control"
    );
    expect(screen.getByText("Page 1 of 5")).toHaveClass("status-control");
    expect(screen.getByRole("button", { name: "Previous page" })).toHaveClass(
      "previous-control"
    );
  });

  it("does not navigate when a consumer cancels the click event", () => {
    render(
      <ViewerProvider pages={pages}>
        <NextPageButton onClick={(event) => event.preventDefault()} />
        <PageStatus />
      </ViewerProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
  });
});
